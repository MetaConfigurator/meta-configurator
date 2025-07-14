# Person
### Table of Contents

- [Person](#root)
    - [Circular](#%2F%24defs%2Fcircular)
    - [address](#%2Fproperties%2Faddress)
        - [country](#%2Fproperties%2Faddress%2Fproperties%2Fcountry)
        - [moreInfo](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo)
            - [timeZone](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FtimeZone)
            - [objects entry](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems)
    - [partner](#%2Fproperties%2Fpartner)
        - [No Partner](#%2Fproperties%2Fpartner%2FoneOf%2F0)

---
### [Person](#root)
*A person schema*

#### Properties

| Name | Type | Required | Description | Constraints | Examples |
|------|------|------|------|------|------|
| circular | [circular](#%2F%24defs%2Fcircular) | false | \- | \- | - |
| name | name | true | \- | \- | - |
| firstName | string | true | First name | Deprecated. | "John" |
| nickNames | string\[\] | false | Nick names | \- | - |
| isMarried | boolean | false | Marital Status | \- | - |
| telephoneNumber | integer | false | phone number | maximum: 159, exclusiveMinimum: 149 | - |
| heightInMeter | number | false | Height | maximum: 2.3, exclusiveMinimum: 1.2, multipleOf: 0.01 | - |
| address | [address](#%2Fproperties%2Faddress) | false | Address of the person | \- | - |
| partner | [partner](#%2Fproperties%2Fpartner) | false | \- | \- | - |
| ^Number.\* | number | false | Any number property | \- | - |


Conditionals
#### if
```json
{
  "properties": {
    "isMarried": {
      "$ref": "#/$defs/isMarried",
      "title": "isMarried"
    }
  },
  "required": [
    "isMarried"
  ]
}
```

#### then
```json
{
  "properties": {
    "spouse": {
      "type": "object",
      "description": "Spouse",
      "properties": {
        "name": {
          "$ref": "#/$defs/name",
          "title": "name"
        },
        "firstName": {
          "type": "string",
          "description": "First name",
          "title": "firstName"
        }
      },
      "title": "spouse"
    }
  }
}
```

#### dependentSchemas
```json
{
  "nickNames": {
    "properties": {
      "preferredNickName": {
        "type": "string",
        "description": "Preferred nick name",
        "title": "preferredNickName"
      }
    }
  }
}
```


#### Example

```json
{
  "circular": {
    "name": "{string}"
  },
  "name": "{string}",
  "firstName": "John",
  "nickNames": [
    "{string}"
  ],
  "isMarried": "{boolean}",
  "telephoneNumber": "{integer}",
  "heightInMeter": "{number}",
  "address": {
    "city": "{string}",
    "zipCode": "12345",
    "country": "{value}",
    "moreInfo": {
      "anyThing": "{value}",
      "info": "{string}",
      "neighborhood": "{string}",
      "timeZone": "UTC",
      "booleanArray": [
        "{boolean}"
      ],
      "numbers": [
        "{number}"
      ],
      "objects": [
        {
          "name": "{string}",
          "age": "{number}"
        }
      ]
    },
    "street": "Main Street",
    "number": "{number}"
  },
  "partner": "{value}",
  "^Number.*": "{number}"
}
```
---
### [Circular](#%2F%24defs%2Fcircular)
#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| name | name | false | \- | minLength: 23 |
| circular | [circular](#%2F%24defs%2Fcircular) | false | \- | \- |

#### Example

```json
{
  "name": "{string}",
  "circular": {
    "name": "{string}"
  }
}
```
---
### [address](#%2Fproperties%2Faddress)
*Address of the person*

#### Properties

| Name | Type | Required | Description | Examples |
|------|------|------|------|------|
| city | string | false | City name | - |
| zipCode | string | false | Zip code | "12345" |
| country | [country](#%2Fproperties%2Faddress%2Fproperties%2Fcountry) | false | Country name | - |
| moreInfo | [moreInfo](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo) | false | More info about the address | - |
| street | string | false | Street name | "Main Street" |
| number | number | false | \- | - |


Conditionals
#### if
```json
{
  "properties": {
    "number": {
      "multipleOf": 2,
      "title": "number"
    }
  },
  "required": [
    "number"
  ]
}
```

#### then
```json
{
  "properties": {
    "number": {
      "description": "Even street number",
      "title": "number"
    }
  }
}
```

#### else
```json
{
  "properties": {
    "number": {
      "description": "Odd street number",
      "title": "number"
    }
  }
}
```


#### Example

```json
{
  "city": "{string}",
  "zipCode": "12345",
  "country": "{value}",
  "moreInfo": {
    "anyThing": "{value}",
    "info": "{string}",
    "neighborhood": "{string}",
    "timeZone": "UTC",
    "booleanArray": [
      "{boolean}"
    ],
    "numbers": [
      "{number}"
    ],
    "objects": [
      {
        "name": "{string}",
        "age": "{number}"
      }
    ]
  },
  "street": "Main Street",
  "number": "{number}"
}
```
---
### [country](#%2Fproperties%2Faddress%2Fproperties%2Fcountry)
*Country name*

#### Enumeration Values
- `Germany`
- `India`
- `China`
- `America`
- `Japan`
- `Spain`
- `France`

---
### [moreInfo](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo)
*More info about the address*

#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| info | string | false | Some info |
| neighborhood | string | false | Neighborhood name |
| timeZone | [timeZone](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FtimeZone) | false | Time zone |
| booleanArray | boolean\[\] | false | Boolean array |
| numbers | number\[\] | false | Numbers |
| objects | [objects entry\[\]](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems) | false | Objects |

#### Example

```json
{
  "anyThing": "{value}",
  "info": "{string}",
  "neighborhood": "{string}",
  "timeZone": "UTC",
  "booleanArray": [
    "{boolean}"
  ],
  "numbers": [
    "{number}"
  ],
  "objects": [
    {
      "name": "{string}",
      "age": "{number}"
    }
  ]
}
```
---
### [timeZone](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FtimeZone)
*Time zone*

#### Enumeration Values
- `UTC`

---
### [objects entry](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| name | string | false | \- |
| age | number | false | \- |

#### Example

```json
{
  "name": "{string}",
  "age": "{number}"
}
```
---
### [partner](#%2Fproperties%2Fpartner)
#### oneOf
Option 1
##### [No Partner](#%2Fproperties%2Fpartner%2FoneOf%2F0)
Option 2
```json
{
  "type": "string",
  "title": "Partner Name"
}
```
#### Example

```json
"{value}"
```
---
### [No Partner](#%2Fproperties%2Fpartner%2FoneOf%2F0)
#### Enumeration Values
- `false`