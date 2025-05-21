
export function cutDataToNEntriesPerArray(data: any, n: number): any {
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
            newArray.push(cutDataToNEntriesPerArray(item, n));
        }
        return newArray;
    }

    // if data is an object, we need to traverse the object and cut each array to have only 3 entries
    if (typeof data === 'object' && data !== null) {
        const newObject: any = {};
        for (const key in data) {
            newObject[key] = cutDataToNEntriesPerArray(data[key], n);
        }
        return newObject;
    }
    // if data is not an object or array, return it as is
    return data;
}