# Untitled schema
### Table of Contents

- [root](#root)
    - [inlinedArray entry](#%2Fproperties%2FinlinedArray%2Fitems)
    - [ABC](#%2Fproperties%2Fenum)
    - [enumInDefs](#%2F%24defs%2FenumInDefs)
    - [constantValue](#%2Fproperties%2FconstantValue)

---
### [root](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| inlinedArray | [inlinedArray entry\[\]](#%2Fproperties%2FinlinedArray%2Fitems) | false | \- |
| enum | [ABC](#%2Fproperties%2Fenum) | false | \- |
| referenceToEnumInDefs | [enumInDefs](#%2F%24defs%2FenumInDefs) | false | \- |
| constantValue | [constantValue](#%2Fproperties%2FconstantValue) | false | \- |

#### Example

```json
{
  "inlinedArray": [
    {
      "name": "{string}"
    }
  ],
  "enum": "{string}",
  "referenceToEnumInDefs": "{integer}",
  "constantValue": "myConstant"
}
```
---
### [inlinedArray entry](#%2Fproperties%2FinlinedArray%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| name | string | false | \- |

#### Example

```json
{
  "name": "{string}"
}
```
---
### [ABC](#%2Fproperties%2Fenum)
#### Enumeration Values
- `A`
- `B`
- `C`

---
### [enumInDefs](#%2F%24defs%2FenumInDefs)
#### Enumeration Values
- `1`
- `3`
- `5`

---
### [constantValue](#%2Fproperties%2FconstantValue)
#### Enumeration Values
- `myConstant`