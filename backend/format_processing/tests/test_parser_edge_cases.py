import json

from rdflib import Graph
from rdflib.compare import isomorphic

from format_detection import detect_format_and_parse


def test_json_lines_is_detected_after_regular_json_rejects_it():
    result = detect_format_and_parse(
        "records.json",
        "application/json",
        '{"value": 1}\n{"value": 2}\n',
    )

    assert result.format == "jsonl"
    assert result.parsed_json == [{"value": 1}, {"value": 2}]


def test_semicolon_csv_preserves_a_quoted_delimiter():
    result = detect_format_and_parse(
        "records.csv",
        "text/csv",
        'name;note\nAda;"hello; world"\n',
    )

    assert result.format == "csv"
    assert result.parsed_json == [{"name": "Ada", "note": "hello; world"}]


def test_duplicate_tabular_headers_preserve_rows_as_arrays():
    result = detect_format_and_parse(
        "records.tsv",
        "text/tab-separated-values",
        "value\tvalue\nfirst\tsecond\n",
    )

    assert result.format == "tsv"
    assert result.parsed_json == [["value", "value"], ["first", "second"]]


def test_toml_dates_are_serialized_as_json_strings():
    result = detect_format_and_parse(
        "person.toml",
        "application/toml",
        "name = \"Ada\"\nbirth_date = 1815-12-10\n",
    )

    assert result.format == "toml"
    assert result.parsed_json == {"name": "Ada", "birth_date": "1815-12-10"}


def test_compacted_json_ld_preserves_rdf_lists_blank_nodes_and_tagged_literals():
    turtle = """@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ex:item ex:label "Hallo"@de ;
  ex:count "7"^^xsd:integer ;
  ex:parts (ex:a ex:b) ;
  ex:details [ ex:name "nested" ] .
"""
    result = detect_format_and_parse("complex.ttl", "text/turtle", turtle)

    assert result.format == "ttl"
    assert result.parsed_json["@context"] == {"ex": "http://example.org/"}
    assert isinstance(result.parsed_json["@graph"], list)

    item = next(node for node in result.parsed_json["@graph"] if node.get("@id") == "ex:item")
    assert item["ex:count"] == 7
    assert item["ex:label"] == {"@language": "de", "@value": "Hallo"}
    assert item["ex:parts"] == {"@list": [{"@id": "ex:a"}, {"@id": "ex:b"}]}

    source_graph = Graph().parse(data=turtle, format="turtle")
    json_ld_graph = Graph().parse(
        data=json.dumps(result.parsed_json),
        format="json-ld",
    )
    assert isomorphic(source_graph, json_ld_graph)


def test_json_ld_without_declared_prefixes_still_has_a_graph_root():
    result = detect_format_and_parse(
        "absolute.ttl",
        "text/turtle",
        '<http://example.org/subject> <http://example.org/predicate> "value" .\n',
    )

    assert result.format == "ttl"
    assert "@context" not in result.parsed_json
    assert result.parsed_json["@graph"] == [
        {
            "@id": "http://example.org/subject",
            "http://example.org/predicate": [{"@value": "value"}],
        }
    ]


def test_invalid_turtle_falls_back_without_an_internal_error():
    result = detect_format_and_parse(
        "broken.ttl",
        "text/turtle",
        "@prefix ex: <http://example.org/> .\nex:subject ex:predicate .\n",
    )

    assert result.recognized is False
    assert result.format == "unknown"
    assert result.parsed_json is None


def test_properties_keys_named_base_and_prefix_are_not_treated_as_rdf():
    result = detect_format_and_parse(
        "app.properties",
        "text/plain",
        "base = /var/log\nprefix=app\nurl = <http://example.org/x>\n",
    )

    assert result.format == "properties"
    assert result.parsed_json["base"] == "/var/log"
    assert result.parsed_json["url"] == "<http://example.org/x>"
