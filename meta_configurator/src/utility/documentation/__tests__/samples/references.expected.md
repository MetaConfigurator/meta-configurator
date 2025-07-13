# References Schema
### Table of Contents

- [References Schema](#root)
    - [person](#%2F%24defs%2Fperson)

---
### [References Schema](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| person1 | [person1](#%2F%24defs%2Fperson) | false | \- |
| person2 | [person2](#%2F%24defs%2Fperson) | false | \- |
| person3 | [person3](#%2F%24defs%2Fperson) | false | \- |
| people1 | [person\[\]](#%2F%24defs%2Fperson) | false | \- |
| people2 | [people](#%2F%24defs%2Fperson) | false | \- |
| people3 | [people](#%2F%24defs%2Fperson) | false | \- |

#### Example

```json
{
  "person1": {
    "name": "{string}",
    "age": "{integer}"
  },
  "person2": {
    "name": "{string}",
    "age": "{integer}"
  },
  "person3": {
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
### [person](#%2F%24defs%2Fperson)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| name | string | false | \- |
| age | integer | false | \- |
| bestFriend | [person](#%2F%24defs%2Fperson) | false | \- |

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