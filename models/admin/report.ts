import { execute_query } from "../../database/database";
import { findAssertions } from "../../lib/earl/find_assertions";
import { error, success } from "../../util/responses";
import { EarlAssertion } from "../../lib/earl/earl_types";
import { trim } from "lodash";

/* Parse and insert EARL report into database */
const add_earl_report = async (serverName: string, formData: any, ...jsons: string[]) => {
  let query;
  let urlRegex, urlTested, urlRegexMatch, assertionDate;
  let toolName, toolUrl, toolDesc, toolVersion;
  let ruleName, ruleUrl, ruleDesc, ruleMapping;
  let orgName, orgId;
  let websiteName, websiteUrl, websiteCountry, websiteId;
  let websiteTags: number[] = [];
  let pageUrl;
  let assertionMode, assertionOutcome, assertionDesc;
  let evaluationTool, rule, org, website, tagSql, tagApp, page, assertionSQL;
  let params;

  let assertions: Array<EarlAssertion> = [];

  for (let json of jsons) {
    if (json.length) {
      let assertionList = await findAssertions(JSON.parse(json));
      for (let assertion of assertionList) {
        assertions.push(assertion);
      }
    }
  }

  let result: any = {
    evaluationTools: [],
    rules: [],
    organizations: [],
    applications: [],
    tags: [],
    tagApplications: [],
    pages: [],
    assertions: []
  };

  let index = 0;
  try {
    await execute_query(serverName, 'SET autocommit = 0; START TRANSACTION;');
    for (let assertion of assertions) {
      if(assertion){

        index++;
        urlRegex = new RegExp(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)(.*)?(#[\w\-]+)?$/);
        urlTested = trim(assertion.subject["source"]);
        urlRegexMatch = urlTested.match(urlRegex);
        assertionDate = assertion.result["earl:date"];
        if(assertionDate === undefined || isNaN((new Date(assertionDate)).valueOf())){
          assertionDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else {
          assertionDate = new Date(assertionDate).toISOString().slice(0, 19).replace('T', ' ');
        }

        /* ---------- handle assertor ---------- */
        
        let aBy, assertor;
        if(assertion.assertedBy){
          aBy = assertion.assertedBy;
          for(let assert of assertion.subject['earl:assertor']){
            if(assert['@id'] === aBy){
              assertor = assert;
            }
          }
          if(assertor === undefined) {
            assertor = Array.isArray(assertion.subject['earl:assertor']) ? assertion.subject['earl:assertor'][0] : assertion.subject['earl:assertor'];
          }
        } else {
          assertor = Array.isArray(assertion.subject['earl:assertor']) ? assertion.subject['earl:assertor'][0] : assertion.subject['earl:assertor'];
        }

        if(assertor["earl:title"]){
          //@type: earl:Software
          toolName = assertor["earl:title"]["@value"];
        } else {
          //@type: earl:Person
          toolName = assertor["earl:name"];
        }

        toolUrl = assertor["earl:homepage"] ? assertor["earl:homepage"] : null;
        toolDesc = assertor["earl:description"] ? assertor["earl:description"] : null;
        toolVersion = assertor["earl:hasVersion"] ? assertor["earl:hasVersion"] : null;

        query = `SELECT EvaluationToolId FROM EvaluationTool WHERE name = ?;`;
        params = [toolName];
        evaluationTool = (await execute_query(serverName, query, params))[0];
        if (!evaluationTool) {
          query = `INSERT INTO EvaluationTool (name, url, description, version)
            VALUES (?, ?, ?, ?);`;
          params = [toolName, toolUrl, toolDesc, toolVersion];
          evaluationTool = await execute_query(serverName, query, params);
          result.evaluationTools.push(evaluationTool.insertId);
        }

        /* ---------- handle rule ---------- */
        ruleName = Array.isArray(assertion.test["earl:title"]) ?
            assertion.test["earl:title"][1]["@value"] : assertion.test["earl:title"]["@value"];
        ruleUrl = assertion.test["@id"];
        ruleDesc = Array.isArray(assertion.test["earl:description"]) ?
            assertion.test["earl:description"][1] : assertion.test["earl:description"];

        let array;
        if(ruleUrl.endsWith('.md')){
          array = ruleUrl.split('-');
          ruleMapping = array[array.length - 1].substring(0,6);
        } else {
          array = ruleUrl.split('/');
          ruleMapping = array[array.length - 1];
        }

        query = `SELECT RuleId FROM Rule WHERE mapping = ?;`;
        params = [ruleMapping];
        rule = (await execute_query(serverName, query, params))[0];
        if (!rule) {
          query = `INSERT INTO Rule (name, mapping, url, description)
            VALUES (?, ?, ?, ?);`;
          params = [ruleName, ruleMapping, ruleUrl, ruleDesc];
          rule = await execute_query(serverName, query, params);
          result.rules.push(rule.insertId);
        }

        /* ---------- handle organization ---------- */
        orgName = formData.org;

        query = `SELECT OrganizationId FROM Organization WHERE name = ?;`;
        params = [orgName];
        org = (await execute_query(serverName, query, params))[0];
        if (!org) {
          query = `INSERT INTO Organization (name)
            VALUES (?);`;
          org = await execute_query(serverName, query, params);
          result.organizations.push(org.insertId);
        }
        orgId = org.OrganizationId ? org.OrganizationId : org.insertId;

        /* ---------- handle website/app ---------- */
        websiteUrl = formData.appUrl ? formData.appUrl : null;
        websiteName = formData.appName;
        websiteCountry = formData.country ? formData.country.id : null;
        query = `SELECT ApplicationId FROM Application WHERE name = ? AND OrganizationId = ?;`;
        params = [websiteName, orgId];
        website = (await execute_query(serverName, query, params))[0];
        if (!website) {
          query = `INSERT INTO Application (name, organizationid, type, sector, url, creationdate, countryid)
            VALUES (?, ?, ?, ?, ?, ?, ?);`;
          params = [websiteName, orgId, formData.type, formData.sector, websiteUrl, assertionDate, websiteCountry];
          website = await execute_query(serverName, query, params);
          result.applications.push(website.insertId);
        }
        websiteId = website.ApplicationId ? website.ApplicationId : website.insertId;

        /* ---------- handle tag ---------- */
        for(let tag of formData.tags){
          let tagName = tag;
          if(typeof tag !== 'string'){
            tagName = tag.name;
          }
          //tagName = readyStringToQuery(tagName);
          query = `SELECT TagId FROM Tag WHERE Name = ?;`;
          params = [tagName];
          tagSql = (await execute_query(serverName, query, params))[0];
          if(!tagSql){
            query = `INSERT INTO Tag (name)
              VALUES (?);`;
              tagSql = await execute_query(serverName, query, params);
            params = [ruleName, ruleUrl, ruleDesc];
            result.tags.push(tagSql.insertId);
          }
          websiteTags.push(tagSql.TagId ? tagSql.TagId : tagSql.insertId);
        }
        for(let tId of websiteTags){
          query = `SELECT * FROM TagApplication WHERE TagId = ? AND ApplicationId = ?;`;
          params = [tId, websiteId];
          tagApp = (await execute_query(serverName, query, params))[0];
          if(!tagApp){
            query = `INSERT INTO TagApplication (TagId, ApplicationId)
              VALUES (?, ?);`;
            params = [tId, websiteId];
            tagApp = await execute_query(serverName, query, params);
            result.tagApplications.push(tagApp.insertId);
          }
        }

        /* ---------- handle page ---------- */
        pageUrl = urlTested;

        query = `SELECT PageId FROM Page WHERE url = ?;`;
        params = [pageUrl];
        page = (await execute_query(serverName, query, params))[0];
        if (!page) {
        query = `INSERT INTO Page (url, creationdate, applicationid)
            VALUES (?, ?, ?);`;
          params = [pageUrl, assertionDate, (website.insertId || website.ApplicationId)];
          page = await execute_query(serverName, query, params);
          result.pages.push(page.insertId);
        }

        /* ---------- handle assertion ---------- */
        assertionMode = assertion["mode"];
        assertionOutcome = assertion.result["outcome"];
        assertionDesc = assertion.result["earl:description"] ? assertion.result["earl:description"] : null;

        query = `SELECT AssertionId FROM Assertion 
                  WHERE 
                  EvaluationToolId = ? AND
                  RuleId = ? AND
                  PageId = ? AND
                  Mode = ? AND
                  Date = ? AND
                  Description = ? AND
                  Outcome = ?;`;
        params = [(evaluationTool.insertId || evaluationTool.EvaluationToolId), 
                  (rule.insertId || rule.RuleId),
                  (page.insertId || page.PageId),
                  assertionMode, assertionDate, assertionDesc, assertionOutcome];
        assertionSQL = (await execute_query(serverName, query, params))[0];
        if (!assertionSQL) {
          query = `INSERT INTO Assertion (EvaluationToolId, RuleId, PageId, Mode, Date, Description, Outcome)
                  VALUES (?, ?, ?, ?, ?, ?, ?);`;
          assertionSQL = await execute_query(serverName, query, params);
          result.assertions.push(assertionSQL.insertId);
        }
      }
    }
  } catch (err) {
    console.log(err);
    await execute_query(serverName, 'ROLLBACK;');
    throw error(err);
  }
  await execute_query(serverName, 'COMMIT;');
  return success(result);
};

export { add_earl_report };
