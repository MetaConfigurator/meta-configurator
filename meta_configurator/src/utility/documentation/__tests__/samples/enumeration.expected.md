# Untitled schema
### Table of Contents

- [root](#root)
    - [country](#%2Fproperties%2Fcountry)
    - [diet](#%2Fproperties%2Fdiet)

---
### <a id="root"></a>[root](#root)
#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| country | <u>[enum](#%2Fproperties%2Fcountry)</u> | <span style="color:lightblue">true</span> | \- |
| diet | <u>[enum](#%2Fproperties%2Fdiet)</u> | <span style="color:lightblue">true</span> | \- |

#### Example

```json
{
  "country": "{string}",
  "diet": "{string}"
}
```
---
### <a id="%2Fproperties%2Fcountry"></a>[country](#%2Fproperties%2Fcountry)
<details>
<summary>Enumeration Values</summary>
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
</details>

---
### <a id="%2Fproperties%2Fdiet"></a>[diet](#%2Fproperties%2Fdiet)
#### Enumeration Values
- `herbivore`
- `carnivore`
- `omnivore`
