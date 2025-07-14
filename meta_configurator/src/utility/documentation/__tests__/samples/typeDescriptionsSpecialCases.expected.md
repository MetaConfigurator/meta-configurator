# Untitled schema
### Table of Contents

- [root](#root)
    - [inlinedArray entry](#%2Fproperties%2FinlinedArray%2Fitems)
    - [ABC](#%2Fproperties%2Fenum)
    - [enumInDefs](#%2F%24defs%2FenumInDefs)
    - [constantValue](#%2Fproperties%2FconstantValue)

---
### <a id="root"></a>[root](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| inlinedArray | <u>[object\[\]](#%2Fproperties%2FinlinedArray%2Fitems)</u> | <span style="color:salmon">false</span> | \- |
| enum | <u>[ABC](#%2Fproperties%2Fenum)</u> | <span style="color:salmon">false</span> | \- |
| referenceToEnumInDefs | <u>[enumInDefs](#%2F%24defs%2FenumInDefs)</u> | <span style="color:salmon">false</span> | \- |
| constantValue | <u>[constantValue](#%2Fproperties%2FconstantValue)</u> | <span style="color:salmon">false</span> | \- |

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
### <a id="%2Fproperties%2FinlinedArray%2Fitems"></a>[inlinedArray entry](#%2Fproperties%2FinlinedArray%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FinlinedArray%2Fitems%2Fproperties%2Fname"></a>name | string | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "name": "{string}"
}
```
---
### <a id="%2Fproperties%2Fenum"></a>[ABC](#%2Fproperties%2Fenum)
#### Enumeration Values
- `A`
- `B`
- `C`

---
### <a id="%2F%24defs%2FenumInDefs"></a>[enumInDefs](#%2F%24defs%2FenumInDefs)
#### Enumeration Values
- `1`
- `3`
- `5`

---
### <a id="%2Fproperties%2FconstantValue"></a>[constantValue](#%2Fproperties%2FconstantValue)
#### Enumeration Values
- `myConstant`
