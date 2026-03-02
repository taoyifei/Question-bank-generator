# Question Bank Generator

将 OCR 结果整理为结构化题库 JSON，并提供一个零依赖的静态刷题页面。

## Quick Start

本机启动：

```bash
cd D:\Github\Question-bank-generator
python -m http.server 8000 --bind 127.0.0.1
```

然后在浏览器打开：

```text
http://127.0.0.1:8000/
```

注意：

- 不要直接双击 `index.html`
- 页面会通过 `fetch("questions.json")` 读取题库，`file://` 场景下浏览器通常会拦截

## Public Access With natapp

如果你想把这个页面临时暴露到公网，可以用 natapp 把本地 `127.0.0.1:8000` 映射出去。

### 1. 先确认本地服务正常

先启动项目：

```bash
cd D:\Github\Question-bank-generator
python -m http.server 8000 --bind 127.0.0.1
```

然后本机访问：

```text
http://127.0.0.1:8000/
```

确认页面能正常打开之后，再做 natapp 映射。

### 2. 注册 natapp 并创建 Web 隧道

在 natapp 官网注册账号并创建一个 Web 隧道。

- 免费隧道：官方说明提供随机域名
- 付费 Web 隧道：官方首页说明通常是固定域名，但需要绑定域名后使用

### 3. 下载 natapp Windows 客户端

下载与你系统匹配的 Windows 客户端，解压后得到 `natapp.exe`。

### 4. 获取 authtoken

登录 natapp 后台，在“我的隧道”里找到该隧道对应的 `authtoken`。

### 5. 运行 natapp

在 `natapp.exe` 所在目录运行：

```bash
natapp -authtoken=你的authtoken
```

如果你更喜欢配置文件方式，也可以把 `config.ini` 放在 `natapp.exe` 同级目录，然后填写：

```ini
[default]
authtoken=你的authtoken
log=none
loglevel=ERROR
http_proxy=
```

然后直接运行：

```bash
natapp
```

### 6. 找到公网地址

natapp 启动成功后，控制台会显示一行 `Forwarding`，那就是公网可访问地址。

例如：

```text
https://xxxx.natappfree.cc
```

或者：

```text
http://xxxx.natappfree.cc
```

把这个地址发给别人，对方就可以直接访问你本机上的题库页面。

## Project Structure

- `parse_pdf.py`: 将 PaddleOCR-VL 输出整理为题库 JSON
- `questions.json`: 前端直接消费的结构化题库数据
- `index.html`: 页面结构
- `app.js`: 刷题逻辑、判题、错题集、进度持久化
- `style.css`: 页面样式
- `Question_bank2026.pdf_by_PaddleOCR-VL-1.5.json`: OCR 原始解析结果

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
- 通过 `python -m http.server 8000 --bind 127.0.0.1` 启动后，页面可正常加载
- 直接用 `file://` 打开时，页面会显示明确的错误提示，而不是静默失败

## Known Limitations

- 当前未保留原始 PDF 页码和位置信息
- 题库提取依赖现有 OCR JSON 结构，如果 PaddleOCR 输出字段变化，`parse_pdf.py` 需要同步调整
