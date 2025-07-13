# Composition Schema
### Table of Contents

- [Composition Schema](#root)
    - [Person](#%2Fproperties%2FPerson)
        - [Student](#%2Fproperties%2FPerson%2FoneOf%2F0)
            - [type](#%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2Ftype)
        - [oneOf\[1\]](#%2Fproperties%2FPerson%2FoneOf%2F1)
            - [type](#%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2Ftype)

---
### [Composition Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| Person | [Person](#%2Fproperties%2FPerson) | false | \- |

#### Example

```json
{
  "Person": {
    "name": "{string}"
  }
}
```
---
### [Person](#%2Fproperties%2FPerson)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| name | string | false | \- |

#### oneOf
Option 1
##### [Student](#%2Fproperties%2FPerson%2FoneOf%2F0)
Option 2
##### [oneOf[1]](#%2Fproperties%2FPerson%2FoneOf%2F1)
#### Example

```json
{
  "name": "{string}"
}
```
---
### [Student](#%2Fproperties%2FPerson%2FoneOf%2F0)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| type | [enum](#%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2Ftype) | false | \- |
| currentSemester | integer | false | \- |

#### Example

```json
{
  "type": "Student",
  "currentSemester": "{integer}"
}
```
---
### [type](#%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2Ftype)
#### Enumeration Values
- `Student`

---
### [oneOf\[1\]](#%2Fproperties%2FPerson%2FoneOf%2F1)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| type | [enum](#%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2Ftype) | false | \- |
| avgGrade | number | false | \- |

#### Example

```json
{
  "type": "Graduate",
  "avgGrade": "{number}"
}
```
---
### [type](#%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2Ftype)
#### Enumeration Values
- `Graduate`