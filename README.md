# Question Bank Generator

将 OCR 结果整理为结构化题库 JSON，并提供一个零依赖的静态刷题页面。

## Quick Start

运行这个项目最简单的方式：

```bash
cd D:\Github\Question-bank-generator
python -m http.server 8000
```

然后在浏览器打开：

```text
http://localhost:8000
```

注意：不要直接双击 `index.html`，否则浏览器通常会因为 `file://` 限制而拦截 `questions.json` 的加载。

## Current Status

- 已生成 [`questions.json`](./questions.json)，共 280 题
- 已实现静态刷题页：题型筛选、即时判题、错题集、LocalStorage 进度保存
- 解析来源不是直接 PDF 文本抽取，而是 [`Question_bank2026.pdf_by_PaddleOCR-VL-1.5.json`](./Question_bank2026.pdf_by_PaddleOCR-VL-1.5.json)

## Project Structure

- [`parse_pdf.py`](./parse_pdf.py): 将 PaddleOCR-VL 输出整理为题库 JSON
- [`questions.json`](./questions.json): 前端直接消费的结构化题库数据
- [`index.html`](./index.html): 页面结构
- [`app.js`](./app.js): 刷题逻辑、判题、错题集、进度持久化
- [`style.css`](./style.css): 页面样式
- [`Question_bank2026.pdf_by_PaddleOCR-VL-1.5.json`](./Question_bank2026.pdf_by_PaddleOCR-VL-1.5.json): OCR 原始解析结果

## Data Format

`questions.json` 中每条记录的结构如下：

```json
{
  "id": 1,
  "type": "单选",
  "question": "题干",
  "options": ["A. 选项1", "B. 选项2"],
  "answer": "A"
}
```

其中：

- `type` 取值为 `单选`、`多选`、`判断`
- 多选题答案会标准化为 `A,B,D` 这种格式

## How To Run

不要直接双击 `index.html`。页面使用 `fetch("questions.json")` 读取数据，浏览器在 `file://` 场景下通常会拦截。

推荐在项目目录启动一个本地静态服务器：

```bash
cd D:\Github\Question-bank-generator
python -m http.server 8000
```

然后在浏览器打开：

```text
http://localhost:8000
```

如果你用 VS Code，也可以直接用 Live Server 之类的静态服务插件。

## Regenerate Questions

如需重新从 OCR 结果生成题库：

```bash
cd D:\Github\Question-bank-generator
python parse_pdf.py
```

当前脚本会校验：

- 必须识别出 280 道题
- 题号必须连续为 1 到 280
- 每道题必须能提取到答案

## Verified Locally

已确认：

- `python parse_pdf.py` 可以重新生成 `questions.json`
- `questions.json` 当前包含 280 道题，字段完整
- 通过 `python -m http.server 8000` 启动后，页面可正常加载题目
- 直接用 `file://` 打开时，页面会显示明确的错误提示，而不是静默失败

## Known Limitations

- 当前未保留原始 PDF 页码和位置信息
- 题库提取依赖现有 OCR JSON 结构，如果 PaddleOCR 输出字段变化，`parse_pdf.py` 需要同步调整
