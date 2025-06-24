# Code Generation

## Overview

MetaConfigurator supports **automatic code generation** from JSON schemas using the [quicktype](https://github.com/glideapps/quicktype) library.
This feature allows users to generate structured, type-safe representations of their data models in various programming languages, making it easier to integrate schemas into software projects.

## Supported Programming Languages

You can generate code in the following languages:

* C++
* C#
* Dart
* Elm
* Flow
* Go
* Java
* JavaScript
* Kotlin
* Objective-C
* PHP
* Python
* Python (pydantic)
* Ruby
* Rust
* Scala
* Swift
* TypeScript

## How to Use Code Generation in MetaConfigurator

1.  **Open a Schema**: Load or create a JSON schema using the MetaConfigurator editor.

2.  **Code Generation Dialog**: In the Schema Editor top menu bar, click the "Generate Source Code..." button.

3.  **Choose a Language**: Select the desired programming language from the dropdown menu. The code will be instantly generated.

5.  **Copy or Download**: Copy the generated code directly to use it in your project.

Example
-------

For a schema like:

```
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" }
  },
  "required": ["id", "name", "email"]
}
```

MetaConfigurator will generate the following Python code:

```
from typing import Any, TypeVar, Type, cast


T = TypeVar("T")


def from_str(x: Any) -> str:
    assert isinstance(x, str)
    return x


def from_int(x: Any) -> int:
    assert isinstance(x, int) and not isinstance(x, bool)
    return x


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


class User:
    email: str
    id: int
    name: str

    def __init__(self, email: str, id: int, name: str) -> None:
        self.email = email
        self.id = id
        self.name = name

    @staticmethod
    def from_dict(obj: Any) -> 'User':
        assert isinstance(obj, dict)
        email = from_str(obj.get("email"))
        id = from_int(obj.get("id"))
        name = from_str(obj.get("name"))
        return User(email, id, name)

    def to_dict(self) -> dict:
        result: dict = {}
        result["email"] = from_str(self.email)
        result["id"] = from_int(self.id)
        result["name"] = from_str(self.name)
        return result


def user_from_dict(s: Any) -> User:
    return User.from_dict(s)


def user_to_dict(x: User) -> Any:
    return to_class(User, x)

```

And Rust code:

```
// Example code that deserializes and serializes the model.
// extern crate serde;
// #[macro_use]
// extern crate serde_derive;
// extern crate serde_json;
//
// use generated_module::User;
//
// fn main() {
//     let json = r#"{"answer": 42}"#;
//     let model: User = serde_json::from_str(&json).unwrap();
// }

use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct User {
    email: String,

    id: i64,

    name: String,
}
```

## Hints and Tips

1. **Use Titles**: Ensure that your root schema and also properties have meaningful titles. The names of the classes and data structures in the source code will be derived from these titles.
2. **Use Descriptions**: Add descriptions to your schema properties. These descriptions will be included as comments in the generated code, providing context for developers.
3. **Execute Validation before reading data**: To ensure the input data satisfies the schema and to get useful feedback regarding schema violations, it is recommended to use validation before reading the data. This can help avoid common pitfalls.

## Common Pitfalls

1. The generated code will be as strict as your schema specifies. If a property is required in the schema, loading a document without that property will result in an error.
