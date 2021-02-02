import { forEach } from "lodash";
import { add_earl_report } from "./report";
import { parse } from 'node-html-parser';
import { twitterRegex, emailRegex, telephoneRegex } from "../../util/constants";
import { setCharAt } from "../../util/util";
import { execute_query } from "../../database/database";
import { error, success } from "../../util/responses";
import { fetchDocument } from "./document";

/* Parse and insert Accessibility Statement into database */
const add_accessibility_statement = async (serverName: string, numLinks: number, formData: any, ...linksAndTexts: string[]) => {

  let statements: any[] = [];
  let linksRead: string[] = [];

  for(let i = 0; i < linksAndTexts.length; i++){
    if(numLinks > 0 && i <= numLinks - 1){
      if(linksAndTexts[i]){
        linksRead.push(linksAndTexts[i]);
      }
    } else {
      if(linksAndTexts[i]){
        statements.push(parse(linksAndTexts[i]));
      }
    }
  }

  let origin;
  let asUrl;
  let organization, orgName, orgElem, orgId;
  let name, nameElem;
  let appUrl, appUrlElem, appCountry, appId;
  let tagSql, appTags = [], tagApp;
  let state, stateString = "", stateElem;
  let date, dateElem;
  let standard, standardElem, standardText, standardNumber;
  let autoEvaluations, manualEvaluations, wwwcLinks;
  let sealElem, seal, sealEnum, sealText, sealTextElem;
  let phoneNumber: string[] = [], email: string[] = [], twitter: string[] = [],
      visitorAddress: string[] = [], postalAddress: string[] = [];
  let phoneElem, emailElem, extraContactsElem, visitorAddrElem, postalAddrElem, 
      allContactsElem, allContactsElemList; 
  let durResponse: string | null = null, durResponseElem;
  let earlReports: string[] = [];
  let effortsCounter = 0, effortsListElem;
  let limitationsCounter = 0, limitationsListElem;
  let compatabilitiesCounter = 0, incompatabilitiesCounter = 0, 
      compatabilitiesListElem, incompatabilitiesListElem;
  let technologiesUsed: string | null = "", technologiesListElem;
  let approachListElem, approach = '000';
  let contactsToAdd: number[] = [];
  let params;

  let results: any = {
    statements: [],
    applications: [],
    organizations: [],
    tags: [],
    tagApplications: [],
    contacts: [],
    ASContacts: [],
    failedLinks: [],
    reports: {}
  };

  let query: any;
  let application: any, asSQL: any, contact: any, ASContact: any;

  for(let i = 0; i < statements.length; i++){

      /* ---------- handle origin ---------- */
    if(formData.generator === null || formData.generator.trim() === ''){
      origin = 'unknown';
    } else {
      origin = formData.generator;
    }

    if(formData.org === null || formData.org.trim() === ''){
      /* ---------- handle organization name ---------- */
      orgElem = statements[i].querySelectorAll(".mr.mr-e-name");
      if(orgElem.length){
        /*lowFl - let orgSiblingIndex = orgElem[0].parentNode.childNodes.indexOf(orgElem[0]) + 2;
        organization = orgElem[0].parentNode.childNodes[orgSiblingIndex].text;*/
        orgName = orgElem[0].childNodes[0].text;
      } else {
        orgElem = statements[i].querySelectorAll(".basic-information.organization-name");
        if(orgElem.length){
          orgName = orgElem[0].text;
        }
      }
    } else {
      orgName = formData.org;
    }

    /* ---------- handle application name ---------- */
    if(formData.appName === null || formData.appName.trim() === ''){
      nameElem = statements[i].querySelectorAll(".mr.mr-t-desc");
      if(nameElem.length){
        name = nameElem[0].childNodes[0].text;
      } else {
        nameElem = statements[i].querySelectorAll(".basic-information.website-name");
        if(nameElem.length){
          name = nameElem[0].text;
        }
      }
    } else {
      name = formData.appName;
    }

    /* ---------- handle application url ---------- */
    if(formData.appUrl === null || formData.appUrl.trim() === ''){
      appUrlElem = statements[i].querySelectorAll("[name=siteurl]");
      if(appUrlElem.length){
        appUrl = appUrlElem[0].getAttribute('href');
      } else {
        // todo w3c generator doesnt have the link element even having an input field to app's url
        appUrl = null
      }
    } else {
      appUrl = formData.appUrl;
    }

    /* ---------- handle conformance state ---------- */
    stateElem = statements[i].querySelectorAll("[name=conformance-output]");
    if(stateElem.length){
      stateString = stateElem[0].text.toLowerCase();
    } else {
      stateElem = statements[i].querySelectorAll(".basic-information.conformance-status");
      if(stateElem.length){
        stateString = stateElem[0].text.toLowerCase();
      }
    }
    switch(stateString){
      case 'não conforme':
      case 'non conformant':
        state = 1;
        break;
      case 'parcialmente conforme':
      case 'partially conformant':
        state = 2;
        break;
      case 'plenamente conforme':
      case 'fully conformant':
        state = 3;
        break;
      default:
        state = 0;
        break;
    }

    /* ---------- handle AS date ---------- */
    dateElem = statements[i].querySelectorAll(".mr.mr-date");
    if(dateElem.length){
      date = dateElem[0].text;
    } else {
      dateElem = statements[i].querySelectorAll(".basic-information.statement-created-date");
      if(dateElem.length){
        date = dateElem[0].text;
      }
    }
    

    /* ---------- handle standard ---------- */
    standardElem = statements[i].querySelectorAll(".basic-information.conformance-standard");
    if(standardElem.length){
      /* W3 AS generator */
      //standardText = standardElem[0].text;
      standardText = standardElem[0].childNodes[0].text;
      //standardText = standardText.substring(0, standardText.length - 1);
      standardNumber = standardText.split(" ")[1];
      if(standardNumber === "2.1" || standardNumber === "2.0"){
        standard = standardNumber;
      } else {
        standard = "other";
      }
    } else {
      if(origin === 'govpt'){
        standard = "2.0";
      } else {
        standard = "unknown";
      }
    }

    /* ---------- handle earl report links ---------- */
    autoEvaluations = statements[i].querySelectorAll(".mr.mr-automatic-summary");
    manualEvaluations = statements[i].querySelectorAll(".mr.mr-manual-summary");
    wwwcLinks = statements[i].querySelectorAll(".technical-information.related-evidence");

    let linksFound = findChildrenLinks(autoEvaluations, manualEvaluations, wwwcLinks);
    for(let i = 0; i < linksFound.length; i++){
      try {
        const document = await fetchDocument(linksFound[i]);
        earlReports.push((<any>document).result);
      } catch(err) {
        if(!results.failedLinks.includes(linksFound[i]))
          results.failedLinks.push(linksFound[i]);
      }
    }
    
    /* ---------- handle accessibility seal - Portuguese AS generator ---------- */
    sealElem = statements[i].querySelectorAll(".mr.mr-seal");
    if(sealElem.length){
      seal = sealElem[0].text.toLowerCase();
      switch(seal){
        case 'ouro':
          sealEnum = 3;
          break;
        case 'prata':
          sealEnum = 2;
          break;
        case 'bronze':
          sealEnum = 1;
          break;
        default:
          sealEnum = 0;
          break;
      }
    } else {
      sealEnum = 0;
    }

    sealTextElem = statements[i].querySelectorAll("#accstmnt_additional_evidence_summary");
    if(sealTextElem.length){
      sealText = sealTextElem[0].text;
    }

    /* ---------- handle contacts - W3C AS generator ---------- */
    phoneElem = statements[i].querySelectorAll(".phone-number.p-tel");
    if(phoneElem.length){
      phoneNumber.push(phoneElem[0].text);
    }
    emailElem = statements[i].querySelectorAll(".email.u-email");
    if(emailElem.length){
      email.push(emailElem[0].text);
    }
    visitorAddrElem = statements[i].querySelectorAll(".visitor-address.p-extended-address");
    if(visitorAddrElem.length){
      visitorAddress.push(visitorAddrElem[0].text);
    }
    postalAddrElem = statements[i].querySelectorAll(".postal-address.p-adr");
    if(postalAddrElem.length){
      postalAddress.push(postalAddrElem[0].text);
    }
    extraContactsElem = statements[i].querySelectorAll(".contact-other.p-note");
    if(extraContactsElem.length){
      twitter.push(...extraContactsElem[0].text.match(twitterRegex));
    }

    durResponseElem = statements[i].querySelectorAll(".feedback.responsetime");
    if(durResponseElem.length){
      durResponse = durResponseElem[0].text;
    }

    /* ---------- handle contacts - Portuguese AS generator ---------- */
    allContactsElem = statements[i].querySelectorAll('#accstmnt_orginfo_contacts_summary');
    if(allContactsElem.length){
      allContactsElemList = allContactsElem[0].querySelectorAll('dd');
      if(allContactsElemList.length){
        forEach(allContactsElemList, (elem => {
          if(elem.text.match(emailRegex)){
            email.push(elem.text);
          } else if(elem.text.match(twitterRegex)){
            twitter.push(elem.text);
          } else if(elem.text.match(telephoneRegex)){
            phoneNumber.push(elem.text);
          } else{
            visitorAddress.push(elem.text);
          } 
        }));
      }
    }

    /* ---------- handle efforts - Portuguese AS generator ---------- */
    effortsListElem = statements[i].querySelectorAll('.organizational-effort.accessibility-measures');
    if(effortsListElem.length){
      for(let child of effortsListElem[0].childNodes){
        if(child.tagName){
          effortsCounter++;
        }
      };
    }
    
    /* ---------- handle limitations ---------- */
    /* Portuguese AS generator */
    limitationsListElem = statements[i].querySelectorAll('#non-conformance-sections');
    if(limitationsListElem.length){
      for(let child of limitationsListElem[0].childNodes){
        if(child.tagName){
          limitationsCounter++;
        }
      };
    } else {
      /* W3 AS generator */
      limitationsListElem = statements[i].querySelectorAll('.technical-information.accessibility-limitations');
      if(limitationsListElem.length){
        for(let child of limitationsListElem[0].childNodes){
          if(child.tagName){
            limitationsCounter++;
          }
        };
      }
    }

    /* ---------- handle technologies - W3 generator ---------- */
    technologiesListElem = statements[i].querySelectorAll('.technical-information.technologies-used');
    if(technologiesListElem.length){
      for(let tech of technologiesListElem[0].childNodes){
        if(tech.tagName && technologiesUsed){
          technologiesUsed = technologiesUsed.concat(tech.text.replace(';',','), ';');
        }
      };
    }
    // to remove final dot
    if(technologiesUsed && technologiesUsed.length > 1){
      technologiesUsed = technologiesUsed.substring(0, technologiesUsed.length - 1);
    }

    /* ---------- handle compatabilities - W3 generator ---------- */
    compatabilitiesListElem = statements[i].querySelectorAll('.technical-information.technologies-used');
    if(compatabilitiesListElem.length){
      for(let child of compatabilitiesListElem[0].childNodes){
        if(child.tagName){
          compatabilitiesCounter++;
        }
      };
    }

    /* ---------- handle incompatabilities - W3 generator ---------- */
    incompatabilitiesListElem = statements[i].querySelectorAll('.technical-information.technologies-used');
    if(incompatabilitiesListElem.length){
      for(let child of incompatabilitiesListElem[0].childNodes){
        if(child.tagName){
          incompatabilitiesCounter++;
        }
      };
    }

    /* ---------- handle accessment approach - W3 generator ---------- */
    approachListElem = statements[i].querySelectorAll('.technical-information.technologies-used');
    if(approachListElem.length){
      for(let child of approachListElem[0].childNodes){
        if(child.tagName){
          switch(child.text.toLowerCase()){
            case 'self-evaluation':
              approach = setCharAt(approach, 2, '1');
              break;
            case 'external evaluation':
              approach = setCharAt(approach, 1, '1');
              break;
            default:
              approach = setCharAt(approach, 0, '1');
              break;
          }
        }
      };
    }
    
    if(date === undefined || isNaN((new Date(date)).valueOf())){
      date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else {
      date = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    }

    appCountry = formData.country ? formData.country.id : null;

    origin = origin === undefined ? 'unknown' : origin;
    asUrl = linksRead[i] === undefined ? null : linksRead[i];
    standard = standard === undefined ? 'unknown' : standard;
    sealText = sealText === undefined ? null : sealText;
    technologiesUsed = technologiesUsed === null ? null : technologiesUsed;

    durResponse = durResponse === null ? null : durResponse; 

    try {
      await execute_query(serverName, 'SET autocommit = 0; START TRANSACTION;');
      query = `SELECT OrganizationId FROM Organization WHERE name = ?;`;
      params = [orgName];
      organization = (await execute_query(serverName, query, params))[0];
      if (!organization) {
        query = `INSERT INTO Organization (name)
          VALUES (?);`;
        organization = await execute_query(serverName, query, params);
        results.organizations.push(organization.insertId);
      }
      orgId = organization.OrganizationId ? organization.OrganizationId : organization.insertId;

      query = `SELECT ApplicationId FROM Application WHERE name = ? AND OrganizationId = ?;`;
      params = [name, orgId];
      application = (await execute_query(serverName, query, params))[0];
      if (!application) {
        query = `INSERT INTO Application (name, organizationid, type, sector, url, creationdate, countryid)
          VALUES (?, ?, ?, ?, ?, ?, ?);`;
        params = [name, orgId, formData.type, formData.sector, appUrl, date, appCountry];
        application = await execute_query(serverName, query, params);
        results.applications.push(application.insertId);
      }
      appId = application.ApplicationId ? application.ApplicationId : application.insertId;

      for(let tag of formData.tags){
        let tagName = tag;
        if(typeof tag !== 'string'){
          tagName = tag.name;
        }
        query = `SELECT TagId FROM Tag WHERE name = ?;`;
        params = [tagName];
        tagSql = (await execute_query(serverName, query, params))[0];
        if(!tagSql){
          query = `INSERT INTO Tag (name)
            VALUES (?);`;
          tagSql = await execute_query(serverName, query, params);
          results.tags.push(tagSql.insertId);
        }
        appTags.push(tagSql.TagId ? tagSql.TagId : tagSql.insertId);
      }
      for(let tId of appTags){
        query = `SELECT * FROM TagApplication WHERE TagId = ? AND ApplicationId = ?;`;
        params = [tId, appId];
        tagApp = (await execute_query(serverName, query, params))[0];
        if(!tagApp){
          query = `INSERT INTO TagApplication (TagId, ApplicationId)
            VALUES (?, ?);`;
          tagApp = await execute_query(serverName, query, params);
          results.tagApplications.push([tId, appId]);
        }
      }

      // todo fix from:file
      if(asUrl === null){
        query = `SELECT ASId FROM AccessibilityStatement 
                    WHERE 
                    Origin = ? AND
                    ApplicationId = ? AND
                    Standard = ? AND
                    Date = ? AND
                    State = ? AND
                    UsabilityStamp = ? AND
                    UsabilityStampText = ? AND
                    LimitationsWithoutAltCounter = ? AND
                    CompatabilitiesCounter = ? AND
                    IncompatabilitiesCounter = ? AND
                    TechnologiesUsed = ? AND
                    AccessmentApproach = ?;`;
        params = [origin, appId, standard, date, state.toString(), sealEnum.toString(), sealText, limitationsCounter, compatabilitiesCounter, incompatabilitiesCounter, technologiesUsed, approach];
      } else {
        query = `SELECT ASId FROM AccessibilityStatement 
                    WHERE
                    ASUrl = ?;`;
        params = [asUrl];
      }
      asSQL = (await execute_query(serverName, query, params))[0];
      if (!asSQL) {
        query = `INSERT INTO AccessibilityStatement (Origin, ASUrl, ApplicationId, Standard, Date, State, UsabilityStamp, UsabilityStampText, 
                LimitationsWithoutAltCounter, CompatabilitiesCounter, IncompatabilitiesCounter, TechnologiesUsed, AccessmentApproach)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
        params = [origin, asUrl, appId, standard, date, state.toString(), sealEnum.toString(), sealText, limitationsCounter, compatabilitiesCounter, incompatabilitiesCounter, technologiesUsed, approach];
        asSQL = await execute_query(serverName, query, params);
        results.statements.push(asSQL.insertId);
      }

      for(let phone of phoneNumber){
        query = `SELECT ContactId FROM Contact WHERE type = "phone" AND contact = ?;`;
        params = [phone];
        contact = (await execute_query(serverName, query, params))[0];
        if (!contact) {
          query = `INSERT INTO Contact (type, contact)
            VALUES ("phone", ?);`;
          contact = await execute_query(serverName, query, params);
          results.contacts.push(contact.insertId);
        }
        contactsToAdd.push(contact.ContactId || contact.insertId);
      }
      for(let emailAddr of email){
        query = `SELECT ContactId FROM Contact WHERE type = "email" AND contact = ?;`;
        params = [emailAddr];
        contact = (await execute_query(serverName, query, params))[0];
        if (!contact) {
          query = `INSERT INTO Contact (type, contact, durationresponse)
            VALUES ("email", ?, ?);`;
          params = [emailAddr, durResponse];
          contact = await execute_query(serverName, query, params);
          results.contacts.push(contact.insertId);
        }
        contactsToAdd.push(contact.ContactId || contact.insertId);
      }
      for(let visitorAddr of visitorAddress){
        query = `SELECT ContactId FROM Contact WHERE type = "visitorAdress" AND contact = ?;`;
        params = [visitorAddr];
        contact = (await execute_query(serverName, query, params))[0];
        if (!contact) {
          query = `INSERT INTO Contact (type, contact)
            VALUES ("visitorAdress", ?);`;
          contact = await execute_query(serverName, query, params);
          results.contacts.push(contact.insertId);
        }
        contactsToAdd.push(contact.ContactId || contact.insertId);
      }
      for(let postalAddr of postalAddress){
        query = `SELECT ContactId FROM Contact WHERE type = "postalAdress" AND contact = ?;`;
        params = [postalAddr];
        contact = (await execute_query(serverName, query, params))[0];
        if (!contact) {
          query = `INSERT INTO Contact (type, contact)
            VALUES ("postalAdress", ?);`;
          contact = await execute_query(serverName, query, params);
          results.contacts.push(contact.insertId);
        }
        contactsToAdd.push(contact.ContactId || contact.insertId);
      }
      for(let twitterAt of twitter){
        query = `SELECT ContactId FROM Contact WHERE type = "twitter" AND contact = ?;`;
        params = [twitterAt];
        contact = (await execute_query(serverName, query, params))[0];
        if (!contact) {
          query = `INSERT INTO Contact (type, contact, durationresponse)
            VALUES ("twitter", ?, ?);`;
            params = [twitterAt, durResponse];
          contact = await execute_query(serverName, query, params);
          results.contacts.push(contact.insertId);
        }
        contactsToAdd.push(contact.ContactId || contact.insertId);
      }
      for(let con of contactsToAdd){
        query = `SELECT * FROM AcceStatContact WHERE ASId = ? AND ContactId = ?;`;
        params = [(asSQL.insertId || asSQL.ASId), con];
        ASContact = (await execute_query(serverName, query, params))[0];
        if (!ASContact) {
          query = `INSERT INTO AcceStatContact (ASId, ContactId) VALUES (?, ?);`
          ASContact = await execute_query(serverName, query, params);
          results.ASContacts.push([(asSQL.insertId || asSQL.ASId), con]);
        }
      }
      results.reports = (await add_earl_report(serverName, formData, ...earlReports)).result;
    } catch (err){
      console.log(err);
      await execute_query(serverName, 'ROLLBACK;');
      throw error(err);
    }
  }
  await execute_query(serverName, 'COMMIT;');
  return success(results);
}

/* Find children links
 * mainly used to find EARL reports */
function findChildrenLinks(...evaluations: NodeListOf<Element>[]): string[] {
  let aElements, href;
  let earlReportsLinks: string[] = [];

  forEach(evaluations, (evaluation => {
    forEach(evaluation, (element => {
      if(element.tagName === 'a'){
        href = element.getAttribute('href');
        if(href && /^https?:\/\/.*\.json$/.test(href)){
          if(!earlReportsLinks.includes(href))
            earlReportsLinks.push(href);
        }
      } else {
        aElements = element.querySelectorAll('a');
        forEach(aElements, (a => {
          href = a.getAttribute('href');
          if(href && /^https?:\/\/.*\.json$/.test(href)){
            if(!earlReportsLinks.includes(href))
              earlReportsLinks.push(href);
          }
        }));
      }
    }));
  }));

  return earlReportsLinks;
}

export { add_accessibility_statement };