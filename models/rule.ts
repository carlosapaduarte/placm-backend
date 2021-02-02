import { success, error } from "../util/responses";
import { execute_query } from "../database/database";

/* In this file, all these functions return data related to the classes of:
 * rule
 * type of element
 */

/* Get assertions' metrics in "simple" way, used in default and 'Drilldown' navigations
 * rule class */
const get_data_rule = async (serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  let query = 
  `SELECT r.Name as name,
    r.RuleId as id,
    COUNT(DISTINCT p.PageId) as nPages,
    COUNT(DISTINCT a.AssertionId) as nAssertions,
    COUNT(IF(a.Outcome = 'passed', 1, NULL)) as nPassed,
    COUNT(IF(a.Outcome = 'failed', 1, NULL)) as nFailed,
    COUNT(IF(a.Outcome = 'cantTell', 1, NULL)) as nCantTell,
    COUNT(IF(a.Outcome = 'inapplicable', 1, NULL)) as nInapplicable,
    COUNT(IF(a.Outcome = 'untested', 1, NULL)) as nUntested`;

  if(filters.continentIds && filters.continentIds !== '0'){
    filtered = filters.continentIds.split(',').filter(function(v: string, i: any, arr: any){return v !== '0';});
    params.push(filtered);
    query = query + `,
    (SELECT JSON_ARRAYAGG(cont.Name) FROM Continent cont WHERE cont.ContinentId IN (?)) as continentNames`;
  }

  if(filters.countryIds && filters.countryIds !== '0'){
    filtered = filters.countryIds.split(',').filter(function(v: string, i: any, arr: any){return v !== '0';});
    params.push(filtered);
    query = query + `,
    (SELECT JSON_ARRAYAGG(c.Name) FROM Country c WHERE c.CountryId IN (?)) as countryNames`;
  }

  if(filters.tagIds && filters.tagIds !== '0'){
    filtered = filters.tagIds.split(',').filter(function(v: string, i: any, arr: any){return v !== '0';});
    params.push(filtered);
    query = query + `,
    (SELECT JSON_ARRAYAGG(t.Name) FROM Tag t WHERE t.TagId IN (?)) as tagNames`;
  }

  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(org.Name) FROM Organization org WHERE org.OrganizationId IN (?)) as orgNames`;
  }

  if(filters.appIds){
    params.push(filters.appIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(app.Name) FROM Application app WHERE app.ApplicationId IN (?)) as appNames`;
  }
  
  if(filters.evalIds){
    params.push(filters.evalIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(eval.Name) FROM EvaluationTool eval WHERE a.EvaluationToolId IN (?) AND eval.EvaluationToolId = a.EvaluationToolId) as evalNames`;
  }

  if(filters.typeIds){
    params.push(filters.typeIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(et.Name) FROM ElementType et WHERE et.TypeId IN (?)) as typeNames`;
  }

  if(filters.scIds){
    params.push(filters.scIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(sc.Name) FROM SuccessCriteria sc WHERE sc.SCId IN (?)) as scNames`;
  }
    
  query = query + `
  FROM
    Application app
  INNER JOIN
    Rule r`;

  if(filters.typeIds){
    query = query + `
    INNER JOIN
      RuleElementType ret
        ON ret.RuleId = r.RuleId`;
  }
  
  if(filters.scIds){
    query += `
    INNER JOIN
      RuleSuccessCriteria src
        ON src.RuleId = r.RuleId`;
  }

  if(filters.tagIds){
    query = query + `
    LEFT JOIN
      TagApplication ta
        ON ta.ApplicationId = app.ApplicationId`;
  }

  if(filters.continentIds){
    query = query + `
    LEFT JOIN
      Country c
        ON c.CountryId = app.CountryId`;
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId
      AND a.RuleId = r.RuleId
  WHERE app.deleted = 0`;

  if(filters.continentIds){
    splitted = filters.continentIds.split(',');
    if(filters.continentIds === '0'){
      query = query + `
      AND c.ContinentId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (c.ContinentId is null OR c.ContinentId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND c.ContinentId IN (?)`;
    }
  }

  if(filters.countryIds){
    splitted = filters.countryIds.split(',');
    if(filters.countryIds === '0'){
      query = query + `
      AND app.CountryId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (app.CountryId is null OR app.CountryId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND app.CountryId IN (?)`;
    }
  }

  if(filters.tagIds){
    splitted = filters.tagIds.split(',');
    if(filters.tagIds === '0'){
      query = query + `
      AND ta.TagId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (ta.TagId is null OR ta.TagId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND ta.TagId IN (?)`;
    }
  }

  if(filters.appIds){
    params.push(filters.appIds.split(','));
    query = query + `
    AND app.ApplicationId IN (?)`;
  }

  if(filters.sectorIds){
    params.push(filters.sectorIds.split(','));
    query = query + `
    AND app.Sector IN (?)`;
  }

  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `
    AND app.OrganizationId IN (?)`;
  }

  if(filters.evalIds){
    params.push(filters.evalIds.split(','));
    query = query + `
    AND a.EvaluationToolId IN (?)`;
  }
  
  if(filters.scIds){
    query += `
    AND src.SCId IN (?)`;
    params.push(filters.scIds);
  }

  if(filters.typeIds){
    params.push(filters.typeIds.split(','));
    query = query + `
    AND ret.TypeId IN (?)`;
  }

  query = query + `
  GROUP BY 1, 2;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get assertions' metrics in "simple" way, used in default and 'Drilldown' navigations
 * type of element class */
const get_data_element_type = async (serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  let query = 
  `SELECT et.Name as name,
    et.TypeId as id,
    COUNT(DISTINCT p.PageId) as nPages,
    COUNT(DISTINCT a.AssertionId) as nAssertions,
    COUNT(IF(a.Outcome = 'passed', 1, NULL)) as nPassed,
    COUNT(IF(a.Outcome = 'failed', 1, NULL)) as nFailed,
    COUNT(IF(a.Outcome = 'cantTell', 1, NULL)) as nCantTell,
    COUNT(IF(a.Outcome = 'inapplicable', 1, NULL)) as nInapplicable,
    COUNT(IF(a.Outcome = 'untested', 1, NULL)) as nUntested`;

  if(filters.continentIds && filters.continentIds !== '0'){
    filtered = filters.continentIds.split(',').filter(function(v: string, i: any, arr: any){return v !== '0';});
    params.push(filtered);
    query = query + `,
    (SELECT JSON_ARRAYAGG(cont.Name) FROM Continent cont WHERE cont.ContinentId IN (?)) as continentNames`;
  }

  if(filters.countryIds && filters.countryIds !== '0'){
    filtered = filters.countryIds.split(',').filter(function(v: string, i: any, arr: any){return v !== '0';});
    params.push(filtered);
    query = query + `,
    (SELECT JSON_ARRAYAGG(c.Name) FROM Country c WHERE c.CountryId IN (?)) as countryNames`;
  }

  if(filters.tagIds && filters.tagIds !== '0'){
    filtered = filters.tagIds.split(',').filter(function(v: string, i: any, arr: any){return v !== '0';});
    params.push(filtered);
    query = query + `,
    (SELECT JSON_ARRAYAGG(t.Name) FROM Tag t WHERE t.TagId IN (?)) as tagNames`;
  }

  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(org.Name) FROM Organization org WHERE org.OrganizationId IN (?)) as orgNames`;
  }
  if(filters.appIds){
    params.push(filters.appIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(app.Name) FROM Application app WHERE app.ApplicationId IN (?)) as appNames`;
  }
  if(filters.evalIds){
    params.push(filters.evalIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(eval.Name) FROM EvaluationTool eval WHERE a.EvaluationToolId IN (?) AND eval.EvaluationToolId = a.EvaluationToolId) as evalNames`;
  }
    if(filters.scIds){
    params.push(filters.scIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(sc.Name) FROM SuccessCriteria sc WHERE sc.SCId IN (?)) as scNames`;
  }
    
  query = query + `
  FROM
    Application app
  INNER JOIN
    Rule r
  INNER JOIN
    RuleElementType ret
      ON ret.RuleId = r.RuleId
  INNER JOIN
    ElementType et
      ON et.TypeId = ret.TypeId`;
  
  if(filters.scIds){
    query += `
    INNER JOIN
      RuleSuccessCriteria src
        ON src.RuleId = r.RuleId`;
  }

  if(filters.tagIds){
    query = query + `
    LEFT JOIN
      TagApplication ta
        ON ta.ApplicationId = app.ApplicationId`;
  }

  if(filters.continentIds){
    query = query + `
    LEFT JOIN
      Country c
        ON c.CountryId = app.CountryId`;
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId
      AND a.RuleId = r.RuleId
  WHERE app.deleted = 0`;

  if(filters.continentIds){
    splitted = filters.continentIds.split(',');
    if(filters.continentIds === '0'){
      query = query + `
      AND c.ContinentId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (c.ContinentId is null OR c.ContinentId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND c.ContinentId IN (?)`;
    }
  }

  if(filters.countryIds){
    splitted = filters.countryIds.split(',');
    if(filters.countryIds === '0'){
      query = query + `
      AND app.CountryId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (app.CountryId is null OR app.CountryId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND app.CountryId IN (?)`;
    }
  }

  if(filters.tagIds){
    splitted = filters.tagIds.split(',');
    if(filters.tagIds === '0'){
      query = query + `
      AND ta.TagId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (ta.TagId is null OR ta.TagId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND ta.TagId IN (?)`;
    }
  }

  if(filters.appIds){
    params.push(filters.appIds.split(','));
    query = query + `
    AND app.ApplicationId IN (?)`;
  }

  if(filters.sectorIds){
    params.push(filters.sectorIds.split(','));
    query = query + `
    AND app.Sector IN (?)`;
  }

  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `
    AND app.OrganizationId IN (?)`;
  }

  if(filters.evalIds){
    params.push(filters.evalIds.split(','));
    query = query + `
    AND a.EvaluationToolId IN (?)`;
  }

  if(filters.scIds){
    query += `
    AND src.SCId IN (?)`;
    params.push(filters.scIds);
  }

  query = query + `
  GROUP BY 1, 2;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get assertions' metrics in "compare" way, used in 'Comparison' and 'Group by' navigations 
 * rule class */
const get_data_rule_compare = async (serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let groupByParams = [];
  let groupByParam = '';
  if(filters !== {}){
    groupByParam = Object.keys(filters)[0];
    if(!groupByParam.includes('rule'))
      groupByParams.push(groupByParam.substring(0, groupByParam.length - 1));
  }
  groupByParams.push('id');
  let params = [];
  let filtered, splitted;
  let query = 
  `SELECT r.Name as name,
    r.RuleId as id,
    COUNT(DISTINCT p.PageId) as nPages,
    COUNT(DISTINCT a.AssertionId) as nAssertions,
    COUNT(IF(a.Outcome = 'passed', 1, NULL)) as nPassed,
    COUNT(IF(a.Outcome = 'failed', 1, NULL)) as nFailed,
    COUNT(IF(a.Outcome = 'cantTell', 1, NULL)) as nCantTell,
    COUNT(IF(a.Outcome = 'inapplicable', 1, NULL)) as nInapplicable,
    COUNT(IF(a.Outcome = 'untested', 1, NULL)) as nUntested`;

  if(groupByParam === 'continentIds'){
    query = query + `,
    cont.ContinentId as continentId,
    cont.Name as continentName`;
  }

  if(groupByParam === 'countryIds'){
    query = query + `,
    c.CountryId as countryId,
    c.Name as countryName`;
  }

  if(groupByParam === 'tagIds'){
    query = query + `,
    t.TagId as tagId,
    t.Name as tagName`;
  }

  if(groupByParam === 'orgIds'){
    query = query + `,
    org.OrganizationId as orgId,
    org.Name as orgName`;
  }

  if(groupByParam === 'sectorIds'){
    query = query + `,
    app.Sector as sectorId,
    IF(app.Sector = '0', 'Public', 'Private') as sectorName`;
  }

  if(groupByParam === 'appIds'){
    query = query + `,
    app.ApplicationId as appId,
    app.Name as appName`;
  }
  
  if(groupByParam === 'evalIds'){
    params.push(filters.evalIds.split(','));
    query = query + `,
    a.EvaluationToolId as evalId,
    (SELECT eval.Name FROM EvaluationTool eval WHERE a.EvaluationToolId IN (?) AND eval.EvaluationToolId = a.EvaluationToolId) as evalName`;
  }

  if(groupByParam === 'typeIds'){
    query = query + `,
    et.TypeId as typeId,
    et.Name as typeName`;
  }

  if(groupByParam === 'scIds'){
    query = query + `,
    sc.SCId as scId,
    sc.Name as scName`;
  }
    
  query = query + `
  FROM
    Application app
  INNER JOIN
    Rule r`;

  if(filters.orgIds){
    query = query + `
    INNER JOIN
      Organization org
        ON org.OrganizationId = app.OrganizationId`;
  }

  if(filters.typeIds){
    query = query + `
    INNER JOIN
      RuleElementType ret
        ON ret.RuleId = r.RuleId
    INNER JOIN
      ElementType et
        ON et.TypeId = ret.TypeId`;
  }

  if(filters.scIds){
    query = query + `
    LEFT JOIN
      RuleSuccessCriteria rsc
        ON rsc.RuleId = r.RuleId
    LEFT JOIN
      SuccessCriteria sc
        ON sc.SCId = rsc.SCId`;
  }

  if(filters.tagIds){
    query = query + `
    LEFT JOIN
      TagApplication ta
        ON ta.ApplicationId = app.ApplicationId
    LEFT JOIN
      Tag t
        ON t.TagId = ta.TagId`;
  }

  if(filters.continentIds || filters.countryIds){
    query = query + `
    LEFT JOIN
      Country c
        ON c.CountryId = app.CountryId`;
    if(filters.continentIds) {
      query = query + `
      LEFT JOIN
        Continent cont
          ON cont.ContinentId = c.ContinentId`;
    }
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId
      AND a.RuleId = r.RuleId
  WHERE app.deleted = 0`;

  if(filters.continentIds){
    splitted = filters.continentIds.split(',');
    if(filters.continentIds === '0'){
      query = query + `
      AND c.ContinentId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (c.ContinentId is null OR c.ContinentId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND c.ContinentId IN (?)`;
    }
  }

  if(filters.countryIds){
    splitted = filters.countryIds.split(',');
    if(filters.countryIds === '0'){
      query = query + `
      AND app.CountryId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (app.CountryId is null OR app.CountryId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND app.CountryId IN (?)`;
    }
  }

  if(filters.tagIds){
    splitted = filters.tagIds.split(',');
    if(filters.tagIds === '0'){
      query = query + `
      AND ta.TagId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (ta.TagId is null OR ta.TagId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND ta.TagId IN (?)`;
    }
  }

  if(filters.appIds){
    params.push(filters.appIds.split(','));
    query = query + `
    AND app.ApplicationId IN (?)`;
  }

  if(filters.sectorIds){
    params.push(filters.sectorIds.split(','));
    query = query + `
    AND app.Sector IN (?)`;
  }

  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `
    AND app.OrganizationId IN (?)`;
  }

  if(filters.evalIds){
    params.push(filters.evalIds.split(','));
    query = query + `
    AND a.EvaluationToolId IN (?)`;
  }

  if(filters.typeIds){
    params.push(filters.typeIds.split(','));
    query = query + `
    AND ret.TypeId IN (?)`;
  }
  
  if(filters.scIds) {
    params.push(filters.scIds.split(','));
    query = query + `
    AND sc.SCId IN (?)`;
  }
  
  if(filters.ruleIds){
    params.push(filters.ruleIds.split(','));
    query = query + `
    AND a.RuleId IN (?)`;
  }

  query = query + `
  GROUP BY ` + groupByParams.join(',') + `;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get assertions' metrics in "compare" way, used in 'Comparison' and 'Group by' navigations 
 * type of element class */
const get_data_element_type_compare = async (serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let groupByParams = [];
  let groupByParam = '';
  if(filters !== {}){
    groupByParam = Object.keys(filters)[0];
    if(!groupByParam.includes('type'))
      groupByParams.push(groupByParam.substring(0, groupByParam.length - 1));
  }
  groupByParams.push('id');
  let params = [];
  let filtered, splitted;
  let query = 
  `SELECT et.Name as name,
    et.TypeId as id,
    COUNT(DISTINCT p.PageId) as nPages,
    COUNT(DISTINCT a.AssertionId) as nAssertions,
    COUNT(IF(a.Outcome = 'passed', 1, NULL)) as nPassed,
    COUNT(IF(a.Outcome = 'failed', 1, NULL)) as nFailed,
    COUNT(IF(a.Outcome = 'cantTell', 1, NULL)) as nCantTell,
    COUNT(IF(a.Outcome = 'inapplicable', 1, NULL)) as nInapplicable,
    COUNT(IF(a.Outcome = 'untested', 1, NULL)) as nUntested`;

  if(groupByParam === 'continentIds'){
    query = query + `,
    cont.ContinentId as continentId,
    cont.Name as continentName`;
  }

  if(groupByParam === 'countryIds'){
    query = query + `,
    c.CountryId as countryId,
    c.Name as countryName`;
  }

  if(groupByParam === 'tagIds'){
    query = query + `,
    t.TagId as tagId,
    t.Name as tagName`;
  }

  if(groupByParam === 'orgIds'){
    query = query + `,
    org.OrganizationId as orgId,
    org.Name as orgName`;
  }

  if(groupByParam === 'sectorIds'){
    query = query + `,
    app.Sector as sectorId,
    IF(app.Sector = '0', 'Public', 'Private') as sectorName`;
  }

  if(groupByParam === 'appIds'){
    query = query + `,
    app.ApplicationId as appId,
    app.Name as appName`;
  }
  
  if(groupByParam === 'evalIds'){
    params.push(filters.evalIds.split(','));
    query = query + `,
    a.EvaluationToolId as evalId,
    (SELECT eval.Name FROM EvaluationTool eval WHERE a.EvaluationToolId IN (?) AND eval.EvaluationToolId = a.EvaluationToolId) as evalName`;
  }

  if(groupByParam === 'scIds'){
    query = query + `,
    sc.SCId as scId,
    sc.Name as scName`;
  }
  
  query = query + `
  FROM
    Application app
  INNER JOIN
    Rule r
  INNER JOIN
    RuleElementType ret
      ON ret.RuleId = r.RuleId
  INNER JOIN
    ElementType et
      ON et.TypeId = ret.TypeId`;

  if(filters.orgIds){
    query = query + `
    INNER JOIN
      Organization org
        ON org.OrganizationId = app.OrganizationId`;
  }

  if(filters.scIds){
    query = query + `
    LEFT JOIN
      RuleSuccessCriteria rsc
        ON rsc.RuleId = r.RuleId
    LEFT JOIN
      SuccessCriteria sc
        ON sc.SCId = rsc.SCId`;
  }

  if(filters.tagIds){
    query = query + `
    LEFT JOIN
      TagApplication ta
        ON ta.ApplicationId = app.ApplicationId`;
  }

  if(filters.continentIds || filters.countryIds){
    query = query + `
    LEFT JOIN
      Country c
        ON c.CountryId = app.CountryId`;
    if(filters.continentIds) {
      query = query + `
      LEFT JOIN
        Continent cont
          ON cont.ContinentId = c.ContinentId`;
    }
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId
      AND a.RuleId = r.RuleId
  WHERE app.deleted = 0`;

  if(filters.continentIds){
    splitted = filters.continentIds.split(',');
    if(filters.continentIds === '0'){
      query = query + `
      AND c.ContinentId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (c.ContinentId is null OR c.ContinentId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND c.ContinentId IN (?)`;
    }
  }

  if(filters.countryIds){
    splitted = filters.countryIds.split(',');
    if(filters.countryIds === '0'){
      query = query + `
      AND app.CountryId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (app.CountryId is null OR app.CountryId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND app.CountryId IN (?)`;
    }
  }

  if(filters.tagIds){
    splitted = filters.tagIds.split(',');
    if(filters.tagIds === '0'){
      query = query + `
      AND ta.TagId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (ta.TagId is null OR ta.TagId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND ta.TagId IN (?)`;
    }
  }

  if(filters.appIds){
    params.push(filters.appIds.split(','));
    query = query + `
    AND app.ApplicationId IN (?)`;
  }
  
  if(filters.sectorIds){
    params.push(filters.sectorIds.split(','));
    query = query + `
    AND app.Sector IN (?)`;
  }

  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `
    AND app.OrganizationId IN (?)`;
  }

  if(filters.evalIds){
    params.push(filters.evalIds.split(','));
    query = query + `
    AND a.EvaluationToolId IN (?)`;
  }
  
  if(filters.scIds) {
    params.push(filters.scIds.split(','));
    query = query + `
    AND sc.SCId IN (?)`;
  }

  if(filters.typeIds){
    params.push(filters.typeIds.split(','));
    query = query + `
    AND ret.TypeId IN (?)`;
  }

  query = query + `
  GROUP BY ` + groupByParams.join(',') + `;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get names of application, organization or sector, given some query params
 * This query is necessary to offer an auto-fill in chart's modal window */
const get_names = async (tableName: string, serverName: string, filters?: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  let query;
  switch(tableName){
    case 'rule':
      query = `
      SELECT r.RuleId as id, 
      r.Name as name`;
      break;
    case 'type':
      query = `
      SELECT et.TypeId as id,
      et.Name as name`;
      break;
    default:
      query = `
      SELECT r.RuleId as id, 
      r.Name as name`;
      break;
  }

  query = query + `
  FROM
    Application app
  INNER JOIN
    Rule r`;

  if(filters.typeIds || tableName === 'type'){
    query += `
    INNER JOIN
      RuleElementType ret
        ON r.RuleId = ret.RuleId
    INNER JOIN
      ElementType et
        ON et.TypeId = ret.TypeId`;
  }

  if(filters.countryIds || filters.continentIds){
    query += `
    LEFT JOIN
      Country c
        ON c.CountryId = app.CountryId
    LEFT JOIN
      Continent cont
        ON c.ContinentId = cont.ContinentId`; 
  }

  if(filters.tagIds){
    query = query + `
    LEFT JOIN
      TagApplication ta
        ON ta.ApplicationId = app.ApplicationId
    LEFT JOIN
      Tag t
        ON t.TagId = ta.TagId`;
  }
  if(filters.orgIds){
    query += `
    INNER JOIN
      Organization org
        ON app.OrganizationId = org.OrganizationId`; 
  }

  if(filters.scIds){
    query += `
    INNER JOIN
      RuleSuccessCriteria src
        ON src.RuleId = r.RuleId`;
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId
      AND r.RuleId = a.RuleId
  WHERE app.deleted = 0`;

  if(filters.continentIds){
    splitted = filters.continentIds.split(',');
    if(filters.continentIds === '0'){
      query = query + `
      AND c.ContinentId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (c.ContinentId is null OR c.ContinentId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND c.ContinentId IN (?)`;
    }
  }
  
  if(filters.countryIds){
    splitted = filters.countryIds.split(',');
    if(filters.countryIds === '0'){
      query = query + `
      AND app.CountryId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (app.CountryId is null OR app.CountryId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND app.CountryId IN (?)`;
    }
  }

  if(filters.tagIds){
    splitted = filters.tagIds.split(',');
    if(filters.tagIds === '0'){
      query = query + `
      AND ta.TagId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query = query + `
      AND (ta.TagId is null OR ta.TagId IN (?))`;
    } else {
      params.push(splitted);
      query = query + `
      AND ta.TagId IN (?)`;
    }
  }
  if(filters.sectorIds){
    query += `
    AND app.Sector IN (?)`;
    params.push(filters.sectorIds);
  }
  if(filters.orgIds){
    query += `
    AND org.OrganizationId IN (?)`;
    params.push(filters.orgIds);
  }
  if(filters.appIds){
    query += `
    AND app.ApplicationId IN (?)`;
    params.push(filters.appIds);
  }
  if(filters.evalIds){
    query += `
    AND a.EvaluationToolId IN (?)`;
    params.push(filters.evalIds);
  }
  if(filters.scIds){
    query += `
    AND src.SCId IN (?)`;
    params.push(filters.scIds);
  }
  if(filters.typeIds) {
    query += `
    AND ret.TypeId IN (?)`;
    params.push(filters.typeIds);
  }
  if(filters.ruleIds) {
    query += `
    AND r.RuleId IN (?)`;
    params.push(filters.ruleIds);
  }

  query = query + `
  GROUP BY 1,2
  ORDER BY 2;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

export {get_data_rule, get_data_element_type, get_data_rule_compare, get_data_element_type_compare, get_names};