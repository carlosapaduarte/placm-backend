import { success, error } from "../../util/responses";

const http = require('http');
const https = require('https');

/* Fetch document data from given URL */
function fetchDocument(url: any) {
  return new Promise((resolve, reject) => {
      let client = http;
      if (url.toString().indexOf("https") === 0) {
          client = https;
      }
      client.get(url, (resp: any) => {
          let data = '';
          resp.on('data', (chunk: any) => {
              data += chunk;
          });
          resp.on('end', () => {
              resolve(data);
          });
      }).on("error", (err: any) => {
          console.log("Cannot read accessibility statement from", url);
          reject(err);
      });
  });
}

/* Respond with document object, from a given URL */
const get_document_by_url = async (urlReq: string) => {
  const queryObject = new URL(urlReq);
  if (queryObject.href) {
      const document = await fetchDocument(queryObject.href);
      if(document){
        return success(document);
      } else {
        return error({code: -1, message: 'ERROR_FETCH', err: 'Encountered an error while fetching a document'}, queryObject.href);
      }
  } else {
    return error({code: -2, message: 'NO_URL', err: 'No URL was given to fetch'}, queryObject.href);
  }
};

export { get_document_by_url, fetchDocument };

export interface IHashString {
  [index: string]: {finished: boolean, linksRequestIds: number[]};
} 