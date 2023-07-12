export const DEFAULT_CONFIG_DATA: any = {
  name: 'testName',
  firstName: 'testFirstName',
  isMarried: undefined,
  telephoneNumber: 152000,
  heightInMeter: 1.7,
  nickNames: ['testNickName1', 'testNickName2', 'testNickName3'],
  address: {
    street: 'testStreet',
    number: 12,
    zipCode: 'testZip',
    city: 'testCity',
    country: '',
    moreInfo: {
      info: 'testInfo',
      neighborhood: 'testNH',
      booleanArray: [true, false, true],
      numbers: [1, 2, 3],
      objects: [
        { name: 'testName1', age: 12 },
        { name: 'testName2', age: 13 },
        { name: 'testName3', age: 14 },
      ],
    },
  },
};
