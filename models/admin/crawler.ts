import * as fs from 'fs';
import { HEADLESS_PUPPETEER, SHEET_NAMES } from '../../util/constants';
import { IHashString } from '../../util/interfaces';
import { deleteFolderRecursive, getDomainEntryFromURL, prepareCrawlerFiles } from '../../util/util';

const Apify = require('apify');
const excelToJson = require('convert-excel-to-json');
const c = require('ansi-colors');
process.env.APIFY_LOCAL_STORAGE_DIR = "./apify_storage";

/* ***************************** CRAWLER ************************************
 * Accessibility Statements crawler, based on given homepages (first-level link search)
 * This script logs and stores found AS and failed domains and URLs 
 * ************************************************************************** */

// file needs to be in *lib* folder and include *file extension*
/* txt file
   > urls are splitted by lines, with no additional information
 * xlsx file
   > can have multiple sheets, but sheet names need to be listed in variable 'sheet_names'
   > sheets have 2 columns, where column A lists organization names and column B lists respective homepage URL
   > first row of every sheet are headers (first row is ignored, must not have data)
 * manual
   > used to crawl single URL
   > manually fill variable 'manual_url' below with desired URL 
*/
let urls_filetype = 0; // filetype: 0 - txt, 1 - xlsx, -1 - manual
const urls_filename = 'urls.txt';
const sheet_names = ['Sheet1'];
const manual_url = '';

Apify.main(async () => {
  deleteFolderRecursive('./apify_storage');
  prepareCrawlerFiles(urls_filetype);

  let domainMap: IHashString = {};
  const requestQueue = await Apify.openRequestQueue('crawler');

  let allLinks = prepareFileInput(domainMap);
  
  // Add listed links to crawler queue
  for(let link of allLinks){
    await requestQueue.addRequest({ url: link });
  }

  const crawler = await new Apify.PuppeteerCrawler({
    requestQueue,
    launchContext: {
      launchOptions: {   
        headless: HEADLESS_PUPPETEER
      }
    },
    maxConcurrency: 200,
    handlePageTimeoutSecs: 3*60,
    handlePageFunction: async ({ page, request, response } : {page: any, request: any, response: any}) => {
      let contentType = 'text/html';
      if((await response) !== null){
        contentType = await response.headers()['content-type'];
      }
      // Accept content-type if can't read response headers
      let validContentType = contentType === undefined ? true : (contentType.startsWith('text/html') || contentType.startsWith('text/xml'));

      // Get URL's domain 
      let url = page.url();
      let urlWithoutSlash = url.endsWith('/') ? url.slice(0,-1) : url;

      // Get domain info from domainMap
      let domainEntry = getDomainEntryFromURL(url, domainMap);

      let firstPage = domainEntry !== {} && domainEntry.firstLink;
      let foundAS = firstPage ? false : (domainEntry !== {} ? domainEntry.finished : false);
      console.log('► ' + url, foundAS ? c.bold.green('√') : c.bold.red('X'));

      if(validContentType){
        if(!foundAS){
          if (firstPage) {
            let protocolAndDomain = url.split('/').slice(0,3).join('/');
            // with this pseudoUrls, only get urls in the same domain and not one of these files
            let pseudoUrls = [new Apify.PseudoUrl(protocolAndDomain + '[(?!.*\.(css|jpg|jpeg|gif|svg|pdf|docx|js|png|ico|xml|mp4|mp3|mkv|wav|rss|php|json)).*]')];
            // enqueue existent links with page that match corresponding regex
            const infos = await Apify.utils.enqueueLinks({
              page,
              requestQueue,
              pseudoUrls
            });
            if(!(urlWithoutSlash.includes("acessibilidade") && urlWithoutSlash.match(new RegExp("[^.]acessibilidade")))){
              fs.appendFile('lib/crawl/firstLinks.txt', url + '\n', (err) => {
                if (err) console.log(err);
              });
            }
            domainMap[domainEntry.domain].firstLink = false;
          }

          // find AS using AS generators exclusive classes (portuguese and W3)
          const elemAS = await page.$('.mr.mr-e-name,.basic-information.organization-name');

          /* ----- workaround to portuguese AS not using generator ----- */
          const headings = await page.$$eval('H1,H2', (elems: any) => elems.map((elem: any) => [elem.tagName.toLowerCase(), elem.textContent.toLowerCase()]));
          let validPortugueseHeading = false;
          for(let i = 0; i < headings.length && !validPortugueseHeading; i++){
            validPortugueseHeading = headings[i] && 
              ((headings[i][0] === 'h1' && headings[i][1].trim() === 'Declaração de Acessibilidade'.toLowerCase()) ||
              (headings[i][0] === 'h2' && headings[i][1].trim() === 'I. Estado de conformidade'.toLowerCase()));
          }
          /* -----                                                 ----- */
          
          // If found AS
          if(!!elemAS || validPortugueseHeading){
            let className = !!elemAS ? await (await elemAS.getProperty("className")).jsonValue() : '';

            // if found AS is related to Portugal, store it in a different file
            if((!!className && className.includes('mr-e-name')) || validPortugueseHeading){
              let orgName = '', conformance = '';
              if(!!className && className.includes('mr-e-name')){
                orgName = await page.$eval('.capFL [name=siteurl],.capFL .siteurl', (el: any) => el.textContent);
                conformance = await page.$eval('.mr.mr-conformance-status', (el: any) => el.textContent);
              }
              // check if /acessibilidade is right after URL domain
              let splittedUrl = url.split('/');
              let acessibilidadeAfterDomain = splittedUrl.length > 3 && splittedUrl[3] === 'acessibilidade';
              let correctPortugueseURL = acessibilidadeAfterDomain ? 'sim' : 'não';
              let correctGeneratedAS = !!elemAS ? 'sim' : 'não';

              let csvLine = '';
              if(urls_filetype === 0){ // txt file
                csvLine = orgName+','+conformance+','+url+','+correctPortugueseURL+','+correctGeneratedAS+'\n'
              } else { // xlsx file
                csvLine = orgName+','+conformance+','+url+','+correctPortugueseURL+','+correctGeneratedAS+','+domainEntry.entityName+','+domainEntry.sampleName+'\n';
              }

              fs.appendFile('lib/crawl/portugueseAS.csv', csvLine, (err) => {
                if (err) console.log(err);
              });
            }
            
            // store acessibility statemente in this file, independent of AS generator
            domainMap[domainEntry.domain].finished = true;
            console.log(c.bold.green('√ '+request.url));
            fs.appendFile('lib/crawl/foundAS.txt', request.url + '\n', (err) => {
              if (err) console.log(err);
            });
          }
        }
      }
    },
    handleFailedRequestFunction: async ({ request, error } : {request: any, error: any}) => {
      // By manually inserting /acessibilidade links, there could be detected unnecessary errors
      // in this case, we want to avoid logging
      let domainEntry = getDomainEntryFromURL(request.url, domainMap);
      let urlWithoutSlash = request.url.endsWith('/') ? request.url.slice(0,-1) : request.url;

      if(!(urlWithoutSlash.endsWith('/acessibilidade') && domainEntry !== {} && domainEntry.firstLink)){
        console.log(c.bold.red('X ' + request.url));
        fs.appendFile('lib/crawl/failedLinks.csv', request.url+','+error.message+'\n', (err) => {
          if (err) console.log(err);
        });
      }
    },
  });
  let timeStart = new Date().getTime();
  await crawler.run();
  await requestQueue.drop();
  let hourDiff = new Date().getTime() - timeStart; //in ms
  let minDiff = hourDiff / 60 / 1000; //in minutes
  let hDiff = hourDiff / 3600 / 1000; //in hours
  let humanReadable = {hours: 0, minutes: 0};
  humanReadable.hours = Math.floor(hDiff);
  humanReadable.minutes = Number((minDiff - 60 * humanReadable.hours).toFixed(2));
  console.log(c.bold.green("CRAWLER FINISHED!"), humanReadable);
});

/* This function gets all URLS from specified file
   stores them in domainMap (IHashString{}) and allLinks (string[])
   and returns allLinks */
function prepareFileInput(domainMap: IHashString){
  let url: string, removedLastSlashURL: string, domain: string;
  let allLinks: string[] = [];

  switch(urls_filetype){
    case 0: // txt file
      let filedata = '';
      try {
        filedata = fs.readFileSync('lib/'+urls_filename, 'utf8');
      } catch (err) {
        console.error(err);
      }

      let splittedUrls = filedata.trim().split(/\r?\n/);
      for(let url of splittedUrls){
        removedLastSlashURL = url.endsWith('/') ? url.slice(0,-1) : url;
        domain = url.split('/')[2];
        if(Object.keys(getDomainEntryFromURL(url, domainMap)).length === 0){
          domainMap[domain] = {
            url: removedLastSlashURL,
            domain: domain,
            entityName: '',
            sampleName: '',
            firstLink: true,
            finished: false,
          }
        }
        allLinks.push(removedLastSlashURL);
        // manually add /acessibilidade to find AS faster (only in Portugal)
        let possibleAS = url.split('/').slice(0,3).join('/') + '/acessibilidade';
        if(!allLinks.includes(possibleAS))
          allLinks.push(possibleAS);
      }
      break;
    case 1: // xlsx file
    // Transforming excel into json object
    let workbook = excelToJson({
      sourceFile: 'lib/'+urls_filename,
      header: {
        rows: 1
      },
      columnToKey: {
        A: 'entidade',
        B: 'url',
      },
      sheets: SHEET_NAMES
    });

    // Navigate through all sheets
    for (let sheetName in workbook){
      for (let row of workbook[sheetName]){
        url = row['url'];
        removedLastSlashURL = url.endsWith('/') ? url.slice(0,-1) : url;
        domain = url.split('/')[2];
        allLinks.push(removedLastSlashURL);
        // manually add /acessibilidade to find AS faster (only in Portugal)
        let possibleAS = url.split('/').slice(0,3).join('/') + '/acessibilidade';
        if(!allLinks.includes(possibleAS))
          allLinks.push(possibleAS);
        
        if(Object.keys(getDomainEntryFromURL(url, domainMap)).length === 0){
          domainMap[domain] = {
            url: removedLastSlashURL,
            domain: domain,
            entityName: row['entidade'],
            sampleName: sheetName,
            firstLink: true,
            finished: false,
          }
        }
      }
    }
    break;
  default: // manual
    removedLastSlashURL = manual_url.endsWith('/') ? manual_url.slice(0,-1) : manual_url;
    domain = manual_url.split('/')[2];
    if(Object.keys(getDomainEntryFromURL(manual_url, domainMap)).length === 0){
      domainMap[domain] = {
        url: removedLastSlashURL,
        domain: domain,
        entityName: '',
        sampleName: '',
        firstLink: true,
        finished: false,
      }
    }
    allLinks.push(removedLastSlashURL);
    // manually add /acessibilidade to find AS faster (only in Portugal)
    let possibleAS = manual_url.split('/').slice(0,3).join('/') + '/acessibilidade';
    if(!allLinks.includes(possibleAS))
      allLinks.push(possibleAS);
    break;
  }
  return allLinks;
}