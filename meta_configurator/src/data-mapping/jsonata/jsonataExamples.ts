export const JSONATA_INPUT_EXAMPLE =
  '{\n' +
  '  "person": {\n' +
  '    "firstName": "Alice",\n' +
  '    "lastName": "Smith",\n' +
  '    "age": 34,\n' +
  '    "gender": "F",\n' +
  '    "contact": {\n' +
  '      "email": "alice@example.com",\n' +
  '      "phone": "123-456-7890"\n' +
  '    },\n' +
  '    "address": {\n' +
  '      "city": "Berlin",\n' +
  '      "postalCode": "10115"\n' +
  '    },\n' +
  '    "roles": [1, 2]\n' +
  '  },\n' +
  '  "experiments": [\n' +
  '    {\n' +
  '      "id": "exp1",\n' +
  '      "temperature": 273,\n' +
  '      "reagentType": 1,\n' +
  '      "chemicals": [\n' +
  '        { "name": "H2O", "amount": 10 },\n' +
  '        { "name": "NaCl", "amount": 5 }\n' +
  '      ]\n' +
  '    },\n' +
  '    {\n' +
  '      "id": "exp2",\n' +
  '      "temperature": 300,\n' +
  '      "reagentType": 2,\n' +
  '      "chemicals": [\n' +
  '        { "name": "C6H12O6", "amount": 15 },\n' +
  '        { "name": "NaOH", "amount": 3 }\n' +
  '      ]\n' +
  '    }\n' +
  '  ]\n' +
  '}';

export const JSONATA_INPUT_EXAMPLE_SCHEMA =
  '{\n' +
  '  "$schema": "https://json-schema.org/draft/2020-12/schema",\n' +
  '  "$id": "https://example.com/schema/experiment-input.json",\n' +
  '  "title": "ExperimentInput",\n' +
  '  "type": "object",\n' +
  '  "properties": {\n' +
  '    "person": {\n' +
  '      "type": "object",\n' +
  '      "properties": {\n' +
  '        "firstName": {\n' +
  '          "type": "string"\n' +
  '        },\n' +
  '        "lastName": {\n' +
  '          "type": "string"\n' +
  '        },\n' +
  '        "age": {\n' +
  '          "type": "integer",\n' +
  '          "minimum": 0\n' +
  '        },\n' +
  '        "gender": {\n' +
  '          "type": "string",\n' +
  '          "enum": ["F", "M"]\n' +
  '        },\n' +
  '        "email": {\n' +
  '          "type": "string",\n' +
  '          "format": "email"\n' +
  '        },\n' +
  '        "address": {\n' +
  '          "type": "object",\n' +
  '          "properties": {\n' +
  '            "city": {\n' +
  '              "type": "string"\n' +
  '            },\n' +
  '            "postalCode": {\n' +
  '              "type": "string"\n' +
  '            }\n' +
  '          },\n' +
  '          "required": ["city", "postalCode"]\n' +
  '        },\n' +
  '        "roles": {\n' +
  '          "type": "array",\n' +
  '          "items": {\n' +
  '            "type": "string",\n' +
  '            "enum": ["editor", "reviewer", "admin"]\n' +
  '          }\n' +
  '        }\n' +
  '      },\n' +
  '      "required": ["firstName", "lastName", "age", "gender", "email", "address", "roles"]\n' +
  '    },\n' +
  '    "experiments": {\n' +
  '      "type": "array",\n' +
  '      "items": {\n' +
  '        "type": "object",\n' +
  '        "properties": {\n' +
  '          "id": {\n' +
  '            "type": "string"\n' +
  '          },\n' +
  '          "temperature": {\n' +
  '            "type": "number"\n' +
  '          },\n' +
  '          "reagentType": {\n' +
  '            "type": "integer",\n' +
  '            "enum": [1, 2, 3]\n' +
  '          },\n' +
  '          "chemicals": {\n' +
  '            "type": "array",\n' +
  '            "items": {\n' +
  '              "type": "object",\n' +
  '              "properties": {\n' +
  '                "name": {\n' +
  '                  "type": "string"\n' +
  '                },\n' +
  '                "amount": {\n' +
  '                  "type": "number"\n' +
  '                }\n' +
  '              },\n' +
  '              "required": ["name", "amount"]\n' +
  '            }\n' +
  '          }\n' +
  '        },\n' +
  '        "required": ["id", "temperature", "reagentType", "chemicals"]\n' +
  '      }\n' +
  '    }\n' +
  '  },\n' +
  '  "required": ["person", "experiments"]\n' +
  '}';

export const JSONATA_OUTPUT_EXAMPLE =
  '{\n' +
  '  "fullName": "Alice Smith",\n' +
  '  "isAdult": true,\n' +
  '  "contactInfo": {\n' +
  '    "email": "alice@example.com",\n' +
  '    "phone": "123-456-7890"\n' +
  '  },\n' +
  '  "location": "Berlin 10115",\n' +
  '  "roleList": [\n' +
  '    "Role #1: 1",\n' +
  '    "Role #2: 2"\n' +
  '  ],\n' +
  '  "experimentSummaries": [\n' +
  '    {\n' +
  '      "experimentId": "exp1",\n' +
  '      "reagent": "Acidic",\n' +
  '      "chemicalSummary": [\n' +
  '        "H2O: 10ml",\n' +
  '        "NaCl: 5ml"\n' +
  '      ],\n' +
  '      "isCold": true\n' +
  '    },\n' +
  '    {\n' +
  '      "experimentId": "exp2",\n' +
  '      "reagent": "Basic",\n' +
  '      "chemicalSummary": [\n' +
  '        "C6H12O6: 15ml",\n' +
  '        "NaOH: 3ml"\n' +
  '      ],\n' +
  '      "isCold": false\n' +
  '    }\n' +
  '  ],\n' +
  '  "totalChemicalAmount": 33\n' +
  '}';

export const JSONATA_EXPRESSION =
  '{\n' +
  '  "fullName": person.firstName & " " & person.lastName,\n' +
  '  "isAdult": person.age >= 18,\n' +
  '  "contactInfo": {\n' +
  '    "email": person.contact.email,\n' +
  '    "phone": person.contact.phone\n' +
  '  },\n' +
  '  "location": person.address.city & " " & person.address.postalCode,\n' +
  '  "roleList": $map(person.roles, function($v, $i) {\n' +
  '    "Role #" & ($i+1) & ": " & $string($v)\n' +
  '  }),\n' +
  '  "experimentSummaries": $map(experiments, function($exp) {\n' +
  '    {\n' +
  '      "experimentId": $exp.id,\n' +
  '      "reagent": $lookup({\n' +
  '        "1": "Acidic",\n' +
  '        "2": "Basic",\n' +
  '        "3": "Neutral"\n' +
  '      }, $string($exp.reagentType)),\n' +
  '      "chemicalSummary": $map($exp.chemicals, function($chem) {\n' +
  '        $chem.name & ": " & $string($chem.amount) & "ml"\n' +
  '      }),\n' +
  '      "isCold": $exp.temperature < 290\n' +
  '    }\n' +
  '  }),\n' +
  '  "totalChemicalAmount": $reduce(\n' +
  '    experiments.chemicals.amount,\n' +
  '    function($sum, $val) { $sum + $val },\n' +
  '    0\n' +
  '  )\n' +
  '}';

export const JSONATA_OUTPUT_EXAMPLE_SCHEMA =
  '{\n' +
  '  "$schema": "http://json-schema.org/draft-07/schema#",\n' +
  '  "title": "Person Experiment Summary",\n' +
  '  "type": "object",\n' +
  '  "properties": {\n' +
  '    "fullName": {\n' +
  '      "type": "string"\n' +
  '    },\n' +
  '    "isAdult": {\n' +
  '      "type": "boolean"\n' +
  '    },\n' +
  '    "contactInfo": {\n' +
  '      "type": "object",\n' +
  '      "properties": {\n' +
  '        "email": {\n' +
  '          "type": "string",\n' +
  '          "format": "email"\n' +
  '        },\n' +
  '        "phone": {\n' +
  '          "type": "string"\n' +
  '        }\n' +
  '      },\n' +
  '      "required": ["email", "phone"]\n' +
  '    },\n' +
  '    "location": {\n' +
  '      "type": "string"\n' +
  '    },\n' +
  '    "roleList": {\n' +
  '      "type": "array",\n' +
  '      "items": {\n' +
  '        "type": "string"\n' +
  '      }\n' +
  '    },\n' +
  '    "experimentSummaries": {\n' +
  '      "type": "array",\n' +
  '      "items": {\n' +
  '        "type": "object",\n' +
  '        "properties": {\n' +
  '          "experimentId": {\n' +
  '            "type": "string"\n' +
  '          },\n' +
  '          "reagent": {\n' +
  '            "type": "string",\n' +
  '            "enum": ["Acidic", "Basic", "Neutral"]\n' +
  '          },\n' +
  '          "chemicalSummary": {\n' +
  '            "type": "array",\n' +
  '            "items": {\n' +
  '              "type": "string"\n' +
  '            }\n' +
  '          },\n' +
  '          "isCold": {\n' +
  '            "type": "boolean"\n' +
  '          }\n' +
  '        },\n' +
  '        "required": ["experimentId", "reagent", "chemicalSummary", "isCold"]\n' +
  '      }\n' +
  '    },\n' +
  '    "totalChemicalAmount": {\n' +
  '      "type": "number"\n' +
  '    }\n' +
  '  },\n' +
  '  "required": [\n' +
  '    "fullName",\n' +
  '    "isAdult",\n' +
  '    "contactInfo",\n' +
  '    "location",\n' +
  '    "roleList",\n' +
  '    "experimentSummaries",\n' +
  '    "totalChemicalAmount"\n' +
  '  ]\n' +
  '}\n'; // todo: add descriptions?

export const JSONATA_REFERENCE_GUIDE =
  'JSONata Reference Guide\n' +
  '\n' +
  'IMPORTANT: ONLY generate VALID JSONata syntax.\n' +
  'JSONata is a declarative transformation language. It is NOT JavaScript.\n' +
  'ALWAYS return a SINGLE JSONata expression in valid syntax.' +
  '\n' +
  'Supported JSONata keywords and constructs:\n' +
  'Aggregation Fct: $sum(array), $max(array), $min(array), $average(array)\n' +
  'Array Fct: $count(array), $append(a1, a2), $sort(array [, function]), $reverse(array), $shuffle(array), $distinct(array), $zip(array1, ...)\n' +
  'Boolean Fct: $boolean(arg), $not(arg), $exists()\n' +
  'Boolean Operators: and, or\n' +
  'Comparison Operators: =, !=, <, <=, >, >=, in\n' +
  'Composition: everything is an expression, can be nested\n' +
  'Construction: construct arrays with [] and objects with {} directly in expressions to shape the output. It is a superset of JSON, so you can use JSON templates and insert expressions to fill in data dynamically.\n' +
  'Date time Fct: $now(), $millis(), $fromMillis(number), $toMillis(timestamp)\n' +
  'Expressions: JSONata supports expressions for strings, numbers, comparisons, and Booleans, allowing powerful data manipulation. Strings can be concatenated using &, numbers support arithmetic operations like +, -, *, /, and %, and comparison operators include =, !=, <, >, and in. Boolean expressions use and, or, and the not() function for combining conditions, often in predicates.\n' +
  'Numeric Fct: $number(arg), $abs(number), $floor(number), $round(number), $sqrt(number), $random(), $formatNumber(number, picture), $formatInteger(number, picture), $parseInteger(string, picture)\n' +
  'Numeric Operators: +, -, *, /, %, ..\n' +
  'Object Fct: $keys(object), $lookup(object, key): Returns the value associated with key in object. If the first argument is an array of objects, then all of the objects in the array are searched, and the values associated with all occurrences of key are returned, only ever 2 arguments!; $merge(array<object>), $sift(object, function), $each(object, function), $type(value)\n' +
  'Other Operators: The string concatenation operator & joins two values into a single string, casting non-strings using $string if needed. E.g., "Hello" & "World" results in "HelloWorld". \n' +
  'The conditional ternary operator ? : returns one of two values based on a test condition, casting the condition to Boolean if needed. E.g., Price < 50 ? "Cheap" : "Expensive" returns "Cheap" if Price is less than 50, otherwise "Expensive".\n' +
  'The := operator binds a value to a variable scoped to the current and nested blocks. E.g., $five := 5 assigns 5 to $five, and $square := function($n) { $n * $n } defines a squaring function.\n' +
  'The ~> operator enables clear and readable chaining of functions by passing the result of the left-hand expression into the function on the right. For example, instead of nesting functions like $uppercase($substringBefore($substringAfter(Customer.Email, "@"), ".")), you can write Customer.Email ~> $substringAfter("@") ~> $substringBefore(".") ~> $uppercase(). It can also be used to define composed functions like ($uppertrim := $trim ~> $uppercase; $uppertrim(" Hello World ")), which returns "HELLO WORLD".\n' +
  "The ~> | ... | ... | operator performs object transformation, allowing you to create a modified deep copy of an object while leaving the rest untouched. It works by selecting a target location within the object (e.g., Account.Order.Product), merging in an update object (e.g., {'Price': Price * 1.2}), and optionally deleting specified fields (e.g., ['Price', 'Quantity']). For example, payload ~> |Account.Order.Product|{'Price': Price * 1.2}| increases all product prices by 20% in a copied object, while |Account.Order.Product|{'Total': Price * Quantity}, ['Price', 'Quantity']| adds a Total and removes Price and Quantity. These transforms can be assigned to variables (e.g., $increasePrice := ...) or chained for more complex modifications.\n" +
  'Path Operators: . (Map), [ ... ] (Filter), , ^( ... ) (Order-by), { ... } (Reduce), * (Wildcard), ** (Descendants), % (Parent), # (Positional variable binding), @ (Context variable binding)\n' +
  'Predicates: filter items in a location path by evaluating a Boolean expression for each item, keeping only those where the expression is true. Singleton values and single-element arrays are treated equivalently, but adding empty brackets [] ensures results are always returned as arrays for consistent processing. Wildcards * select all fields at one level, while the descendant wildcard ** traverses all nested levels to select matching values anywhere in the structure.\n' +
  'Regular Expressions: are supported using /regex/flags syntax. These regex functions can be used with built-in functions like $match, $contains, $split, and $replace, or within predicates using the ~> chain operator. Example: Account.Order.Product[\\Product Name` ~> /hat/i]` matches all products with "hat" in their name, case-insensitively.\n' +
  'Strings: $string(arg), $length(str), $substring(str, start[, length]), $substringBefore(str, chars), $substringAfter(str, chars), $uppercase(str), $lowercase(str), $trim(str), $contains(str, pattern), $split(str, separator), $join(array[, separator]), $match(str, pattern), $replace(str, pattern, replacement), $eval(expr)\n' +
  'Higher order functions:\n' +
  '$map(array, function): Applies a given function to each element of an input array and returns a new array with the results. The function receives the current value, its index, and the full array as parameters. It supports both built-in functions and custom lambda functions. Function signature: function(value [, index [, array]]).\n' +
  'Examples: \n' +
  '$map([1..5], $string) => ["1", "2", "3", "4", "5"]\n' +
  'Other example with user-defined (lambda) function:\n' +
  '\n' +
  '$map(Email.address, function($v, $i, $a) {\n' +
  "   'Item ' & ($i+1) & ' of ' & $count($a) & ': ' & $v\n" +
  '})\n' +
  'evaluates to:\n' +
  '\n' +
  '[\n' +
  '  "Item 1 of 4: fred.smith@my-work.com",\n' +
  '  "Item 2 of 4: fsmith@my-work.com",\n' +
  '  "Item 3 of 4: freddy@my-social.com",\n' +
  '  "Item 4 of 4: frederic.smith@very-serious.com"\n' +
  ']' +
  '\n' +
  '$filter(array, function): Returns an array containing only the values in the array parameter that satisfy the function predicate (i.e. function returns Boolean true when passed the value).\n' +
  'Example The following expression returns all the products whose price is higher than average:\n' +
  '$filter(Account.Order.Product, function($v, $i, $a) {\n' +
  '  $v.Price > $average($a.Price)\n' +
  '})\n' +
  '$single(array, function): Returns the one and only one value in the array parameter that satisfy the function predicate (i.e. function returns Boolean true when passed the value). Throws an exception if the number of matching values is not exactly one.\n' +
  '$reduce(array, function [, init]): Returns an aggregated value derived from applying the function parameter successively to each value in array in combination with the result of the previous application of the function.\n' +
  'Example: Example\n' +
  '(\n' +
  '  $product := function($i, $j){$i * $j};\n' +
  '  $reduce([1..5], $product)\n' +
  ')\n' +
  'This multiplies all the values together in the array [1..5] to return 120.\n' +
  '$sift(object, function): Returns an object that contains only the key/value pairs from the object parameter that satisfy the predicate function passed in as the second parameter. Example: Account.Order.Product.$sift(function($v, $k) {$k ~> /^Product/})\n' +
  '\n' +
  'If a path that should be accessed contains special symbols (e.g., @), then put quotation marks around the path element with special characters. For example change ```"@id": $exp.@id``` into ```"@id": $exp."@id"```\n' +
  '\n' +
  'JSONata is a declarative functional query language for transforming JSON, supporting types like string, number, boolean, null, object, array, and function. It processes data as sequences: empty sequences are ignored, singletons are returned as raw values, and multi-item sequences are returned as arrays—with automatic flattening of nested sequences. Path expressions apply functional stages such as map (seq.expr), filter (seq[expr]), sort (seq^(expr)), reduce (seq{...}), and context binding (@$ and #$). Operator precedence affects how expressions are evaluated and can be overridden using parentheses, which also scope variables.\n' +
  'JSONata supports functional programming constructs, including variables, functions, and recursion, enabling powerful and expressive data transformations. Variables, prefixed with $, can store values or functions and have block-local scope. Functions are first-class citizens, can be defined anonymously or assigned to variables, and may use typed signatures for input validation. Recursive and tail-recursive functions are supported, allowing efficient deep operations like factorial computation without stack overflow. Higher-order functions enable functional composition by accepting or returning other functions, such as a $twice function that applies another function twice.\n' +
  '\n';
