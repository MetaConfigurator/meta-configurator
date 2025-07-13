# Conditionals Schema
### Table of Contents

- [Conditionals Schema](#root)
    - [Person](#%2Fproperties%2FPerson)

---
### [Conditionals Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| Person | [Person](#%2Fproperties%2FPerson) | false | \- |

#### Example

```json
{
  "Person": {
    "name": "{string}",
    "married": "{boolean}"
  }
}
```
---
### [Person](#%2Fproperties%2FPerson)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| name | string | false | \- |
| married | boolean | false | \- |


Conditionals
#### if
```json
{
  "type": "object",
  "properties": {
    "married": {
      "type": "boolean",
      "title": "married",
      "enum": [
        true
      ]
    }
  },
  "required": [
    "married"
  ]
}
```

#### then
```json
{
  "properties": {
    "partnerName": {
      "type": "string",
      "title": "partnerName"
    }
  }
}
```


#### Example

```json
{
  "name": "{string}",
  "married": "{boolean}"
}
```