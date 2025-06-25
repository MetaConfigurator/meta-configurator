export function trimDataToMaxSize(
  data: any,
  maxSizeInKiB: number = 64,
  minObjectPropertyCountToPreserve: number = 16
): any {
  let n = 64;

  // cut data to n entries and check size. If it is not yet reached, divide n by 2 and repeat.
  // minimum n is 2
  while (true) {
    const dataTrimmedArrays = trimDataToNEntriesPerArray(data, n);
    // we trim object properties to n*8, because even in the minimum case we want to preserve at least 16 properties (or more, if defined in the parameter minObjectPropertyCountToPreserve).
    // properties normally should not be cut at all, except the schema uses patternProperties or additionalProperties and the user has hundreds or millions of same-looking objects
    // therefore, trim object properties very conservatively only, but do it if necessary.
    const dataTrimmedBoth = trimDataToNPropertiesPerObject(
      dataTrimmedArrays,
      Math.max(n * 8, minObjectPropertyCountToPreserve)
    );
    const sizeInBytes = new TextEncoder().encode(JSON.stringify(dataTrimmedBoth)).length;
    const sizeInKiB = sizeInBytes / 1024; // convert to KiB
    if (sizeInKiB <= maxSizeInKiB || n <= 2) {
      return dataTrimmedBoth; // return the cut data if size is within limit or n is too small
    }

    n = Math.floor(n / 2); // reduce n by half
  }
}

function trimDataToNEntriesPerArray(data: any, n: number): any {
  // data will be a json object or array with an arbitrary hierarchy and anywhere could be arrays
  // we want to cut each array to have only n entries

  // check if data is an array. Even then, children could be objects or arrays. Apply same algorithm recursively on each array item
  if (Array.isArray(data)) {
    const newArray = [];
    let i = 0;
    for (const item of data) {
      // if the array has more than n entries, cut it to n entries
      if (i < n) {
        i++;
      } else {
        break;
      }
      newArray.push(trimDataToNEntriesPerArray(item, n));
    }
    return newArray;
  }

  // if data is an object, we need to traverse the object and cut each array to have only 3 entries
  if (typeof data === 'object' && data !== null) {
    const newObject: any = {};
    for (const key in data) {
      newObject[key] = trimDataToNEntriesPerArray(data[key], n);
    }
    return newObject;
  }
  // if data is not an object or array, return it as is
  return data;
}

function trimDataToNPropertiesPerObject(data: any, n: number): any {
  // data will be a json object or array with an arbitrary hierarchy and anywhere could be objects
  // we want to cut each object to have only n properties

  // check if data is an array. Even then, children could be objects or arrays. Apply same algorithm recursively on each array item
  if (Array.isArray(data)) {
    return data.map(item => trimDataToNPropertiesPerObject(item, n));
  }

  // if data is an object, we need to traverse the object and cut each object to have only n properties
  if (typeof data === 'object' && data !== null) {
    const newObject: any = {};
    const keys = Object.keys(data);
    for (let i = 0; i < Math.min(n, keys.length); i++) {
      const key = keys[i];
      newObject[key] = trimDataToNPropertiesPerObject(data[key], n);
    }
    return newObject;
  }
  // if data is not an object or array, return it as is
  return data;
}
