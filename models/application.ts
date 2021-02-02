import { execute_query } from "../database/database";
import { error, success } from "../util/responses";

/* In this file, all these functions return data related to the classes of:
 * sector
 * organization
 * application/website
 */

/* Get assertions' metrics in "simple" way, used in default and 'Drilldown' navigations */
const get_data = async (tableName: string, serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  let query;
  switch(tableName){
    case 'app':
      query = `SELECT app.applicationid as id, app.name as name,`;
      break;
    case 'sector':
      query = `SELECT app.Sector as id, IF(app.Sector = '0', 'Public', 'Private') as name,`;
      break;
    case 'org':
      query = `SELECT org.OrganizationId as id, org.Name as name,`;
      break;
    default:
      query = `SELECT app.applicationid as id, app.name as name,`;
      break;
  }

  query = query + `
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
    (SELECT JSON_ARRAYAGG(c.Name) FROM Country c WHERE c.CountryId IN (?)) as countryNames`
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

  query = query + `
    FROM
      Application app`;
      
  if(tableName === 'org'){
    query = query + `
    INNER JOIN
      Organization org
        ON org.OrganizationId = app.OrganizationId`;
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
  (SELECT a.AssertionId, a.PageId, a.Outcome
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId
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
    params.push(filters.sectorIds.split(','));
    query = query + `
    AND app.Sector IN (?)`;
  }

  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `
    AND app.OrganizationId IN (?)`;
  }

  query = query + `
  GROUP BY 1, 2
  ORDER BY 2;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get success criterion metrics in "simple" way, used in default and 'Drilldown' navigations */
const get_data_sc = async (tableName: string, serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let params = [];
  let filtered, splitted;
  let query =
  `SET @scTotal = (SELECT COUNT(SCId) from SuccessCriteria);
  DROP TABLE IF EXISTS workingTable;
  CREATE TEMPORARY TABLE workingTable AS`;

  switch(tableName){
    case 'app':
      query = query + `
      SELECT app.applicationid as id, app.name as name,`;
      break;
    case 'sector':
      query = query + `
      SELECT app.Sector as id, IF(app.Sector = '0', 'Public', 'Private') as name,`;
      break;
    case 'org':
      query = query + `
      SELECT org.OrganizationId as id, org.Name as name,`;
      break;
    default:
      query = query + `
      SELECT app.applicationid as id, app.name as name,`;
      break;
  }

  query = query + `
  scr.SCId,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'failed', 1, NULL)) as failed,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'cantTell', 1, NULL)) as cantTell,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'passed', 1, NULL)) as passed,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'inapplicable', 1, NULL)) as inapplicable
  FROM Application app`;
  
  if(filters.tagIds){
    query = query + `
    LEFT JOIN
      TagApplication ta
        ON ta.ApplicationId = app.ApplicationId`;
  }

  if(tableName === 'org'){
    query = query + `
    INNER JOIN
      Organization org
        ON org.OrganizationId = app.OrganizationId`;
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
    RuleSuccessCriteria scr
  LEFT JOIN
    (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId
    FROM
    Assertion a
    WHERE
    date = (SELECT max(a1.Date) 
        FROM Assertion a1 
        WHERE a.RuleId = a1.RuleId 
        AND a.PageId = a1.PageId)
    AND a.deleted = 0
    ORDER BY date DESC) a
    ON a.PageId = p.PageId
      AND scr.RuleId = a.RuleId
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
    params.push(filters.sectorIds.split(','));
    query = query + `
    AND app.Sector IN (?)`;
  }
  if(filters.orgIds){
    params.push(filters.orgIds.split(','));
    query = query + `
    AND app.OrganizationId IN (?)`;
  }

  query = query + `
  GROUP BY 1, 3
  ORDER BY 1, 2, 3;`;

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
  
  SELECT id, name, 
    SUM(failed) as nFailed, 
    SUM(cantTell) as nCantTell,
    SUM(passed) as nPassed,
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
    (SELECT JSON_ARRAYAGG(c.Name) FROM Country c WHERE c.CountryId IN (?)) as countryNames`
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

  query = query + `
  FROM workingTable
  GROUP BY 1, 2
  ORDER BY 2;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get assertions' metrics in "compare" way, used in 'Comparison' and 'Group by' navigations */
const get_data_compare = async (tableName: string, serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let groupByParams = [];
  let groupByParam = '';
  if(filters !== {}){
    groupByParam = Object.keys(filters)[0];
    if(!groupByParam.includes(tableName))
      groupByParams.push(groupByParam.substring(0, groupByParam.length - 1));
  }
  groupByParams.push('id');
  let params = [];
  let filtered, splitted;
  let query;
  switch(tableName){
    case 'app':
      query = `SELECT app.applicationid as id, app.name as name,`;
      break;
    case 'sector':
      query = `SELECT app.Sector as id, IF(app.Sector = '0', 'Public', 'Private') as name,`;
      break;
    case 'org':
      query = `SELECT org.OrganizationId as id, org.Name as name,`;
      break;
    default:
      query = `SELECT app.applicationid as id, app.name as name,`;
      break;
  }

  query = query + `
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

  if(groupByParam === 'orgIds' && tableName !== 'org'){
    query = query + `,
    org.OrganizationId as orgId,
    org.Name as orgName`;
  }

  if(groupByParam === 'sectorIds' && tableName !== 'sector'){
    query = query + `,
    app.Sector as sectorId,
    IF(app.Sector = '0', 'Public', 'Private') as sectorName`;
  }

  if(groupByParam === 'appIds' && tableName !== 'app'){
    query = query + `,
    app.ApplicationId as appId,
    app.Name as appName`;
  }

  query = query + `
    FROM
      Application app`;
      
  if(filters.orgIds || tableName === 'org'){
    query = query + `
    INNER JOIN
      Organization org
        ON org.OrganizationId = app.OrganizationId`;
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
  (SELECT a.AssertionId, a.PageId, a.Outcome
    FROM
      Assertion a
    WHERE
      date = (SELECT max(a1.Date) FROM Assertion a1 WHERE a.RuleId = a1.RuleId AND a.PageId = a1.PageId)
      AND a.deleted = 0
    ORDER BY date DESC) a
      ON a.PageId = p.PageId
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

  query = query + `
  GROUP BY ` + groupByParams.join(',') + `;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get success criterion metrics in "compare" way, used in 'Comparison' and 'Group by' navigations */
const get_data_sc_compare = async (tableName: string, serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let groupByParams = [];
  let groupByParam = '';
  if(filters !== {}){
    groupByParam = Object.keys(filters)[0];
    if(!groupByParam.includes(tableName))
      groupByParams.push(groupByParam.substring(0, groupByParam.length - 1));
  }
  groupByParams.push('id', 'name');
  let params = [];
  let filtered, splitted;
  let query =
  `SET @scTotal = (SELECT COUNT(SCId) from SuccessCriteria);
  DROP TABLE IF EXISTS workingTable;
  CREATE TEMPORARY TABLE workingTable AS`;

  switch(tableName){
    case 'app':
      query = query + `
      SELECT app.applicationid as id, app.name as name,`;
      break;
    case 'sector':
      query = query + `
      SELECT app.Sector as id, IF(app.Sector = '0', 'Public', 'Private') as name,`;
      break;
    case 'org':
      query = query + `
      SELECT org.OrganizationId as id, org.Name as name,`;
      break;
    default:
      query = query + `
      SELECT app.applicationid as id, app.name as name,`;
      break;
  }

  query = query + `
  scr.SCId,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'failed', 1, NULL)) as failed,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'cantTell', 1, NULL)) as cantTell,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'passed', 1, NULL)) as passed,
  COUNT(DISTINCT scr.SCId, IF(a.Outcome = 'inapplicable', 1, NULL)) as inapplicable`;

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

  if(groupByParam === 'orgIds' && tableName !== 'org'){
    query = query + `,
    org.OrganizationId as orgId,
    org.Name as orgName`;
  }

  if(groupByParam === 'sectorIds' && tableName !== 'sector'){
    query = query + `,
    app.Sector as sectorId,
    IF(app.Sector = '0', 'Public', 'Private') as sectorName`;
  }

  if(groupByParam === 'appIds' && tableName !== 'app'){
    query = query + `,
    app.ApplicationId as appId,
    app.Name as appName`;
  }

  query = query + `
  FROM Application app`;

  if(filters.orgIds || tableName === 'org'){
    query = query + `
    INNER JOIN
      Organization org
        ON org.OrganizationId = app.OrganizationId`;
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
    RuleSuccessCriteria scr
  LEFT JOIN
    (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId
    FROM
    Assertion a
    WHERE
    date = (SELECT max(a1.Date) 
        FROM Assertion a1 
        WHERE a.RuleId = a1.RuleId 
        AND a.PageId = a1.PageId)
    AND a.deleted = 0
    ORDER BY date DESC) a
    ON a.PageId = p.PageId
      AND scr.RuleId = a.RuleId
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

  query = query + `
  GROUP BY ` + groupByParams.join(',') + `, 3;`;

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
  
  SELECT id, name, 
    SUM(failed) as nFailed, 
    SUM(cantTell) as nCantTell,
    SUM(passed) as nPassed,
    SUM(inapplicable) as nInapplicable,
    (@scTotal - SUM(failed) - SUM(cantTell) - SUM(passed) - SUM(inapplicable)) as nUntested`;

  if(groupByParam === 'continentIds'){
    query = query + `,
    continentId,
    continentName`;
  }

  if(groupByParam === 'countryIds'){
    query = query + `,
    countryId,
    countryName`;
  }

  if(groupByParam === 'tagIds'){
    query = query + `,
    tagId,
    tagName`;
  }

  if(groupByParam === 'orgIds' && tableName !== 'org'){
    query = query + `,
    orgId,
    orgName`;
  }

  if(groupByParam === 'sectorIds' && tableName !== 'sector'){
    query = query + `,
    sectorId,
    sectorName`;
  }

  if(groupByParam === 'appIds' && tableName !== 'app'){
    query = query + `,
    appId,
    appName`;
  }

  query = query + `
  FROM workingTable
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
    case 'app':
      query = `
      SELECT app.ApplicationId as id, 
      app.Name as name`;
      break;
    case 'org':
      query = `
      SELECT org.OrganizationId as id,
      org.Name as name`;
      break;
    case 'sector':
      query = `
      SELECT app.Sector as id, 
      IF(app.Sector = '0', 'Public', 'Private') as name`;
      break;
    default:
      query = `
      SELECT app.ApplicationId as id, 
      app.Name as name`;
      break;
  }

  query = query + `
  FROM
    Application app`;

  if(tableName === 'org' || filters.orgIds){
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

  if(filters.ruleIds || filters.typeIds || filters.scIds || filters.evalIds){
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
      ON a.PageId = p.PageId`
  }
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
  GROUP BY 1,2
  ORDER BY 2;`;

  try {
    let result = (await execute_query(serverName, query, params));
    return success(result);
  } catch(err){
    return error(err);
  }
}

/* Get assertions by success criteria, related to an application/website 
 * This query's result is used to fulfill the 'Details' navigation */
const get_all_sc_data_app = async(serverName: string, filters: any) => {
  filters = Object.keys(filters).length !== 0 ? JSON.parse(filters) : {};
  let query;
  let appId = filters.appIds ? filters.appIds.split(',') : null;
  try {
    query =
    `DROP TABLE IF EXISTS workingTable;
    CREATE TEMPORARY TABLE workingTable AS
    SELECT 
      sc.*,
      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', a.assertionid,
          'eval', eval.name,
          'rulename', r.name,
          'rulelink', r.url,
          'page', p.url,
          'outcome', a.outcome,
          'description', a.description))) as assertions,
      COUNT(DISTINCT p.PageId) as nPages,
      COUNT(DISTINCT a.AssertionId) as nAssertions,
      COUNT(IF(a.Outcome = 'passed', 1, NULL)) as passed,
      COUNT(IF(a.Outcome = 'failed', 1, NULL)) as failed,
      COUNT(IF(a.Outcome = 'cantTell', 1, NULL)) as cantTell,
      COUNT(IF(a.Outcome = 'inapplicable', 1, NULL)) as inapplicable,
      COUNT(IF(a.Outcome = 'untested', 1, NULL)) as untested
    FROM Application app
    INNER JOIN
      Page p
        ON p.ApplicationId = app.ApplicationId AND p.deleted = 0
    INNER JOIN
      (SELECT a.AssertionId, a.PageId, a.Outcome, a.RuleId, a.EvaluationToolId, a.Description
        FROM
          Assertion a
        WHERE
          date = (SELECT max(a1.Date) 
                    FROM Assertion a1 
                      WHERE a.RuleId = a1.RuleId 
                      AND a.PageId = a1.PageId)
          AND a.deleted = 0
        ORDER BY date DESC) a
          ON a.PageId = p.PageId
    INNER JOIN
      RuleSuccessCriteria scr
        ON scr.RuleId = a.RuleId
    INNER JOIN
      SuccessCriteria sc
        ON scr.SCId = sc.SCId
    INNER JOIN
      EvaluationTool eval
        on eval.EvaluationToolId = a.EvaluationToolId
    INNER JOIN
      Rule r
        on r.RuleId = a.RuleId
    WHERE app.deleted = 0
    AND app.ApplicationId IN (?)
    GROUP BY 1;
    
    
    ALTER TABLE workingTable
    ADD COLUMN outcome VARCHAR(25) AFTER untested;

    UPDATE workingTable
      SET cantTell = 0, passed = 0, inapplicable = 0, untested = 0, outcome = 'failed'
      WHERE failed >= 1;
    UPDATE workingTable
      SET passed = 0, inapplicable = 0, untested = 0, outcome = 'cantTell'
      WHERE failed = 0 AND cantTell >= 1;
    UPDATE workingTable
      SET inapplicable = 0, untested = 0, outcome = 'passed'
      WHERE failed = 0 AND cantTell = 0 AND passed >= 1;
    UPDATE workingTable
      SET untested = 0, outcome = 'inapplicable'
      WHERE failed = 0 AND cantTell = 0 AND passed = 0 AND inapplicable >= 1;
    UPDATE workingTable
      SET outcome = 'untested'
      WHERE failed = 0 AND cantTell = 0 AND passed = 0 AND inapplicable = 0 AND untested >= 1;
      
    SELECT SCId, Name, Principle, Level, Url, Assertions, nPages, nAssertions,
      outcome
      FROM workingTable
    ORDER BY 1;`;
    
    let result = (await execute_query(serverName, query, [appId]));
    return success(result);
  } catch(err){
    return error(err);
  }
}

export {get_data, get_data_sc, get_names, 
  get_all_sc_data_app,
  get_data_compare, get_data_sc_compare };