# Composition Schema
### Table of Contents

- [Composition Schema](#root)
    - [Person](#%2Fproperties%2FPerson)
        - [Student](#%2Fproperties%2FPerson%2FoneOf%2F0)
            - [type](#%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2Ftype)
        - [oneOf\[1\]](#%2Fproperties%2FPerson%2FoneOf%2F1)
            - [type](#%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2Ftype)

---
### <a id="root"></a>[Composition Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| Person | <u>[Person](#%2Fproperties%2FPerson)</u> | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "Person": {
    "name": "{string}",
    "type": "Student",
    "currentSemester": "{integer}"
  }
}
```
---
### <a id="%2Fproperties%2FPerson"></a>[Person](#%2Fproperties%2FPerson)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FPerson%2Fproperties%2Fname"></a>name | string | <span style="color:salmon">false</span> | \- |

#### oneOf
<b>Option 1</b>
##### <u>[Student](#%2Fproperties%2FPerson%2FoneOf%2F0)</u>
<b>Option 2</b>
##### <u>[oneOf[1]](#%2Fproperties%2FPerson%2FoneOf%2F1)</u>
#### Example

```json
{
  "name": "{string}",
  "type": "Student",
  "currentSemester": "{integer}"
}
```
---
### <a id="%2Fproperties%2FPerson%2FoneOf%2F0"></a>[Student](#%2Fproperties%2FPerson%2FoneOf%2F0)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| type | <u>[type](#%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2Ftype)</u> | <span style="color:salmon">false</span> | \- |
| <a id="%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2FcurrentSemester"></a>currentSemester | integer | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "type": "Student",
  "currentSemester": "{integer}"
}
```
---
### <a id="%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2Ftype"></a>[type](#%2Fproperties%2FPerson%2FoneOf%2F0%2Fproperties%2Ftype)
#### Enumeration Values
- `Student`

---
### <a id="%2Fproperties%2FPerson%2FoneOf%2F1"></a>[oneOf\[1\]](#%2Fproperties%2FPerson%2FoneOf%2F1)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| type | <u>[type](#%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2Ftype)</u> | <span style="color:salmon">false</span> | \- |
| <a id="%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2FavgGrade"></a>avgGrade | number | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "type": "Graduate",
  "avgGrade": "{number}"
}
```
---
### <a id="%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2Ftype"></a>[type](#%2Fproperties%2FPerson%2FoneOf%2F1%2Fproperties%2Ftype)
#### Enumeration Values
- `Graduate`
