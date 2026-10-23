from typing import NamedTuple


class KnownFormatFixture(NamedTuple):
    file_name: str
    mime_type: str
    expected_format: str


KNOWN_FORMAT_FIXTURES = (
    KnownFormatFixture("sample.json", "application/json", "json"),
    KnownFormatFixture("sample.yaml", "application/yaml", "yaml"),
    KnownFormatFixture("sample.xml", "application/xml", "xml"),
    KnownFormatFixture("sample.csv", "text/csv", "csv"),
    KnownFormatFixture("sample.tsv", "text/tab-separated-values", "tsv"),
    KnownFormatFixture("sample.ttl", "text/turtle", "ttl"),
    KnownFormatFixture("sample.cif", "chemical/x-cif", "cif"),
    KnownFormatFixture("sample.mpif", "text/plain", "star_family"),
    KnownFormatFixture("sample.toml", "application/toml", "toml"),
    KnownFormatFixture("sample.ini", "text/plain", "ini"),
    KnownFormatFixture("sample.jsonl", "application/json", "jsonl"),
    KnownFormatFixture("sample.env", "text/plain", "dotenv"),
    KnownFormatFixture("sample.properties", "text/plain", "properties"),
    KnownFormatFixture("sample.md", "text/markdown", "markdown_table"),
)
