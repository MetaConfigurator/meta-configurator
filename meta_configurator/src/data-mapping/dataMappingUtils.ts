
export function cutDataToMaxSize(data: any, maxSizeInKb: number = 64): any {
    // initial n is 20
    let n = 64;

    // cut data to n entries and check size. If it is not yet reached, divide n by 2 and repeat.
    // minimum n is 2
    while (true) {
        const cutData = cutDataToNEntriesPerArray(data, n);
        const sizeInBytes = new TextEncoder().encode(JSON.stringify(cutData)).length;
        const sizeInKb = sizeInBytes / 1024; // convert to KB
        if (sizeInKb <= maxSizeInKb || n <= 2) {
            return cutData; // return the cut data if size is within limit or n is too small
        }

        n = Math.floor(n / 2); // reduce n by half
    }
}



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