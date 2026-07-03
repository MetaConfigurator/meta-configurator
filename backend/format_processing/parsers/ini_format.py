from configparser import ConfigParser
from typing import Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai


def parse_data(content: str) -> Optional[ParserAttempt]:
    if '<' in content[:200] and '>' in content[:200]:
        return None

    parser = ConfigParser(interpolation=None)
    try:
        parser.read_string(content)
    except Exception:
        return None

    if len(parser.sections()) == 0:
        return None

    data = {
        section: {key: value for key, value in parser.items(section)}
        for section in parser.sections()
    }
    return ParserAttempt(
        format='ini',
        parsed_json=data,
        parser_name='python-configparser',
    )

