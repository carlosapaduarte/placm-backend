import * as DB_CONFIG from '../database/configs/db_config.json';
import * as DB_CONFIG_PT from '../database/configs/db_config_pt.json';
import * as DB_CONFIG_TEST from '../database/configs/db_config_test.json';
import * as COUNTRY_JSON from '../lib/jsons/country-by-continent.json';
import * as CONSTELLATIONS_JSON from '../lib/jsons/constellations.json';
import * as PROTODATA_JSON from '../lib/jsons/protodata.json';
import * as RULES_JSON from '../lib/jsons/act-rules_mapping.json';
import * as WCAG21_JSON from '../lib/jsons/wcag21.json';
import * as ELEMENT_TYPES from '../lib/jsons/element_type_rule.json';

const maxTextLength = 255;

const emailRegex = new RegExp(/\w+@\w+\.\w+/);
const twitterRegex = new RegExp(/(?!\b)@[a-zA-Z0-9]{1,15}/g);
const telephoneRegex = new RegExp(/^(?:[0-9]|[ -()+#.])+$/);

const urlRegex = new RegExp(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/);

const DB_NAMES: { [key: string]: string } = {
  'proto': 'placmproto',
  'pt': 'placmprotopt'
}

const ELEMENT_TYPES_LOCATION = 'lib/jsons/element_type_rule.json';

export {DB_CONFIG, DB_CONFIG_PT, DB_CONFIG_TEST,
        COUNTRY_JSON, CONSTELLATIONS_JSON, PROTODATA_JSON,
        RULES_JSON, WCAG21_JSON, ELEMENT_TYPES,
        maxTextLength, emailRegex, twitterRegex, telephoneRegex, urlRegex, DB_NAMES,
        ELEMENT_TYPES_LOCATION};