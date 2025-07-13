# My Schema
### Table of Contents

- [My Schema](#root)
    - [objectArrayProperty entry](#%2Fproperties%2FobjectArrayProperty%2Fitems)
    - [nestedArraysAndObjectsProperty entry](#%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems)

---
### <a id="root"></a>[My Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FnumberArrayProperty%2Fitems"></a>numberArrayProperty | number\[\] | <span style="color:salmon">false</span> | \- |
| objectArrayProperty | <u>[object\[\]](#%2Fproperties%2FobjectArrayProperty%2Fitems)</u> | <span style="color:salmon">false</span> | \- |
| <a id="%2Fproperties%2FnestedArraysProperty%2Fitems%2Fitems%2Fitems"></a>nestedArraysProperty | array\[\] | <span style="color:salmon">false</span> | \- |
| nestedArraysAndObjectsProperty | <u>[object\[\]](#%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems)</u> | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "numberArrayProperty": [
    "{number}"
  ],
  "objectArrayProperty": [
    {
      "booleanProperty": "{boolean}"
    }
  ],
  "nestedArraysProperty": [
    [
      [
        "{string}"
      ]
    ]
  ],
  "nestedArraysAndObjectsProperty": [
    {
      "arrayProp": [
        "{string}"
      ]
    }
  ]
}
```
---
### <a id="%2Fproperties%2FobjectArrayProperty%2Fitems"></a>[objectArrayProperty entry](#%2Fproperties%2FobjectArrayProperty%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FobjectArrayProperty%2Fitems%2Fproperties%2FbooleanProperty"></a>booleanProperty | boolean | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "booleanProperty": "{boolean}"
}
```
---
### <a id="%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems"></a>[nestedArraysAndObjectsProperty entry](#%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems%2Fproperties%2FarrayProp%2Fitems"></a>arrayProp | string\[\] | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "arrayProp": [
    "{string}"
  ]
}
```