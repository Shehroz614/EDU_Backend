/**
 * Check if object or string is empty
 * @param val
 * @returns {boolean}
 */
const isEmpty = (val) => val == null || !(Object.keys(val) || val).length;

const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * check if object is actually an object
 * @param obj
 * @returns {boolean}
 */
const isObject = (obj) => obj === Object(obj);

const omit = (obj, keys) => {
  const result = {};
  for (const key in obj) {
    if (!keys.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

const isEqual = (value1, value2) => {
  if (typeof value1 !== typeof value2) {
    return false;
  }

  if (typeof value1 !== 'object' || value1 === null || value2 === null) {
    return value1 === value2;
  }

  const keys1 = Object.keys(value1);
  const keys2 = Object.keys(value2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!isEqual(value1[key], value2[key])) {
      return false;
    }
  }

  return true;
}


export { isEmpty, isValidJSON, isObject, omit, isEqual };
