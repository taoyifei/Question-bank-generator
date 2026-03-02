import json, re

IN_PATH = "Question_bank2026.pdf_by_PaddleOCR-VL-1.5.json"
OUT_PATH = "questions.json"
START_RE = re.compile(r"(\d{1,3})、【(单选|多选|判断)】")

def clean(s):
    return re.sub(r"\s+", " ", s).strip()

def norm_answer(qtype, raw):
    letters = re.findall(r"[A-D]", raw.upper())
    if qtype == "多选":
        return ",".join(sorted(dict.fromkeys(letters)))
    return letters[0] if letters else clean(raw)

def main():
    pages = json.load(open(IN_PATH, encoding="utf-8"))
    blocks = []
    for p in pages:
        for b in p.get("prunedResult", {}).get("parsing_res_list", []):
            if b.get("block_label") in {"text", "doc_title"} and b.get("block_content"):
                blocks.append(b["block_content"])
    text = "\n\n".join(blocks)
    starts = list(START_RE.finditer(text))
    assert len(starts) == 280, f"Expected 280 starts, got {len(starts)}"
    qs = []
    for i, m in enumerate(starts):
        qid, qtype = int(m.group(1)), m.group(2)
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        block = text[m.start():end].strip()
        if qid == 249:
            block = block.replace("212、", "").replace("213、", "")
        body = re.sub(r"^\d{1,3}、【(?:单选|多选|判断)】\s*", "", block, count=1)
        am = re.search(r"答案[：:]\s*([A-D](?:\s*[、,，]\s*[A-D])*)", body)
        assert am, f"No answer for Q{qid}"
        opt_ms = list(re.finditer(r"([A-D])[\.．]\s*(.*?)(?=\n\s*[A-D][\.．]|\n\s*答案[：:]|\Z)", body, re.S))
        first = opt_ms[0].start() if opt_ms else am.start()
        question = clean(body[:first])
        options = [f"{x.group(1)}. {clean(x.group(2))}" for x in opt_ms]
        opt_plain = [clean(x.group(2)) for x in opt_ms]
        if qtype == "单选" and len(options) == 2 and set(opt_plain) <= {"对", "错", "正确", "错误"}:
            qtype = "判断"
        qs.append({"id": qid, "type": qtype, "question": question, "options": options, "answer": norm_answer(qtype, am.group(1))})
    qs.sort(key=lambda x: x["id"])
    assert len(qs) == 280 and [q["id"] for q in qs] == list(range(1, 281))
    json.dump(qs, open(OUT_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    dist = {t: sum(1 for q in qs if q["type"] == t) for t in ["单选", "多选", "判断"]}
    print(f"Parsed {len(qs)} questions. Distribution: {dist}")

if __name__ == "__main__":
    main()
