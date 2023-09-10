export type AnyObject = {[key: string]: any};
export function objectItemToSpecificPosition(
  obj: AnyObject,
  key: string,
  value: any,
  index?: number
) {
  let temp: AnyObject = {};
  let i = 0;

  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
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
