import * as fs from 'fs';
import { trim } from "lodash";
import path from "path";

const Apify = require('apify');
const excelToJson = require('convert-excel-to-json');
const c = require('ansi-colors');

/* Accessibility Statements crawler, based on domains from given excel files 
 * This function does not return anything 
 * Instead logs and stores found AS and failed domains and URLs */
async function crawl_from_excel() {

  let linksWithAS: string[][] = [];

  // Transforming excel into json object
  let workbook = excelToJson({
    sourceFile: 'lib/urls_crawler.xlsx',
    header: {
      rows: 1
    },
    columnToKey: {
      A: 'entity',
      B: 'old_url',
      C: 'new_url',
      D: 'changed',
      E: 'test',
    },
    sheets: ['Mapa']
  });

  let index = 0;
  let textDocument: string;
  let html: any;
  let urls: string[] = [];
  let excelLinks: string = "";

  for (let sheet in workbook){
    for (let row of workbook[sheet]){
      //excelLinks = excelLinks + trim(row['new_url']) + '\n';
      //excelLinks = excelLinks + trim(row['old_url']) + '\n';
      excelLinks = excelLinks + trim(row['test']) + '\n';
    }
  }

  /*fs.writeFile('lib/new_urls.txt', excelLinks, (err) => {
    if (err) console.log(err);
    console.log('New urls saved!');
  });

  let newurls: string[] | null;
  newurls = await new Promise((resolve, reject) => {
    fs.readFile('lib/new_urls.txt', function (err, data) {
      if (err) {
        resolve(null);
      }
      resolve(data.toString());
    });
  });*/

  excelLinks = excelLinks.trim();
  let splittedLinks = excelLinks.split('\n');
  process.env.APIFY_LOCAL_STORAGE_DIR = "./apify_storage";
  let HEADLESS_PUPPETEER = true;
  const requestQueue = await Apify.openRequestQueue('crawler');
  for await(let link of splittedLinks){
    await requestQueue.addRequest({ url: link });
  }
  let firstPage = true;
  let foundAS = false;
  let mapFinishedData: IHashString = {};
  const firstLineCSV = 'nome,declaracao,conformidade\n';

  const crawler = await new Apify.PuppeteerCrawler({
    requestQueue,
    launchPuppeteerOptions: {   
      headless: HEADLESS_PUPPETEER
    },
    
    gotoFunction: async ({ page, request } : {page: any, request: any}) =>{
      return await page.goto(request.url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
    },
    maxConcurrency: 200,
    handlePageTimeoutSecs: 5*60,
    handlePageFunction: async ({ page, request, response } : {page: any, request: any, response: any}) => {
      let contentType = 'text/html';
      if((await response) !== null){
        contentType = await response.headers()['content-type'];
      }
      // accept content-type if can't read response headers
      let validContentType = contentType === undefined ? true : (contentType.startsWith('text/html') || contentType.startsWith('text/xml'));

      let url = page.url();
      let domain = url[url.length-1] === '/' ? url.substring(0,url.length-1) : url;
      let domainSplitted = domain.split('/');
      if(domainSplitted.length > 3){
        domain = domainSplitted.slice(0,3).join('/');
      }

      let dataEntry = findDataEntry(domain, mapFinishedData);
      //firstPage = dataEntry === '';
      firstPage = splittedLinks.includes(request.url);
      foundAS = firstPage ? false : (dataEntry !== '' ? mapFinishedData[dataEntry].finished : false);
      console.log('> ' + url, foundAS ? c.bold.green(true) : c.bold.red(false), validContentType ? c.bold.green('HTML') : c.bold.red('NO_HTML'));
      if(validContentType){
        if(!foundAS){
          if (firstPage) {
            mapFinishedData[domain] = {
              finished: false,
              linksRequestIds: []
            }

            // manually add /acessibilidade to find AS faster (only in Portugal)
            let possibleASUrl = domain + '/acessibilidade';
            await requestQueue.addRequest({ url: possibleASUrl });

            /* let links = await page.$$eval('a[href]', (el: any) => el.map((x: any) => x.getAttribute("href")));
            let absoluteUrls = links.map((link: string) => new URL(link, domain));
            let sameDomainLinks = absoluteUrls.filter((url: { href: string; }) => url.href.startsWith(domain));
            let req;
            for await (let link of sameDomainLinks) {
                req = await requestQueue.addRequest({ url: link.href });
                mapFinishedData[url].linksRequestIds.push(req.requestId);
            } */

            // with this pseudoUrls, only get urls in the same domain and not one of these files
            let pseudoUrls = [new Apify.PseudoUrl(domain + '[(?!.*\.(css|jpg|jpeg|gif|svg|pdf|docx|js|png|ico|xml|mp4|mp3|mkv|wav|rss|php|json)).*]')];
            // enqueue existent links with page that match corresponding regex
            const infos = await Apify.utils.enqueueLinks({
              page,
              requestQueue,
              pseudoUrls
            });
            
            fs.appendFile('lib/crawl/400Homepages.txt', domain + '\n', (err) => {
              if (err) console.log(err);
            });

            dataEntry = domain;
            firstPage = false;
          } 

          // find AS using AS generators exclusive classes (portuguese and W3)
          const elemAS = await page.$('.mr.mr-e-name,.basic-information.organization-name');
          // find AS using h1 text (portuguese generator only)
          const headings = await page.$$eval('H1', (elems: any) => elems.map((elem: any) => elem.textContent.toLowerCase()));
          let validHeading = false;
          for(let i = 0; i < headings.length && !validHeading; i++){
            validHeading = headings[i] && headings[i].includes(('Declaração de Acessibilidade').toLowerCase());
          }
          if(!!elemAS || validHeading){
            if(!!elemAS){
              let className = await (await elemAS.getProperty("className")).jsonValue();

              // if it was made with the portuguese generator, store in a different file
              if(className && className.includes('mr-e-name')){
                if(!fs.existsSync('lib/crawl/portugueseAS.csv') || (await readFile('lib/crawl', 'portugueseAS.csv')).trim().length === 0){
                  fs.appendFile('lib/crawl/portugueseAS.csv', firstLineCSV, (err) => {
                    if (err) console.log(err);
                  });
                }
                let orgName = await page.$eval('.capFL [name=siteurl],.capFL .siteurl', (el: any) => el.textContent);
                let conformance = await page.$eval('.mr.mr-conformance-status', (el: any) => el.textContent);
                fs.appendFile('lib/crawl/portugueseAS.csv', orgName+','+request.url+','+conformance+'\n', (err) => {
                  if (err) console.log(err);
                });
              }
            }
            
            // store acessibility statemente in this file, independent of AS generator
            mapFinishedData[dataEntry].finished = true;
            console.log(c.bold.green(request.url));
            fs.appendFile('lib/crawl/foundAS.txt', request.url + '\n', (err) => {
              if (err) console.log(err);
            });
          }
        } else {
          /* // remove all urls that are in queue that belong to dataEntry domain
          let requestsLeft = mapFinishedData[dataEntry].linksRequestIds;
          for await(let reqId of requestsLeft){
            let request = await requestQueue.getRequest(reqId);
            console.log(request);
            await requestQueue.markRequestHandled(request);
          }
          // delete ids to avoid excessive memory usage
          mapFinishedData[dataEntry].linksRequestIds = []; */
          /* let reqQueue = mapFinishedData[dataEntry].queue;
          await reqQueue.drop(); */
        }
      }
    },
    handleFailedRequestFunction: async ({ request, error } : {request: any, error: any}) => {
      console.log(c.bold.red(request.url));
      fs.appendFile('lib/crawl/foundFailed.txt', request.url + '\n', (err) => {
        if (err) console.log(err);
      });
    },
  });
  let timeStart = new Date().getTime();
  await crawler.run();
  await requestQueue.drop();
  let hourDiff = new Date().getTime() - timeStart; //in ms
  let secDiff = hourDiff / 1000; //in s
  let minDiff = hourDiff / 60 / 1000; //in minutes
  let hDiff = hourDiff / 3600 / 1000; //in hours
  let humanReadable = {hours: 0, minutes: 0};
  humanReadable.hours = Math.floor(hDiff);
  humanReadable.minutes = minDiff - 60 * humanReadable.hours;
  console.log(c.bold.green("CRAWLER IS OVER!"), humanReadable);
}

/* Return <string> index of created interface, that represents studied domain */
function findDataEntry(url: string, map: IHashString): string {
  for(let entry of Object.keys(map)){
    if(url.includes(entry)){
      return entry.toString();
    }
  }
  return '';
}

/* Async read utf-8 file, given its directory and name */
async function readFile(dirname: string, filename: string): Promise<string>{
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(dirname, filename), 'utf-8', function(err, content) {
      if (err) {
        console.log(err);
        return;
      }
      resolve(<string>content);
    });
  });   
}

export { crawl_from_excel };

export interface IHashString {
  [index: string]: {finished: boolean, linksRequestIds: number[]};
} 