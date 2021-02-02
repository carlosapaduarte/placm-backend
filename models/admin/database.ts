import { success, error } from "../../util/responses";
import { execute_query } from "../../database/database";
import { DB_NAMES, RULES_JSON, ELEMENT_TYPES, COUNTRY_JSON, WCAG21_JSON, CONSTELLATIONS_JSON, PROTODATA_JSON, ELEMENT_TYPES_LOCATION } from "../../util/constants";
import { map } from "lodash";
import * as fs from 'fs';
import { randomString } from "../../util/util";
const randomWords = require('random-words');

/* Truncate a single or multiple tables, given its  */
const truncate_tables = async (serverName: string, ...tableNames: string[]): Promise<boolean> => {

  // bit risky, pay attention to where you use this function!!!

  let query = 'SET FOREIGN_KEY_CHECKS = 0;';
  try{
    // you can not parameterize table names,
    // so these names need to be concatened to the query string
    for(let i of tableNames){
      query += `TRUNCATE TABLE ` + i + `;`;
    }
    query += 'SET FOREIGN_KEY_CHECKS = 1;'
    await execute_query(serverName, query);
  } catch (err) {
    console.log(err);
    return false;
  }
  return true;
}

/* Reset database (used in administration page)
 * Clear all tables except where static information is stored */
const reset_database = async (serverName: string) => {
  let query;
  const dbName: string = DB_NAMES[serverName];
  try {
    await execute_query(serverName, 'SET autocommit = 0; START TRANSACTION;');
    // get all table names except those 5
    query = `SELECT 
    CONCAT('TRUNCATE TABLE ',TABLE_NAME,';') AS truncateCommand
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME NOT IN ("Country", "Continent", "Rule", "SuccessCriteria", "RuleSuccessCriteria", "ElementType", "RuleElementType");
    `;
    let truncates = await execute_query(serverName, query, [dbName]);

    // deleting all content from tables
    query = `SET FOREIGN_KEY_CHECKS=0;\n\n`;
    for(let trunc of truncates){
      query = query + trunc.truncateCommand + '\n';
    }
    query = query + `\nSET FOREIGN_KEY_CHECKS=1;`;
    await execute_query(serverName, query, [dbName]);

  } catch (err){
    console.log(err);
    await execute_query(serverName, 'ROLLBACK;');
    return error(err);
  }
  await execute_query(serverName, 'COMMIT;');
  return success(true); 
}

/* Insert (by truncating first) Rule, RuleSuccessCriteria, ElementType and RuleElementType tables
 * according to RULES_JSON and ELEMENT_TYPES values */
const insert_rules_element_type = async (serverName: string) => {

  try {
    await truncate_tables(serverName, `Rule`, `ElementType`, `RuleElementType`, `RuleSuccessCriteria`);
  } catch (err) {
    console.log(err);
    throw error(err);
  }

  let i = 1;
  let mappings: string[] = [];
  let types: string[] = [];
  let query, queryParams = [];

  try {
    for await (let r of Object.values(RULES_JSON)) {
      if(r.metadata){
        if(!mappings.includes(r.mapping)){
          mappings.push(r.mapping);
          query = `INSERT INTO Rule (Mapping, Name, Url, Description) VALUES (?, ?, ?, ?);`;
          await execute_query(serverName, query, [r.mapping, r.name, r.metadata.url, r.description]);
          if(r['metadata']['success-criteria'].length){
            query = '';
            queryParams = [];
            for(let sc of r['metadata']['success-criteria']){
              query += `INSERT INTO RuleSuccessCriteria (RuleId, SCId) VALUES (?, ?);`;
              queryParams.push(i, sc.name);
            }
            await execute_query(serverName, query, queryParams);
          }
          i++;
        }
      }
    }

    i = 1;
    query = '';
    queryParams = [];
    for (let e of Object.values(ELEMENT_TYPES)){
      if(e.type){
        if(!types.includes(e.type)){
          types.push(e.type);
          query += `INSERT INTO ElementType (TypeId, Name) VALUES (?, ?);`;
          queryParams.push(i, e.type);
          i++;
        }
        query += `INSERT INTO RuleElementType (RuleId, TypeId) VALUES (?, ?);`;
        queryParams.push(mappings.indexOf(e.mapping) + 1, types.indexOf(e.type) + 1);
      }
    }
    await execute_query(serverName, query, queryParams);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

/* Insert (by truncating first) Continent and Country tables
 * according to COUNTRY_JSON values */
const insert_countries = async (serverName: string) => {

  try {
    await truncate_tables(serverName, `Continent`, `Country`);
  } catch (err) {
    console.log(err);
    throw error(err);
  }

  let query = '';
  let queryParams = [];
  let continents: string[] = [];

  try {
    for (let c of Object.values(COUNTRY_JSON)) {
      if(c.continent){
        if(!continents.includes(c.continent)){
          query += `INSERT INTO Continent (name) VALUES (?);`;
          continents.push(c.continent);
          queryParams.push(c.continent);
        }
        query += `INSERT INTO Country (name, continentId) VALUES (?, ?);`;
        queryParams.push(c.country, continents.indexOf(c.continent)+1);
      }
    }
    await execute_query(serverName, query, queryParams);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

/* Insert (by truncating first) SuccessCriteria table
 * according to WCAG21_JSON values */
const insert_success_criteria = async (serverName: string) => {

  try {
    await truncate_tables(serverName, `SuccessCriteria`);
  } catch (err) {
    console.log(err);
    throw error(err);
  }

  let query = '';
  let queryParams = [];
  try {
    for (let p of Object.values(WCAG21_JSON['principles'])) {
      let guidelines = p['guidelines'];
      for (let g of Object.values(guidelines)){
        for (let s of <any> Object.values(g['successcriteria'])){
          let initialUrl = 'https://www.w3.org/WAI/WCAG21/Understanding/';
          let preparingUrl = s['handle'].replace(/\(/g,'').replace(/\)/g,'').replace(/\,/g,'').replace(/ /g,'-').toLowerCase();
          let url = initialUrl + preparingUrl;
          query += `INSERT INTO SuccessCriteria (SCId, Name, Principle, Level, Url) VALUES (?, ?, ?, ?, ?);`;
          queryParams.push(s.num, s.handle, p.handle, s.level, url);
        }
      }
    }
    await execute_query(serverName, query, queryParams);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

/* Insert every static information at once into the database
 * Rules, Element Types, Success criteria, Continents, Countries
 * and its relations */
const prepare_database = async (serverName: string) => {

  try {
    await insert_countries(serverName);
    await insert_success_criteria(serverName);
    await insert_rules_element_type(serverName);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

/* Insert protodata into the database
 * ATTENTION: database must be prepared before!!! */
const add_protodata = async (serverName: string) => {
  let result: any = {
    tags: [],
    evaluationTools: [],
    rules: [],
    applications: [],
    organizations: [],
    pages: [],
    assertions: [],
    tagApps: []
  };

  let query;
  let tag, evalTool, app, page, assertion, tagapp, url;
  const numberApps = 20;
  const numberPages = 50;
  const numberAssertions = 5;
  let queryParams = [];

  for(let entry of Object.values(PROTODATA_JSON)){
    queryParams.push(entry['name']);
    switch(entry['type']){
      case 'Tag':
          query = `SELECT TagId FROM Tag WHERE name = ?;`;
          tag = (await execute_query(serverName, query, queryParams))[0];
          if (!tag) {
            query = `INSERT INTO Tag (name)
                VALUES (?);`;
            tag = await execute_query(serverName, query, queryParams);
            result.tags.push(tag.insertId);
          };
          break;
        case 'EvaluationTool':
          query = `SELECT EvaluationToolId FROM EvaluationTool WHERE name = ?;`;
          evalTool = (await execute_query(serverName, query, queryParams))[0];
          if (!evalTool) {
            if(entry['data1'] === ''){
              url = null;
            } else {
              url = '"' + entry['data1'] + '"';
            }
            query = `INSERT INTO EvaluationTool (name, url, description, version)
                VALUES (?, ?, ?, ?);`;
            queryParams.push(url, entry['data2'], entry['data3']);
            evalTool = await execute_query(serverName, query, queryParams);
            result.evaluationTools.push(evalTool.insertId);
          };
          break;
        default:
          break;
    }
  }

  let appName, appUrl, appDate, appId;
  let organization;
  let tagId;
  let evaluationToolId;
  let pageUrl, pageId;
  let assertionDesc, assertionOutcome;
  let outcomes = ['passed', 'failed', 'cantTell', 'inapplicable', 'untested'];
  let orgsExtensions = ['Corp.', 'Org.', 'Inc.'];
  let possibleAppNames = map(CONSTELLATIONS_JSON, 'name');

  for(let i = 0; i < numberApps; i++) {
    // Application
    let randomIndex = Math.floor(Math.random()*possibleAppNames.length);
    appName = possibleAppNames[randomIndex];
    possibleAppNames.splice(randomIndex, 1);

    appUrl = "http://www." + randomString(10,'a') + '.com';
    appDate = '2020-0' + (Math.floor(Math.random()*9)+1).toString()
         + '-'
         + Math.floor(Math.random()*3).toString()
         + (Math.floor(Math.random()*9)+1).toString()
         + ' 00:00:00';
    query = `SELECT ApplicationId FROM Application WHERE name = ?;`;
    app = (await execute_query(serverName, query, [appName]))[0];
    if (!app) {
      let organizationName = randomWords({ exactly: 1 })[0];
      organizationName = organizationName.charAt(0).toUpperCase() + organizationName.slice(1);
      organizationName = organizationName + ' ' + orgsExtensions[Math.floor(Math.random()*3)];
      query = `SELECT OrganizationId FROM Organization WHERE name = ?;`;
      organization = (await execute_query(serverName, query, [organizationName]))[0];
      if(!organization){
        query = `INSERT INTO Organization (name) VALUES (?);`;
          organization = await execute_query(serverName, query, [organizationName]);
        result.organizations.push(organizationName);
      }
      query = `INSERT INTO Application (name, organizationid, type, sector, url, creationdate, countryid) VALUES (?,?,?,?,?,?,?);`;
      queryParams = [appName, organization.OrganizationId ? organization.OrganizationId : organization.insertId, "0", Math.floor(Math.random()*2),
                    appUrl, appDate, Math.floor(Math.random()*243)+1];
      app = await execute_query(serverName, queryParams);
      result.applications.push(app.insertId);
    };
    appId = app.insertId || app.ApplicationId;

    // TagApplication
    tagId = Math.floor(Math.random()*4)+1;
    query = `SELECT TagId FROM TagApplication WHERE 
              TagId = ? AND
              ApplicationId = ?;`;
    tagapp = (await execute_query(serverName, query, [tagId, appId]))[0];
    if (!tagapp) {
      query = `INSERT INTO TagApplication (TagId, ApplicationId)
          VALUES (?, ?);`;
        tagapp = await execute_query(serverName, query, [tagId, appId]);
      result.tagApps.push([tagId, appId]);
    };

    evaluationToolId = Math.floor(Math.random()*3)+1;

    // Page
    for(let j = 0; j < Math.floor(Math.random()*numberPages)+200; j++) {
      pageUrl = appUrl + '/' + randomString(10);
      query = `SELECT PageId FROM Page WHERE url = ?;`;
      page = (await execute_query(serverName, query, [pageUrl]))[0];
      if (!page) {
        query = `INSERT INTO Page (url, creationdate, applicationid)
            VALUES (?,?,?);`;
        page = await execute_query(serverName, query, [pageUrl, appDate, appId]);
        result.pages.push(page.insertId);
      };
      pageId = page.insertId || page.PageId;

      // Assertion
      for(let r = 1; r <= numberAssertions; r++) {
        let ruleId = Math.floor(Math.random() * 66) + 1;
        assertionDesc = randomString(15,'a');
        assertionOutcome = outcomes[Math.floor(Math.random()*5)];

        query = `SELECT AssertionId FROM Assertion WHERE 
              evaluationtoolid = "$evaluationToolId}" AND
              ruleid = ? AND
              pageid = ? AND
              mode = "automatic" AND
              date = ?;`;
        assertion = (await execute_query(serverName, query, [ruleId, pageId, appDate]))[0];
        if (!assertion) {
          query = `INSERT INTO Assertion (evaluationtoolid, ruleid, pageid, mode, date, description, outcome)
              VALUES (?,?,?,?,?,?,?);`;
          queryParams = [evaluationToolId, ruleId, pageId, "automatic", appDate, assertionDesc, assertionOutcome];
          assertion = await execute_query(serverName, query, queryParams);
          result.assertions.push(assertion.insertId);
        };
      }
    }
  }
  return success(result);
};

/* Function to build ELEMENT_TYPES file 
 * based on rules' mapping or text within its title */
const element_types_json = () => {
  let result = "[";
  let exceptions = ['80f0bf','4c31df','aaa1bf','59796f'];
  for(let r of Object.values(RULES_JSON)){
    if(exceptions.includes(r.mapping)){
      if(r.mapping == '59796f'){
        result = result + '\n  {\n    ';
        result = result + '"mapping":"' + r.mapping + '",\n    "type":"image"\n  },';
        result = result + '\n  {\n    ';
        result = result + '"mapping":"' + r.mapping + '",\n    "type":"button"\n  },';
      } else {
        result = result + '\n  {\n    ';
        result = result + '"mapping":"' + r.mapping + '",\n    "type":"audio"\n  },';
        result = result + '\n  {\n    ';
        result = result + '"mapping":"' + r.mapping + '",\n    "type":"video"\n  },';
      }
    } else if (r.name) {
      result = result + '\n  {\n    ';
      result = result + '"mapping":"' + r.mapping + '",\n    "type":"';
      if(r.name.toLowerCase().includes('iframe')){
        result = result + 'iframe"\n  },';
      } else if (r.name.toLowerCase().includes('button')){
        result = result + 'button"\n  },';
      } else if (r.name.toLowerCase().includes('autocomplete')){
        result = result + 'input"\n  },';
      } else if (r.name.toLowerCase().includes('link')){
        result = result + 'link"\n  },';
      } else if (r.name.toLowerCase().includes('heading')){
        result = result + 'heading"\n  },';
      } else if (r.name.toLowerCase().includes('video')){
        result = result + 'video"\n  },';
      } else if (r.name.toLowerCase().includes('lang')){
        result = result + 'lang"\n  },';
      } else if (r.name.toLowerCase().includes('meta')){
        result = result + 'meta"\n  },';
      } else if (r.name.toLowerCase().includes('object')){
        result = result + 'object"\n  },';
      } else if (r.name.toLowerCase().includes('title')){
        result = result + 'title"\n  },';
      } else if (r.name.toLowerCase().includes('table')){
        result = result + 'table"\n  },';
      } else if (r.name.toLowerCase().includes('focusable element')){
        result = result + 'other"\n  },';
      } else if (r.name.toLowerCase().includes('audio element')){
        result = result + 'audio"\n  },';
      } else if (r.name.toLowerCase().includes('image') || r.name.toLowerCase().includes('svg')){
        result = result + 'image"\n  },';
      } else if (r.name.toLowerCase().includes('form control') || r.name.toLowerCase().includes('form field')){
        result = result + 'form"\n  },';
      } else if (r.name.toLowerCase().includes('aria') || r.name.toLowerCase().includes('visible label') || r.name.toLowerCase().includes('role attribute')){
        result = result + 'aria"\n  },';
      } else if (r.name.toLowerCase().includes('attribute is not') || r.name.toLowerCase().includes('id attribute')){
        result = result + 'attributes"\n  },';
      } else if (r.name.toLowerCase().includes('css') || r.name.toLowerCase().includes('contrast') || r.name.toLowerCase().includes('scrollable')){
        result = result + 'css"\n  },';
      }
    }
  }
  result = result.substring(0, result.length - 1);
  result = result + "\n]";
  fs.writeFileSync(ELEMENT_TYPES_LOCATION, result);
}

export { reset_database, prepare_database, add_protodata,
  insert_rules_element_type, insert_countries, insert_success_criteria,
  element_types_json };
