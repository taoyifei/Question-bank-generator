from __future__ import annotations

import json
import re
from pathlib import Path


INPUT_PATH = Path("Question_bank2026.pdf_by_PaddleOCR-VL-1.5.json")
OUTPUT_PATH = Path("questions.json")
EXPECTED_QUESTION_COUNT = 280
QUESTION_ID_RANGE = list(range(1, EXPECTED_QUESTION_COUNT + 1))

QUESTION_START_RE = re.compile(r"(\d{1,3})、【(单选|多选|判断)】")
QUESTION_HEADER_RE = re.compile(r"^\d{1,3}、【(?:单选|多选|判断)】\s*")
ANSWER_RE = re.compile(r"答案[：:]\s*([A-D](?:\s*[、,，]\s*[A-D])*)")
OPTION_RE = re.compile(
    r"([A-D])[\.．]\s*(.*?)(?=\n\s*[A-D][\.．]|\n\s*答案[：:]|\Z)",
    re.S,
)

TEXT_BLOCK_LABELS = {"text", "doc_title"}
TRUE_FALSE_OPTIONS = {"对", "错", "正确", "错误"}
QUESTION_TYPES = ("单选", "多选", "判断")
SPECIAL_CASE_REPLACEMENTS = {
    249: ("212、", "213、"),
}


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def normalize_answer(question_type: str, raw_answer: str) -> str:
    letters = re.findall(r"[A-D]", raw_answer.upper())
    if question_type == "多选":
        return ",".join(sorted(dict.fromkeys(letters)))
    return letters[0] if letters else normalize_whitespace(raw_answer)


def load_ocr_pages(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def extract_text_blocks(pages: list[dict]) -> list[str]:
    blocks: list[str] = []
    for page in pages:
        parsing_results = page.get("prunedResult", {}).get("parsing_res_list", [])
        for block in parsing_results:
            content = block.get("block_content")
            if block.get("block_label") in TEXT_BLOCK_LABELS and content:
                blocks.append(content)
    return blocks


def apply_special_case_fixes(question_id: int, raw_block: str) -> str:
    cleaned_block = raw_block
    for token in SPECIAL_CASE_REPLACEMENTS.get(question_id, ()):
        cleaned_block = cleaned_block.replace(token, "")
    return cleaned_block


def infer_question_type(question_type: str, option_texts: list[str]) -> str:
    is_true_false = len(option_texts) == 2 and set(option_texts) <= TRUE_FALSE_OPTIONS
    if question_type == "单选" and is_true_false:
        return "判断"
    return question_type


def parse_question_block(question_id: int, question_type: str, raw_block: str) -> dict:
    block = apply_special_case_fixes(question_id, raw_block.strip())
    body = QUESTION_HEADER_RE.sub("", block, count=1)

    answer_match = ANSWER_RE.search(body)
    assert answer_match, f"No answer for Q{question_id}"

    option_matches = list(OPTION_RE.finditer(body))
    question_end = option_matches[0].start() if option_matches else answer_match.start()

    option_texts = [normalize_whitespace(match.group(2)) for match in option_matches]
    normalized_type = infer_question_type(question_type, option_texts)

    return {
        "id": question_id,
        "type": normalized_type,
        "question": normalize_whitespace(body[:question_end]),
        "options": [f"{match.group(1)}. {text}" for match, text in zip(option_matches, option_texts)],
        "answer": normalize_answer(normalized_type, answer_match.group(1)),
    }


def parse_questions(full_text: str) -> list[dict]:
    starts = list(QUESTION_START_RE.finditer(full_text))
    assert len(starts) == EXPECTED_QUESTION_COUNT, (
        f"Expected {EXPECTED_QUESTION_COUNT} starts, got {len(starts)}"
    )

    questions: list[dict] = []
    for index, match in enumerate(starts):
        question_id = int(match.group(1))
        question_type = match.group(2)
        block_end = starts[index + 1].start() if index + 1 < len(starts) else len(full_text)
        raw_block = full_text[match.start():block_end]
        questions.append(parse_question_block(question_id, question_type, raw_block))

    questions.sort(key=lambda question: question["id"])
    parsed_ids = [question["id"] for question in questions]
    assert parsed_ids == QUESTION_ID_RANGE, f"Unexpected question ids: {parsed_ids[:5]} ... {parsed_ids[-5:]}"
    return questions


def write_questions(path: Path, questions: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(questions, file, ensure_ascii=False, indent=2)


def build_distribution(questions: list[dict]) -> dict[str, int]:
    return {
        question_type: sum(1 for question in questions if question["type"] == question_type)
        for question_type in QUESTION_TYPES
    }


def main() -> None:
    pages = load_ocr_pages(INPUT_PATH)
    full_text = "\n\n".join(extract_text_blocks(pages))
    questions = parse_questions(full_text)
    write_questions(OUTPUT_PATH, questions)
    print(f"Parsed {len(questions)} questions. Distribution: {build_distribution(questions)}")


if __name__ == "__main__":
    main()
