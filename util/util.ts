import * as fs from "fs";
import { join } from 'path';
import { FIRST_LINE_CSV, FIRST_LINE_CSV_FAILED, FIRST_LINE_TXT_CSV } from "./constants";
import { IHashString } from "./interfaces";

/* Update char in given string at given index */
function setCharAt(str: string, index: number, chr: string): string {
  if (index > str.length - 1) return str;
  return str.substr(0, index) + chr + str.substr(index + 1);
}

/* Returns a random string with given length 
 * an is optional (alphanumeric), 'a' (alpha) or 'n' (numeric) */
function randomString(len: number, an?: string) {
  an = an && an.toLowerCase();
  var str = "",
    i = 0,
    min = an === "a" ? 10 : 0,
    max = an === "n" ? 10 : 62;
  for (; i++ < len;) {
    var r = Math.random() * (max - min) + min << 0;
    str += String.fromCharCode(r += r > 9 ? r < 36 ? 55 : 61 : 48);
  }
  return str;
}

/*********** CRAWLER FUNCTIONS ***********/
/* Deletes recursively a folder */
function deleteFolderRecursive(directoryPath: string){
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file, index) => {
      const curPath = join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

/* Creates necessary crawler files */
function prepareCrawlerFiles(filetype: number): void {
  if (!fs.existsSync('lib/crawl')){
    fs.mkdirSync('lib/crawl');
  }
  fs.writeFile('lib/crawl/firstLinks.txt', '', (err) => {
    if (err) console.log(err);
  });
  if(filetype === 1){ // xlsx file
    fs.writeFile('lib/crawl/portugueseAS.csv', FIRST_LINE_CSV, (err) => {
      if (err) console.log(err);
    });
  } else { // txt or manual file
    fs.writeFile('lib/crawl/portugueseAS.csv', FIRST_LINE_TXT_CSV, (err) => {
      if (err) console.log(err);
    });
  }
  
  fs.writeFile('lib/crawl/foundAS.txt', '', (err) => {
    if (err) console.log(err);
  });
  fs.writeFile('lib/crawl/failedLinks.csv', FIRST_LINE_CSV_FAILED, (err) => {
    if (err) console.log(err);
  });
}

/* Returns domain map entry that corresponds to given URL */
function getDomainEntryFromURL(url: string, map: IHashString){
  let domain = url[url.length-1] === '/' ? url.slice(0,-1) : url;
  domain = domain.split('/')[2];
  return findDataEntry(domain, map);
}

/* Returns domain map entry that corresponds to given domain */
function findDataEntry(domain: string, map: IHashString): any {
  let result = {}, found = false, index = 0;
  let entries = Object.keys(map);
  while(!found && index < entries.length){
    if(domain.includes(entries[index])){
      result = map[entries[index]];
      found = true;
    }
    index++;
  }
  return result;
}
export {setCharAt, randomString,
        deleteFolderRecursive, prepareCrawlerFiles,
        getDomainEntryFromURL};
