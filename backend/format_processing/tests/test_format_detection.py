import unittest
import sys
import json
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

import detection_service
import format_detection as format_detection_module
from format_detection import detect_format_and_parse
from preprocess import preprocess_data_for_ai


# Expected envelope contents per source code format: language, tree-sitter root type,
# the summary keys the parser fills and one symbol that must show up in the summary.
SOURCE_CODE_EXPECTATIONS = {
    "cpp_source": {
        "language": "cpp",
        "root_type": "translation_unit",
        "summary_keys": ["includes", "classes", "functions"],
        "expected_function_name": "main",
    },
    "python_source": {
        "language": "python",
        "root_type": "module",
        "summary_keys": ["imports", "classes", "functions"],
        "expected_function_name": "build",
    },
    "java_source": {
        "language": "java",
        "root_type": "program",
        "summary_keys": ["package", "imports", "classes"],
        "expected_class_name": "Job",
    },
}


class TestFormatDetection(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixture_dir = Path(__file__).parent / "fixtures"

    def _read_fixture(self, name: str) -> str:
        return (self.fixture_dir / name).read_text(encoding="utf-8")

    def _assert_source_code_summary(self, parsed_json, expectations) -> None:
        self.assertIsInstance(parsed_json, dict)
        self.assertEqual(parsed_json.get("language"), expectations["language"])
        self.assertEqual(parsed_json.get("root_type"), expectations["root_type"])
        self.assertEqual(parsed_json.get("representation"), "syntax_tree_with_summary")
        self.assertIn("syntax_tree", parsed_json)

        summary = parsed_json.get("summary", {})
        for summary_key in expectations["summary_keys"]:
            self.assertIn(summary_key, summary)
        for summary_key, expected_name in (
            ("functions", expectations.get("expected_function_name")),
            ("classes", expectations.get("expected_class_name")),
        ):
            if expected_name is None:
                continue
            self.assertTrue(
                any(
                    isinstance(entry, dict) and entry.get("name") == expected_name
                    for entry in summary.get(summary_key, [])
                )
            )

    def test_detects_known_formats(self) -> None:
        cases = [
            ("sample.json", "application/json", "json"),
            ("sample.yaml", "application/yaml", "yaml"),
            ("sample.xml", "application/xml", "xml"),
            ("sample.csv", "text/csv", "csv"),
            ("sample.tsv", "text/tab-separated-values", "tsv"),
            ("sample.ttl", "text/turtle", "ttl"),
            ("sample.mpif", "text/plain", "star_family"),
            ("sample.toml", "application/toml", "toml"),
            ("sample.ini", "text/plain", "ini"),
            ("sample.jsonl", "application/json", "jsonl"),
            ("sample.env", "text/plain", "dotenv"),
            ("sample.properties", "text/plain", "properties"),
            ("sample.md", "text/markdown", "markdown_table"),
            ("sample.cpp", "text/x-c++src", "cpp_source"),
            ("sample.py", "text/x-python", "python_source"),
            ("sample.java", "text/x-java-source", "java_source"),
        ]

        for file_name, mime_type, expected_format in cases:
            with self.subTest(file_name=file_name):
                if expected_format == "yaml" and format_detection_module.yaml is None:
                    self.skipTest(
                        "Skipping YAML detection test because PyYAML is not installed."
                    )
                if expected_format == "xml" and format_detection_module.xmltodict is None:
                    self.skipTest(
                        "Skipping XML detection test because xmltodict is not installed."
                    )
                content = self._read_fixture(file_name)
                result = detect_format_and_parse(file_name, mime_type, content)
                self.assertTrue(result.recognized)
                self.assertEqual(result.format, expected_format)
                self.assertIsNotNone(result.parsed_json)
                self.assertIsNotNone(result.preprocessed_for_ai)
                self.assertTrue(result.display_text)
                self.assertIn("Backend recognized", result.display_text)
                self.assertTrue(result.ai_prompt_hint)
                if expected_format == "ttl":
                    self.assertIsInstance(result.parsed_json, dict)
                    self.assertTrue(
                        "triples" in result.parsed_json
                        or "raw_ttl" in result.parsed_json
                    )
                if expected_format == "star_family" and file_name == "sample.mpif":
                    self.assertIsInstance(result.parsed_json, dict)
                    self.assertGreaterEqual(len(result.parsed_json), 1)
                    first_block = next(iter(result.parsed_json.values()))
                    self.assertIsInstance(first_block, dict)
                    self.assertIn("_mpif_audit_creation_date", first_block)
                if expected_format in SOURCE_CODE_EXPECTATIONS:
                    self._assert_source_code_summary(
                        result.parsed_json, SOURCE_CODE_EXPECTATIONS[expected_format]
                    )

    def test_unknown_format_falls_back_cleanly(self) -> None:
        content = self._read_fixture("sample.unknown.txt")
        result = detect_format_and_parse("sample.unknown.txt", "text/plain", content)
        self.assertFalse(result.recognized)
        self.assertEqual(result.format, "unknown")
        self.assertIsNone(result.parsed_json)
        self.assertIsNone(result.preprocessed_for_ai)
        self.assertIn("Falling back to AI mapping", result.display_text)

    def test_star_when_gemmi_available(self) -> None:
        if format_detection_module.gemmi is None:
            self.skipTest(
                "Skipping STAR detection test because gemmi is not installed."
            )

        content = self._read_fixture("sample.cif")
        result = detect_format_and_parse("sample.cif", "chemical/x-cif", content)
        self.assertTrue(result.recognized)
        self.assertEqual(result.format, "cif")
        self.assertIsNotNone(result.parsed_json)
        self.assertIsInstance(result.parsed_json, dict)
        self.assertIn("global", result.parsed_json)
        self.assertIn("sample_001", result.parsed_json)

        # Verify that key crystallographic metadata survives parsing.
        self.assertIn("_cell_length_a", result.parsed_json["global"])
        self.assertEqual(result.parsed_json["global"]["_cell_length_a"], 4.913)
        self.assertIn("_atom_site_label", result.parsed_json["sample_001"])
        self.assertIsInstance(
            result.parsed_json["sample_001"]["_atom_site_label"], list
        )
        self.assertGreaterEqual(
            len(result.parsed_json["sample_001"]["_atom_site_label"]), 3
        )

    def test_cpp_summary_lists_top_level_calls(self) -> None:
        content = """
#include <registry.h>

static void run(int value)
{
  registerHandler(value);
}

REGISTER(run)->withName("demo");
""".strip()
        result = detect_format_and_parse("registry.cpp", "text/x-c++src", content)
        self.assertTrue(result.recognized)
        self.assertEqual(result.format, "cpp_source")
        summary = result.parsed_json.get("summary", {})
        self.assertIn("REGISTER", [call["callee"] for call in summary["top_level_calls"]])
        self.assertIn(
            "registerHandler",
            [call["callee"] for function in summary["functions"] for call in function["calls"]],
        )

    def test_preprocessed_for_ai_truncates_large_string_fields(self) -> None:
        content = '{"data":"' + ("x" * 5000) + '"}'
        result = detect_format_and_parse("sample.json", "application/json", content)
        self.assertTrue(result.recognized)
        self.assertIsInstance(result.preprocessed_for_ai, dict)
        self.assertIn("TRUNCATED", result.preprocessed_for_ai["data"])

    def test_preprocess_for_ai_iteratively_trims_large_documents(self) -> None:
        large_document = {
            "rows": [
                {
                    "index": index,
                    "payload": "x" * 5000,
                    "values": list(range(20)),
                }
                for index in range(500)
            ],
            "metadata": {f"field_{index}": f"value_{index}" for index in range(800)},
        }

        preprocessed = preprocess_data_for_ai(large_document)
        serialized = json.dumps(
            preprocessed,
            ensure_ascii=False,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")

        self.assertLessEqual(len(serialized), 64 * 1024)
        self.assertIn("rows", preprocessed)
        self.assertIsInstance(preprocessed["rows"], list)
        self.assertLessEqual(len(preprocessed["rows"]), 9)
        self.assertIsInstance(preprocessed["rows"][-1], dict)
        self.assertIn("__truncated_items__", preprocessed["rows"][-1])
        self.assertIn("metadata", preprocessed)
        self.assertIsInstance(preprocessed["metadata"], dict)
        self.assertIn("__truncated_keys__", preprocessed["metadata"])

    def test_preprocess_for_ai_accepts_custom_options(self) -> None:
        large_document = {
            "rows": [{"index": index, "payload": "x" * 3000} for index in range(50)]
        }

        default_preprocessed = preprocess_data_for_ai(large_document)
        strict_preprocessed = preprocess_data_for_ai(
            large_document,
            preprocess_options={
                "target_document_size_kb": 4,
                "initial_array_limit": 8,
                "min_array_limit": 2,
            },
        )

        self.assertIsInstance(default_preprocessed["rows"], list)
        self.assertIsInstance(strict_preprocessed["rows"], list)
        self.assertLess(
            len(strict_preprocessed["rows"]), len(default_preprocessed["rows"])
        )
        self.assertIn("__truncated_items__", strict_preprocessed["rows"][-1])

    def test_supported_format_registry_owns_detection_metadata(self) -> None:
        supported_formats = detection_service.SUPPORTED_FORMATS

        self.assertEqual(
            len({supported_format.name for supported_format in supported_formats}),
            len(supported_formats),
        )
        self.assertTrue(
            all(supported_format.display_name for supported_format in supported_formats)
        )
        self.assertTrue(
            all(supported_format.ai_prompt_hint for supported_format in supported_formats)
        )

        ordered_formats = detection_service._get_formats_ordered_by_match_strength(
            "json", "application/json", "{\"value\": 1}"
        )
        self.assertEqual(
            [supported_format.name for supported_format in ordered_formats[:2]],
            ["json", "jsonl"],
        )

    def test_preprocessing_honors_custom_options(self) -> None:
        preprocessed = preprocess_data_for_ai(
            {"description": "x" * 100},
            preprocess_options={"max_string_len": 10},
        )

        self.assertIn("TRUNCATED", preprocessed["description"])

    def test_library_parsers_handle_escapes_the_old_text_parsers_missed(self) -> None:
        properties_result = detect_format_and_parse(
            "app.properties",
            "text/plain",
            "greeting = hello \\\n  world\nunicode = caf\\u00e9\nescaped\\:key = value\n",
        )
        self.assertTrue(properties_result.recognized)
        self.assertEqual(properties_result.format, "properties")
        self.assertEqual(
            properties_result.parsed_json,
            {"greeting": "hello world", "unicode": "caf\u00e9", "escaped:key": "value"},
        )

        markdown_result = detect_format_and_parse(
            "table.md",
            "text/markdown",
            "| name | note |\n| --- | --- |\n| a \\| b | c |\n",
        )
        self.assertTrue(markdown_result.recognized)
        self.assertEqual(markdown_result.format, "markdown_table")
        self.assertEqual(markdown_result.parsed_json, [{"name": "a | b", "note": "c"}])

    def test_prose_is_not_mistaken_for_key_value_formats(self) -> None:
        result = detect_format_and_parse(
            "notes.txt", "text/plain", "hello world\nthis is prose\n"
        )
        self.assertFalse(result.recognized)
        self.assertEqual(result.format, "unknown")

    def test_star_normalizer_preserves_empty_tab_fields_in_loops(self) -> None:
        content = "\n".join(
            [
                "data_test",
                "loop_",
                "_mpif_solvent_id",
                "_mpif_solvent_cas",
                "_mpif_solvent_amount",
                "_mpif_solvent_amount_unit",
                "nBuOH\t\t500\tmicrolitre",
            ]
        )
        result = detect_format_and_parse("broken.mpif", "text/plain", content)
        self.assertTrue(result.recognized)
        self.assertEqual(result.format, "star_family")
        self.assertIsInstance(result.parsed_json, dict)

        first_block = next(iter(result.parsed_json.values()))
        self.assertIsInstance(first_block, dict)
        self.assertEqual(first_block.get("_mpif_solvent_id"), ["nBuOH"])
        self.assertEqual(first_block.get("_mpif_solvent_cas"), [""])
        self.assertEqual(first_block.get("_mpif_solvent_amount"), [500])
        self.assertEqual(first_block.get("_mpif_solvent_amount_unit"), ["microlitre"])


if __name__ == "__main__":
    unittest.main()
