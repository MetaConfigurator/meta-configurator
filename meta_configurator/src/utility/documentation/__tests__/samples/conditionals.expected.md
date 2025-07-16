# Conditionals Schema
### Table of Contents

- [Conditionals Schema](#root)
    - [Person](#%2Fproperties%2FPerson)

---
### <a id="root"></a>[Conditionals Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| Person | <u>[Person](#%2Fproperties%2FPerson)</u> | <span style="color:salmon">false</span> | \- |

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
### <a id="%2Fproperties%2FPerson"></a>[Person](#%2Fproperties%2FPerson)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FPerson%2Fproperties%2Fname"></a>name | string | <span style="color:salmon">false</span> | \- |
| <a id="%2Fproperties%2FPerson%2Fproperties%2Fmarried"></a>married | boolean | <span style="color:salmon">false</span> | \- |

<details>
<summary>Conditionals</summary>
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
  },
  "type": "object"
}
```

</details>
#### Example

```json
{
  "name": "{string}",
  "married": "{boolean}"
}
```