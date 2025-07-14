# Untitled schema
### Table of Contents

- [root](#root)
    - [country](#%2Fproperties%2Fcountry)
    - [diet](#%2Fproperties%2Fdiet)

---
### [root](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| country | [country](#%2Fproperties%2Fcountry) | true | \- |
| diet | [diet](#%2Fproperties%2Fdiet) | true | \- |

#### Example

```json
{
  "country": "{string}",
  "diet": "{string}"
}
```
---
### [country](#%2Fproperties%2Fcountry)

Enumeration Values
- `United States`
- `Canada`
- `Mexico`
- `Brazil`
- `Argentina`
- `United Kingdom`
- `Germany`
- `France`
- `Italy`
- `Spain`
- `Australia`
- `New Zealand`
- `India`
- `China`
- `Japan`
- `South Korea`
- `South Africa`
- `Russia`
- `Saudi Arabia`
- `United Arab Emirates`


---
### [diet](#%2Fproperties%2Fdiet)
#### Enumeration Values
- `herbivore`
- `carnivore`
- `omnivore`