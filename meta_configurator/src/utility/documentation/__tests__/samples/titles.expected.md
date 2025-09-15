# Titles Schema
### Table of Contents

- [Titles Schema](#root)
    - [PlantObject](#%2Fproperties%2FPlant)
    - [PersonObject](#%2F%24defs%2Fperson)
        - [PersonObject](#%2F%24defs%2Fperson)
    - [person1](#%2F%24defs%2Fperson)
    - [PersonObject](#%2F%24defs%2Fperson)
        - [PersonObject](#%2F%24defs%2Fperson)
    - [person2](#%2F%24defs%2Fperson)
    - [PersonObject](#%2F%24defs%2Fperson)
        - [PersonObject](#%2F%24defs%2Fperson)
    - [PersonObject](#%2F%24defs%2Fperson)
        - [PersonObject](#%2F%24defs%2Fperson)
    - [PersonObject](#%2F%24defs%2Fperson)
        - [PersonObject](#%2F%24defs%2Fperson)

---
### <a id="root"></a>[Titles Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| Plant | <u>[Plant](#%2Fproperties%2FPlant)</u> | <span style="color:salmon">false</span> | \- |
| person1 | <u>[person1](#%2F%24defs%2Fperson)</u> | <span style="color:salmon">false</span> | \- |
| person2 | <u>[person2](#%2F%24defs%2Fperson)</u> | <span style="color:salmon">false</span> | \- |
| people1 | <u>[PersonObject\[\]](#%2F%24defs%2Fperson)</u> | <span style="color:salmon">false</span> | \- |
| people2 | <u>[people](#%2F%24defs%2Fperson)</u> | <span style="color:salmon">false</span> | \- |
| people3 | <u>[people](#%2F%24defs%2Fperson)</u> | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "Plant": {
    "species": "{string}"
  },
  "person1": {
    "name": "{string}",
    "age": "{integer}"
  },
  "person2": {
    "name": "{string}",
    "age": "{integer}"
  },
  "people1": [
    {
      "name": "{string}",
      "age": "{integer}"
    }
  ],
  "people2": [
    {
      "name": "{string}",
      "age": "{integer}"
    }
  ],
  "people3": [
    {
      "name": "{string}",
      "age": "{integer}"
    }
  ]
}
```
---
### <a id="%2Fproperties%2FPlant"></a>[PlantObject](#%2Fproperties%2FPlant)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FPlant%2Fproperties%2Fspecies"></a>species | string | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "species": "{string}"
}
```
---
### <a id="%2F%24defs%2Fperson"></a>[PersonObject](#%2F%24defs%2Fperson)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2F%24defs%2Fperson%2Fproperties%2Fname"></a>name | string | <span style="color:salmon">false</span> | \- |
| <a id="%2F%24defs%2Fperson%2Fproperties%2Fage"></a>age | integer | <span style="color:salmon">false</span> | \- |
| bestFriend | <u>[person](#%2F%24defs%2Fperson)</u> | <span style="color:salmon">false</span> | \- |

#### Example

```json
{
  "name": "{string}",
  "age": "{integer}",
  "bestFriend": {
    "name": "{string}",
    "age": "{integer}"
  }
}
```