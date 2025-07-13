# Constraints Schema
### Table of Contents

- [Constraints Schema](#root)
    - [Person](#%2Fproperties%2FPerson)

---
### <a id="root"></a>[Constraints Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| Person | <u>[Person](#%2Fproperties%2FPerson)</u> | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "Person": {
    "name": "{string}",
    "age": "{integer}"
  }
}
```
---
### <a id="%2Fproperties%2FPerson"></a>[Person](#%2Fproperties%2FPerson)
#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| <a id="%2Fproperties%2FPerson%2Fproperties%2Fname"></a>name | string | <span style="color:salmon">false</span> | \- | \- |
| <a id="%2Fproperties%2FPerson%2Fproperties%2Fage"></a>age | integer | <span style="color:salmon">false</span> | \- | minimum: 0, maximum: 200 |

#### Example

```json
{
  "name": "{string}",
  "age": "{integer}"
}
```