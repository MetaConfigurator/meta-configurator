# Person
### Table of Contents

- [Person](#root)
    - [Circular](#%2F%24defs%2Fcircular)
        - [Circular](#%2F%24defs%2Fcircular)
    - [address](#%2Fproperties%2Faddress)
        - [country](#%2Fproperties%2Faddress%2Fproperties%2Fcountry)
        - [moreInfo](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo)
            - [timeZone](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FtimeZone)
            - [objects entry](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems)
    - [partner](#%2Fproperties%2Fpartner)
        - [No Partner](#%2Fproperties%2Fpartner%2FoneOf%2F0)

---
### <a id="root"></a>[Person](#root)
*A person schema*

#### Properties

| Name | Type | Required | Description | Constraints | Examples |
|------|------|------|------|------|------|
| circular | <u>[circular](#%2F%24defs%2Fcircular)</u> | <span style="color:salmon">false</span> | \- | \- | - |
| <a id="%2F%24defs%2Fname"></a>name | name | <span style="color:lightblue">true</span> | \- | \- | - |
| <a id="%2Fproperties%2FfirstName"></a>firstName | string | <span style="color:lightblue">true</span> | First name | Deprecated. | "John" |
| <a id="%2Fproperties%2FnickNames%2Fitems"></a>nickNames | string\[\] | <span style="color:salmon">false</span> | Nick names | \- | - |
| <a id="%2Fproperties%2FisMarried"></a>isMarried | boolean | <span style="color:salmon">false</span> | Marital Status | \- | - |
| <a id="%2Fproperties%2FtelephoneNumber"></a>telephoneNumber | integer | <span style="color:salmon">false</span> | phone number | maximum: 159, exclusiveMinimum: 149 | - |
| <a id="%2Fproperties%2FheightInMeter"></a>heightInMeter | number | <span style="color:salmon">false</span> | Height | maximum: 2.3, exclusiveMinimum: 1.2, multipleOf: 0.01 | - |
| address | <u>[address](#%2Fproperties%2Faddress)</u> | <span style="color:salmon">false</span> | Address of the person | \- | - |
| partner | <u>[partner](#%2Fproperties%2Fpartner)</u> | <span style="color:salmon">false</span> | \- | \- | - |
| <a id="%2FpatternProperties%2F%5ENumber.*"></a>^Number.\* | number | <span style="color:salmon">false</span> | Any number property | \- | - |

<details>
<summary>Conditionals</summary>
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
  ],
  "type": "object"
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
  },
  "type": "object"
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
    },
    "type": "object"
  }
}
```

</details>
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
  "partner": "{boolean}",
  "^Number.*": "{number}"
}
```
---
### <a id="%2F%24defs%2Fcircular"></a>[Circular](#%2F%24defs%2Fcircular)
#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| <a id="%2F%24defs%2Fname"></a>name | name | <span style="color:salmon">false</span> | \- | minLength: 23 |
| circular | <u>[circular](#%2F%24defs%2Fcircular)</u> | <span style="color:salmon">false</span> | \- | \- |

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
### <a id="%2Fproperties%2Faddress"></a>[address](#%2Fproperties%2Faddress)
*Address of the person*

#### Properties

| Name | Type | Required | Description | Examples |
|------|------|------|------|------|
| <a id="%2Fproperties%2Faddress%2Fproperties%2Fcity"></a>city | string | <span style="color:salmon">false</span> | City name | - |
| <a id="%2Fproperties%2Faddress%2Fproperties%2FzipCode"></a>zipCode | string | <span style="color:salmon">false</span> | Zip code | "12345" |
| country | <u>[country](#%2Fproperties%2Faddress%2Fproperties%2Fcountry)</u> | <span style="color:salmon">false</span> | Country name | - |
| moreInfo | <u>[moreInfo](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo)</u> | <span style="color:salmon">false</span> | More info about the address | - |
| <a id="%2Fproperties%2Faddress%2Fproperties%2Fstreet"></a>street | string | <span style="color:salmon">false</span> | Street name | "Main Street" |
| <a id="%2Fproperties%2Faddress%2Fproperties%2Fnumber"></a>number | number | <span style="color:salmon">false</span> | \- | - |

<details>
<summary>Conditionals</summary>
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
  ],
  "type": "object"
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
  },
  "type": "object"
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
  },
  "type": "object"
}
```

</details>
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
### <a id="%2Fproperties%2Faddress%2Fproperties%2Fcountry"></a>[country](#%2Fproperties%2Faddress%2Fproperties%2Fcountry)
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
### <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo"></a>[moreInfo](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo)
*More info about the address*

#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Finfo"></a>info | string | <span style="color:salmon">false</span> | Some info |
| <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fneighborhood"></a>neighborhood | string | <span style="color:salmon">false</span> | Neighborhood name |
| timeZone | <u>[timeZone](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FtimeZone)</u> | <span style="color:salmon">false</span> | Time zone |
| <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FbooleanArray%2Fitems"></a>booleanArray | boolean\[\] | <span style="color:salmon">false</span> | Boolean array |
| <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fnumbers%2Fitems"></a>numbers | number\[\] | <span style="color:salmon">false</span> | Numbers |
| objects | <u>[objects entry\[\]](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems)</u> | <span style="color:salmon">false</span> | Objects |

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
### <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FtimeZone"></a>[timeZone](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2FtimeZone)
*Time zone*

#### Enumeration Values
- `UTC`

---
### <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems"></a>[objects entry](#%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems%2Fproperties%2Fname"></a>name | string | <span style="color:salmon">false</span> | \- |
| <a id="%2Fproperties%2Faddress%2Fproperties%2FmoreInfo%2Fproperties%2Fobjects%2Fitems%2Fproperties%2Fage"></a>age | number | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "name": "{string}",
  "age": "{number}"
}
```
---
### <a id="%2Fproperties%2Fpartner"></a>[partner](#%2Fproperties%2Fpartner)
#### oneOf
<b>Option 1</b>
##### <u>[No Partner](#%2Fproperties%2Fpartner%2FoneOf%2F0)</u>
<b>Option 2</b>
```json
{
  "type": "string",
  "title": "Partner Name"
}
```
#### Example

```json
"{boolean}"
```
---
### <a id="%2Fproperties%2Fpartner%2FoneOf%2F0"></a>[No Partner](#%2Fproperties%2Fpartner%2FoneOf%2F0)
#### Enumeration Values
- `undefined`
