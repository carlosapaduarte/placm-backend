import { execute_query } from "../database/database";
import { error, success } from "../util/responses";

/* In this file, all these functions return data related to the navigation of 'Timeline'
 * where specifying classes is irrelevant (every class is handled here)
 */

/* Get last date (by month) of stored assertions
 * Used to calculate metrics by month */
const get_dates_by_months = async (serverName: string, filters?: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  let query = `
  DROP TABLE IF EXISTS dates;
  CREATE TEMPORARY TABLE dates AS`;
  query += `
  SELECT DISTINCT LAST_DAY(a.Date) as date
  FROM
    Application app`;

  if(filters.orgIds){
    query += `
    INNER JOIN
      Organization org
        ON app.OrganizationId = org.OrganizationId`; 
  };

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

  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
    INNER JOIN
      Rule r`;
    if(filters.typeIds){
      query += `
      INNER JOIN
        RuleElementType ret
          ON r.RuleId = ret.RuleId
      INNER JOIN
        ElementType et
          ON et.TypeId = ret.TypeId`;
    }
    if(filters.scIds){
      query += `
      INNER JOIN
        RuleSuccessCriteria src
          ON src.RuleId = r.RuleId`;
    }
  }

  query += `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId, a.Date
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId`
  
  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
      AND r.RuleId = a.RuleId`;
  }
  query += `
  WHERE app.deleted = 0`;

  if(filters.continentIds){
    splitted = filters.continentIds.split(',');
    if(filters.continentIds === '0'){
      query += `
      AND c.ContinentId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query += `
      AND (c.ContinentId is null OR c.ContinentId IN (?))`;
    } else {
      params.push(splitted);
      query += `
      AND c.ContinentId IN (?)`;
    }
  }
  if(filters.countryIds){
    splitted = filters.countryIds.split(',');
    if(filters.countryIds === '0'){
      query += `
      AND app.CountryId is null`;
    } else if (splitted.includes('0')) {

      // removing unspecified from filters
      filtered = splitted.filter(function(v: string, i: any, arr: any){return v !== '0';});
      params.push(filtered);
      
      query += `
      AND (app.CountryId is null OR app.CountryId IN (?))`;
    } else {
      params.push(splitted);
      query += `
      AND app.CountryId IN (?)`;
    }
  }
  if(filters.tagIds){
    splitted = filters.tagIds.split(',');
    if(filters.tagIds === '0'){
      query += `
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
  GROUP BY 1;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get assertions' metrics, by month */
const by_month_assertions = async (serverName: string, filters?: any) => {
  let params = [];
  let filtered, splitted, placeholder;

  // to create temporary table 'dates'
  try {
    await get_dates_by_months(serverName, filters);
  } catch(err){
    return error(err);
  }
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};

  let query = `
  SELECT 
  DATE_FORMAT(d.date, '%Y-%m') as date,
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

  if(filters.ruleIds){
    params.push(filters.ruleIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(r.Name) FROM Rule r WHERE r.RuleId IN (?)) as ruleNames`;
  }


  query = query + `
  FROM
    dates d
  INNER JOIN
    Application app`;

  if(filters.orgIds){
    query += `
    INNER JOIN
      Organization org
        ON app.OrganizationId = org.OrganizationId`; 
  };

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

  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
    INNER JOIN
      Rule r`;
    if(filters.typeIds){
      query += `
      INNER JOIN
        RuleElementType ret
          ON r.RuleId = ret.RuleId
      INNER JOIN
        ElementType et
          ON et.TypeId = ret.TypeId`;
    }
    if(filters.scIds){
      query += `
      INNER JOIN
        RuleSuccessCriteria src
          ON src.RuleId = r.RuleId`;
    }
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
    Assertion a
      ON a.deleted = 0
      AND a.PageId = p.PageId
      AND a.Date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId AND EXTRACT(YEAR_MONTH FROM a1.Date) - EXTRACT(YEAR_MONTH FROM d.date) = 0)`
  
  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
      AND r.RuleId = a.RuleId`;
  }
  query = query + `
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
  GROUP BY 1;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get success criterion metrics, by month */
const by_month_scriteria = async (serverName: string, filters?: any) => {
  let params = [];
  let filtered, splitted;

  // to create temporary table 'dates'
  try {
    await get_dates_by_months(serverName, filters);
  } catch(err){
    return error(err);
  }
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};

  let query = `
  SET @scTotal = (SELECT COUNT(SCId) from SuccessCriteria);
  DROP TABLE IF EXISTS workingTable;
  CREATE TEMPORARY TABLE workingTable AS
  SELECT 
  DATE_FORMAT(d.date, '%Y-%m') as date,
  scr.SCId,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'failed', 1, NULL)) as failed,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'cantTell', 1, NULL)) as cantTell,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'passed', 1, NULL)) as passed,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'inapplicable', 1, NULL)) as inapplicable`;

  query = query + `
  FROM
    dates d
  INNER JOIN
    Application app`;

  if(filters.orgIds){
    query += `
    INNER JOIN
      Organization org
        ON app.OrganizationId = org.OrganizationId`; 
  };

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

  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
    INNER JOIN
      Rule r`;
    if(filters.typeIds){
      query += `
      INNER JOIN
        RuleElementType ret
          ON r.RuleId = ret.RuleId
      INNER JOIN
        ElementType et
          ON et.TypeId = ret.TypeId`;
    }
    if(filters.scIds){
      query += `
      INNER JOIN
        RuleSuccessCriteria src
          ON src.RuleId = r.RuleId`;
    }
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
    RuleSuccessCriteria scr
  INNER JOIN
    Assertion a
      ON a.deleted = 0
      AND a.PageId = p.PageId
      AND a.Date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId AND EXTRACT(YEAR_MONTH FROM a1.Date) - EXTRACT(YEAR_MONTH FROM d.date) = 0)
      AND scr.RuleId = a.RuleId`
  
  /* if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
      AND r.RuleId = a.RuleId`;
  } */
  query = query + `
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
  /* if(filters.scIds){
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
  } */

  query = query + `
  GROUP BY 1,2;`;

  query = query + `
  UPDATE workingTable
    SET cantTell = 0, passed = 0, inapplicable = 0
    WHERE failed = 1;
  UPDATE workingTable
    SET passed = 0, inapplicable = 0
    WHERE failed = 0 AND cantTell = 1;
  UPDATE workingTable
    SET inapplicable = 0
    WHERE failed = 0 AND cantTell = 0 AND passed = 1;
  
  SELECT date, 
    SUM(passed) as nPassed,
    SUM(failed) as nFailed, 
    SUM(cantTell) as nCantTell,
    SUM(inapplicable) as nInapplicable,
    (@scTotal - SUM(failed) - SUM(cantTell) - SUM(passed) - SUM(inapplicable)) as nUntested`;

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

  /* if(filters.typeIds){
    params.push(filters.typeIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(et.Name) FROM ElementType et WHERE et.TypeId IN (?)) as typeNames`;
  }

  if(filters.scIds){
    params.push(filters.scIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(sc.Name) FROM SuccessCriteria sc WHERE sc.SCId IN (?)) as scNames`;
  }

  if(filters.ruleIds){
    params.push(filters.ruleIds.split(','));
    query = query + `,
    (SELECT JSON_ARRAYAGG(r.Name) FROM Rule r WHERE r.RuleId IN (?)) as ruleNames`;
  } */
  query = query + `
  FROM workingTable
  GROUP BY 1
  ORDER BY 1;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/************* NOT IN USE *****************/
/* Get assertions' metrics by month, but cumulative
 * Example: March represents January, February and March summed assertions' metrics */
const assertions_by_date_cumulative = async (serverName: string, filters?: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  let query = `
  DROP TABLE IF EXISTS dates;
  CREATE TEMPORARY TABLE dates AS`;
  query += `
  SELECT DISTINCT LAST_DAY(a.Date) as date
  FROM
    Application app`;

  if(filters.orgIds){
    query += `
    INNER JOIN
      Organization org
        ON app.OrganizationId = org.OrganizationId`; 
  };

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

  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
    INNER JOIN
      Rule r`;
    if(filters.typeIds){
      query += `
      INNER JOIN
        RuleElementType ret
          ON r.RuleId = ret.RuleId
      INNER JOIN
        ElementType et
          ON et.TypeId = ret.TypeId`;
    }
    if(filters.scIds){
      query += `
      INNER JOIN
        RuleSuccessCriteria src
          ON src.RuleId = r.RuleId`;
    }
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId, a.Date
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId`
  
  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
      AND r.RuleId = a.RuleId`;
  }
  query = query + `
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
  GROUP BY 1;`;

  query += `
  SELECT d.date,
  COUNT(DISTINCT p.PageId) as nPages,
  COUNT(DISTINCT a.AssertionId) as nAssertions,
  COUNT(IF(a.Outcome = 'passed', 1, NULL)) as nPassed,
  COUNT(IF(a.Outcome = 'failed', 1, NULL)) as nFailed,
  COUNT(IF(a.Outcome = 'cantTell', 1, NULL)) as nCantTell,
  COUNT(IF(a.Outcome = 'inapplicable', 1, NULL)) as nInapplicable,
  COUNT(IF(a.Outcome = 'untested', 1, NULL)) as nUntested`;

  query = query + `
  FROM
    dates d
  INNER JOIN
    Application app`;

  if(filters.orgIds){
    query += `
    INNER JOIN
      Organization org
        ON app.OrganizationId = org.OrganizationId`; 
  };

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

  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
    INNER JOIN
      Rule r`;
    if(filters.typeIds){
      query += `
      INNER JOIN
        RuleElementType ret
          ON r.RuleId = ret.RuleId
      INNER JOIN
        ElementType et
          ON et.TypeId = ret.TypeId`;
    }
    if(filters.scIds){
      query += `
      INNER JOIN
        RuleSuccessCriteria src
          ON src.RuleId = r.RuleId`;
    }
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
    Assertion a
      ON a.deleted = 0
      AND a.PageId = p.PageId
      AND a.Date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId AND a1.Date <= d.date)`
  
  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
      AND r.RuleId = a.RuleId`;
  }
  query = query + `
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
  GROUP BY 1;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/************* NOT IN USE *****************/
/* Get every unique stored assertion's date */
const get_distinct_dates = async (serverName: string, filters?: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  /*let query = `
  SELECT DISTINCT YEAR(a.Date) as year, MONTH(a.Date) as month`;*/
  let query = `
  SELECT DISTINCT a.Date as date`;

  query = query + `
  FROM
    Application app`;

  if(filters.orgIds){
    query += `
    INNER JOIN
      Organization org
        ON app.OrganizationId = org.OrganizationId`; 
  };

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

  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
    INNER JOIN
      Rule r`;
    if(filters.typeIds){
      query += `
      INNER JOIN
        RuleElementType ret
          ON r.RuleId = ret.RuleId
      INNER JOIN
        ElementType et
          ON et.TypeId = ret.TypeId`;
    }
    if(filters.scIds){
      query += `
      INNER JOIN
        RuleSuccessCriteria src
          ON src.RuleId = r.RuleId`;
    }
  }

  query = query + `
  INNER JOIN
    Page p
      ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
  INNER JOIN
  (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId, a.Date
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId`
  
  if(filters.ruleIds || filters.typeIds || filters.scIds){
    query += `
      AND r.RuleId = a.RuleId`;
  }
  query = query + `
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
  ORDER BY 1;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

export {assertions_by_date_cumulative, by_month_assertions, by_month_scriteria, get_distinct_dates};