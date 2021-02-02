import { Pool } from 'mysql';
import { pool as poolDefault, poolPT, poolTest } from '..';

function execute_query(serverName: string, query: any, queryParams: any[] = []): Promise<any> {
  return new Promise(async (resolve, reject) => {

    let usingPool: Pool;
    switch(serverName) {
      case 'test':
        usingPool = poolTest;
        break;
      case 'pt':
        usingPool = poolPT;
        break;
      default:
        usingPool = poolDefault;
        break;
    }

    let queryString;
    usingPool.getConnection(function(err, connection) {
      if(err){
        console.log(err);
        reject(new Error(err.message));
      } else {
        queryString = connection.query(query, queryParams, (err: any, res: unknown) => {
          connection.release();
          if (err) {
            console.log(err);
            reject(new Error(err.message));
          } else {
            resolve(res);
          }
        });
        //console.log(queryString.sql);
      }
    });
  }); 
}

export {execute_query};
