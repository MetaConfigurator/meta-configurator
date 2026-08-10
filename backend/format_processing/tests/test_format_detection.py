import unittest
import sys
import json
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

import format_detection as fd
from format_detection import detect_format_and_parse
from preprocess import preprocess_data_for_ai


class TestFormatDetection(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixture_dir = Path(__file__).parent / "fixtures"

    def _read_fixture(self, name: str) -> str:
        return (self.fixture_dir / name).read_text(encoding="utf-8")

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
                if expected_format == "yaml" and fd.yaml is None:
                    self.skipTest(
                        "Skipping YAML detection test because PyYAML is not installed."
                    )
                if expected_format == "xml" and fd.xmltodict is None:
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
                if expected_format == "cpp_source":
                    self.assertIsInstance(result.parsed_json, dict)
                    self.assertEqual(result.parsed_json.get("language"), "cpp")
                    self.assertEqual(
                        result.parsed_json.get("root_type"), "translation_unit"
                    )
                    self.assertEqual(
                        result.parsed_json.get("representation"),
                        "syntax_tree_with_summary",
                    )
                    self.assertIn("syntax_tree", result.parsed_json)
                    self.assertIn("summary", result.parsed_json)
                    summary = result.parsed_json.get("summary", {})
                    self.assertIn("includes", summary)
                    self.assertIn("functions", summary)
                    self.assertIn("classes", summary)
                    self.assertTrue(
                        any(
                            isinstance(function, dict)
                            and function.get("name") == "main"
                            for function in summary.get("functions", [])
                        )
                    )
                if expected_format == "python_source":
                    self.assertIsInstance(result.parsed_json, dict)
                    self.assertEqual(result.parsed_json.get("language"), "python")
                    self.assertEqual(result.parsed_json.get("root_type"), "module")
                    self.assertEqual(
                        result.parsed_json.get("representation"), "summary"
                    )
                    self.assertIn("imports", result.parsed_json)
                    self.assertIn("classes", result.parsed_json)
                    self.assertIn("functions", result.parsed_json)
                    self.assertTrue(
                        any(
                            isinstance(function, dict)
                            and function.get("name") == "build"
                            for function in result.parsed_json.get("functions", [])
                        )
                    )
                if expected_format == "java_source":
                    self.assertIsInstance(result.parsed_json, dict)
                    self.assertEqual(result.parsed_json.get("language"), "java")
                    self.assertEqual(result.parsed_json.get("root_type"), "program")
                    self.assertEqual(
                        result.parsed_json.get("representation"),
                        "syntax_tree_with_summary",
                    )
                    self.assertIn("syntax_tree", result.parsed_json)
                    self.assertIn("summary", result.parsed_json)
                    summary = result.parsed_json.get("summary", {})
                    self.assertEqual(summary.get("package"), "demo")
                    self.assertIn("imports", summary)
                    self.assertIn("classes", summary)
                    self.assertTrue(
                        any(
                            isinstance(clazz, dict) and clazz.get("name") == "Job"
                            for clazz in summary.get("classes", [])
                        )
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
        if fd.gemmi is None:
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

    def test_cpp_summary_extracts_benchmark_registrations(self) -> None:
        content = """
#include <benchmark/benchmark.h>

static void tagInBBIndex(benchmark::State &state)
{
  benchmark::DoNotOptimize(state);
}

BENCHMARK(tagInBBIndex)->Name("Tag inside box with index")->Arg(100000)->Arg(1000000);
""".strip()
        result = detect_format_and_parse("bench.cpp", "text/x-c++src", content)
        self.assertTrue(result.recognized)
        self.assertEqual(result.format, "cpp_source")
        self.assertIsInstance(result.parsed_json, dict)
        self.assertIn("syntax_tree", result.parsed_json)
        registrations = result.parsed_json.get("summary", {}).get(
            "benchmark_registrations", []
        )
        self.assertEqual(len(registrations), 1)
        self.assertEqual(registrations[0].get("target"), "tagInBBIndex")
        self.assertEqual(registrations[0].get("name"), "Tag inside box with index")
        self.assertEqual(registrations[0].get("args"), [100000, 1000000])

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
