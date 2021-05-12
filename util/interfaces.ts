export interface IHashString {
  [index: string]: {
    url: string,
    domain: string,
    entityName: string,
    sampleName: string,
    firstLink: boolean,
    finished: boolean 
  };
} 