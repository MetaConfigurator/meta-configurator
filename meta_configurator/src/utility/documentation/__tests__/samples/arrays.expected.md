# My Schema
### Table of Contents

- [My Schema](#root)
    - [objectArrayProperty entry](#%2Fproperties%2FobjectArrayProperty%2Fitems)
    - [nestedArraysAndObjectsProperty entry](#%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems)

---
### [My Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| numberArrayProperty | number\[\] | false | \- |
| objectArrayProperty | [objectArrayProperty entry\[\]](#%2Fproperties%2FobjectArrayProperty%2Fitems) | false | \- |
| nestedArraysProperty | nestedArraysProperty entry\[\] | false | \- |
| nestedArraysAndObjectsProperty | [nestedArraysAndObjectsProperty entry\[\]](#%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems) | false | \- |

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
### [objectArrayProperty entry](#%2Fproperties%2FobjectArrayProperty%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| booleanProperty | boolean | false | \- |

#### Example

```json
{
  "booleanProperty": "{boolean}"
}
```
---
### [nestedArraysAndObjectsProperty entry](#%2Fproperties%2FnestedArraysAndObjectsProperty%2Fitems)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| arrayProp | string\[\] | false | \- |

#### Example

```json
{
  "arrayProp": [
    "{string}"
  ]
}
```