# Multi-Step Registration Form
### Table of Contents

- [Multi\-Step Registration Form](#root)
    - [account](#%2Fproperties%2Faccount)
    - [personal](#%2Fproperties%2Fpersonal)
    - [payment](#%2Fproperties%2Fpayment)
        - [Credit Card](#%2Fproperties%2Fpayment%2FoneOf%2F0)
            - [method](#%2Fproperties%2Fpayment%2FoneOf%2F0%2Fproperties%2Fmethod)
        - [SEPA Direct Debit](#%2Fproperties%2Fpayment%2FoneOf%2F1)
            - [method](#%2Fproperties%2Fpayment%2FoneOf%2F1%2Fproperties%2Fmethod)
    - [preferences](#%2Fproperties%2Fpreferences)
        - [theme](#%2Fproperties%2Fpreferences%2Fproperties%2Ftheme)
    - [extraData](#%2Fproperties%2FextraData)
    - [parentalConsent](#%2Fproperties%2FparentalConsent)

---
### <a id="root"></a>[Multi\-Step Registration Form](#root)
*Schema for a dynamic, multi-step registration process supporting conditional logic and custom metadata.*

#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| account | <u>[account](#%2Fproperties%2Faccount)</u> | <span style="color:lightblue">true</span> | User account credentials. |
| personal | <u>[personal](#%2Fproperties%2Fpersonal)</u> | <span style="color:lightblue">true</span> | User personal information. |
| payment | <u>[payment](#%2Fproperties%2Fpayment)</u> | <span style="color:lightblue">true</span> | Preferred payment method. |
| preferences | <u>[preferences](#%2Fproperties%2Fpreferences)</u> | <span style="color:salmon">false</span> | User\-configurable preferences. |
| extraData | <u>[extraData](#%2Fproperties%2FextraData)</u> | <span style="color:salmon">false</span> | Custom vendor metadata. |
| parentalConsent | <u>[parentalConsent](#%2Fproperties%2FparentalConsent)</u> | <span style="color:salmon">false</span> | Parental consent section \(for users under 18\). |

<details>
<summary>Conditionals</summary>
#### if
```json
{
  "properties": {
    "personal": {
      "properties": {
        "age": {
          "maximum": 17,
          "title": "age"
        }
      },
      "title": "personal",
      "type": "object"
    }
  },
  "required": [
    "personal"
  ],
  "type": "object"
}
```

#### then
```json
{
  "required": [
    "parentalConsent"
  ],
  "properties": {
    "parentalConsent": {}
  }
}
```

</details>
#### Example

```json
{
  "account": {
    "username": "mert_dev",
    "password": "hunter42"
  },
  "personal": {
    "fullName": "Mert Ali Barlas",
    "age": 17,
    "country": "DE",
    "newsletter": true
  },
  "payment": {
    "method": "sepa",
    "iban": "DE89370400440532013000"
  },
  "preferences": {
    "theme": "dark",
    "language": "de-DE"
  },
  "extraData": {
    "x-referral": "FRIEND2025"
  },
  "parentalConsent": {
    "guardianName": "Ali Barlas",
    "guardianEmail": "parent@example.com"
  }
}
```
---
### <a id="%2Fproperties%2Faccount"></a>[account](#%2Fproperties%2Faccount)
*User account credentials.*

#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| <a id="%2Fproperties%2Faccount%2Fproperties%2Fusername"></a>username | string | <span style="color:lightblue">true</span> | Unique username \(alphanumeric \+ underscore\). | minLength: 4, maxLength: 16, pattern: "^\[a\-zA\-Z0\-9\_\]\+$" |
| <a id="%2Fproperties%2Faccount%2Fproperties%2Fpassword"></a>password | string | <span style="color:lightblue">true</span> | Password with at least 8 characters. | minLength: 8 |

#### Example

```json
{
  "username": "{string}",
  "password": "{string}"
}
```
---
### <a id="%2Fproperties%2Fpersonal"></a>[personal](#%2Fproperties%2Fpersonal)
*User personal information.*

#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| <a id="%2Fproperties%2Fpersonal%2Fproperties%2FfullName"></a>fullName | string | <span style="color:lightblue">true</span> | User's full legal name. | \- |
| <a id="%2Fproperties%2Fpersonal%2Fproperties%2Fage"></a>age | integer | <span style="color:lightblue">true</span> | User's age in years. | minimum: 0 |
| <a id="%2Fproperties%2Fpersonal%2Fproperties%2Fcountry"></a>country | string | <span style="color:lightblue">true</span> | Country of residence. | \- |
| <a id="%2Fproperties%2Fpersonal%2Fproperties%2Fnewsletter"></a>newsletter | boolean | <span style="color:salmon">false</span> | Subscribe to newsletter? | \- |

#### Example

```json
{
  "fullName": "{string}",
  "age": "{integer}",
  "country": "{string}",
  "newsletter": "{boolean}"
}
```
---
### <a id="%2Fproperties%2Fpayment"></a>[payment](#%2Fproperties%2Fpayment)
*Preferred payment method.*

#### oneOf
<b>Option 1</b>
##### <u>[Credit Card](#%2Fproperties%2Fpayment%2FoneOf%2F0)</u>
<b>Option 2</b>
##### <u>[SEPA Direct Debit](#%2Fproperties%2Fpayment%2FoneOf%2F1)</u>
#### Example

```json
{
  "method": "card",
  "cardNumber": "{string}",
  "expiration": "{string}"
}
```
---
### <a id="%2Fproperties%2Fpayment%2FoneOf%2F0"></a>[Credit Card](#%2Fproperties%2Fpayment%2FoneOf%2F0)
#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| method | <u>[method](#%2Fproperties%2Fpayment%2FoneOf%2F0%2Fproperties%2Fmethod)</u> | <span style="color:lightblue">true</span> | \- | \- |
| <a id="%2Fproperties%2Fpayment%2FoneOf%2F0%2Fproperties%2FcardNumber"></a>cardNumber | string | <span style="color:lightblue">true</span> | Card number \(16 digits\). | pattern: "^\[0\-9\]{16}$" |
| <a id="%2Fproperties%2Fpayment%2FoneOf%2F0%2Fproperties%2Fexpiration"></a>expiration | string | <span style="color:lightblue">true</span> | Expiration date \(MM/YY\). | pattern: "^\(0\[1\-9\]\|1\[0\-2\]\)\\\\/\\\\d{2}$" |

#### Example

```json
{
  "method": "card",
  "cardNumber": "{string}",
  "expiration": "{string}"
}
```
---
### <a id="%2Fproperties%2Fpayment%2FoneOf%2F0%2Fproperties%2Fmethod"></a>[method](#%2Fproperties%2Fpayment%2FoneOf%2F0%2Fproperties%2Fmethod)
#### Enumeration Values
- `card`

---
### <a id="%2Fproperties%2Fpayment%2FoneOf%2F1"></a>[SEPA Direct Debit](#%2Fproperties%2Fpayment%2FoneOf%2F1)
#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| method | <u>[method](#%2Fproperties%2Fpayment%2FoneOf%2F1%2Fproperties%2Fmethod)</u> | <span style="color:lightblue">true</span> | \- | \- |
| <a id="%2Fproperties%2Fpayment%2FoneOf%2F1%2Fproperties%2Fiban"></a>iban | string | <span style="color:lightblue">true</span> | IBAN format | pattern: "^\[A\-Z\]{2}\\\\d{2}\[A\-Z0\-9\]{1,30}$" |

#### Example

```json
{
  "method": "sepa",
  "iban": "{string}"
}
```
---
### <a id="%2Fproperties%2Fpayment%2FoneOf%2F1%2Fproperties%2Fmethod"></a>[method](#%2Fproperties%2Fpayment%2FoneOf%2F1%2Fproperties%2Fmethod)
#### Enumeration Values
- `sepa`

---
### <a id="%2Fproperties%2Fpreferences"></a>[preferences](#%2Fproperties%2Fpreferences)
*User-configurable preferences.*

#### Properties

| Name | Type | Required | Description | Constraints | Default |
|------|------|------|------|------|------|
| theme | <u>[theme](#%2Fproperties%2Fpreferences%2Fproperties%2Ftheme)</u> | <span style="color:salmon">false</span> | \- | \- | "system" |
| <a id="%2Fproperties%2Fpreferences%2Fproperties%2Flanguage"></a>language | string | <span style="color:salmon">false</span> | Language code \(e.g., en, de\-DE\). | pattern: "^\[a\-z\]{2}\(\-\[A\-Z\]{2}\)?$" | "en" |

#### Example

```json
{
  "theme": "{string}",
  "language": "{string}"
}
```
---
### <a id="%2Fproperties%2Fpreferences%2Fproperties%2Ftheme"></a>[theme](#%2Fproperties%2Fpreferences%2Fproperties%2Ftheme)
#### Enumeration Values
- `light`
- `dark`
- `system`

---
### <a id="%2Fproperties%2FextraData"></a>[extraData](#%2Fproperties%2FextraData)
*Custom vendor metadata.*

#### Properties

| Name | Type | Required | Description |
|------|------|------|------|
| <a id="%2Fproperties%2FextraData%2FpatternProperties%2F%5Ex-%5Ba-zA-Z0-9_%5D%2B%24"></a>^x\-\[a\-zA\-Z0\-9\_\]\+$ | string | <span style="color:salmon">false</span> | Custom key/value metadata prefixed with 'x\-'. |

#### Example

```json
{
  "^x-[a-zA-Z0-9_]+$": "{string}"
}
```
---
### <a id="%2Fproperties%2FparentalConsent"></a>[parentalConsent](#%2Fproperties%2FparentalConsent)
*Parental consent section (for users under 18).*

#### Properties

| Name | Type | Required | Description | Constraints |
|------|------|------|------|------|
| <a id="%2Fproperties%2FparentalConsent%2Fproperties%2FguardianName"></a>guardianName | string | <span style="color:lightblue">true</span> | \- | \- |
| <a id="%2Fproperties%2FparentalConsent%2Fproperties%2FguardianEmail"></a>guardianEmail | string | <span style="color:lightblue">true</span> | \- | format: "email" |

#### Example

```json
{
  "guardianName": "{string}",
  "guardianEmail": "{string}"
}
```