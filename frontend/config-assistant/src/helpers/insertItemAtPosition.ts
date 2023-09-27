type AnyObject = {[key: string | symbol]: any};

/**
 * For adding object item into specific position,
 * use an empty object and an index to compute the object item.
 * If index is found, add it to the position, otherwise, add to the end
 * @returns the object with inserted item
 */
function insertPropertyAtPosition(obj: AnyObject, key: string, value: any, index?: number) {
  const temp: AnyObject = {};
  let i = 0;

  for (const prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      if (i === index && key && value) {
        temp[key] = value;
      }
      // Add the current item in the loop to the temp obj
      temp[prop] = obj[prop];
      i++;
    }
  }

  // If no index, add to the end
  if (!index && key && value) {
    temp[key] = value;
  }
  return temp;
}
