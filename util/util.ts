import { maxTextLength } from "./constants";
import { trim } from "lodash";

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

export {setCharAt, randomString};
