let questions = [], current = null, mode = "all", answered = false;
const STORAGE_KEY = "quiz_progress";
const TOTAL_QUESTIONS = 280;

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { answers: {}, wrongIds: [] }; }
  catch { return { answers: {}, wrongIds: [] }; }
}
function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}
function updateStats() {
  const p = loadProgress(), total = Object.keys(p.answers).length;
  const correct = Object.values(p.answers).filter(a => a.correct).length;
  const rate = total ? Math.round(correct / total * 100) : 0;
  document.getElementById("stats").textContent = `已答: ${total}/${TOTAL_QUESTIONS} | 正确率: ${rate}% | 错题: ${p.wrongIds.length}`;
}

function renderMessage(message, className = "empty-msg") {
  document.getElementById("questionNum").textContent = "";
  document.getElementById("questionType").textContent = "";
  document.getElementById("questionText").textContent = "";
  document.getElementById("optionsContainer").innerHTML = `<div class="${className}">${message}</div>`;
  document.getElementById("submitBtn").style.display = "none";
  document.getElementById("nextBtn").style.display = "none";
  const fb = document.getElementById("feedback");
  fb.className = "feedback";
  fb.textContent = "";
}

function getPool() {
  const p = loadProgress();
  if (mode === "wrong") return questions.filter(q => p.wrongIds.includes(q.id));
  if (mode === "all") return questions;
  return questions.filter(q => q.type === mode);
}

function showQuestion() {
  answered = false;
  const pool = getPool();
  const fb = document.getElementById("feedback");
  fb.className = "feedback"; fb.textContent = "";
  document.getElementById("submitBtn").style.display = "none";
  document.getElementById("nextBtn").style.display = "none";
  if (!pool.length) {
    renderMessage("暂无题目");
    return;
  }
  current = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById("questionNum").textContent = `第${current.id}题`;
  document.getElementById("questionType").textContent = current.type;
  document.getElementById("questionText").textContent = current.question;
  const isMulti = current.type === "多选";
  const container = document.getElementById("optionsContainer");
  container.innerHTML = current.options.map((opt, i) => {
    const letter = opt.charAt(0);
    const type = isMulti ? "checkbox" : "radio";
    return `<label class="option-label" data-letter="${letter}">
      <input type="${type}" name="answer" value="${letter}"> ${opt}
    </label>`;
  }).join("");
  if (isMulti) document.getElementById("submitBtn").style.display = "block";
  if (!isMulti) {
    container.querySelectorAll('input[type="radio"]').forEach(r => {
      r.addEventListener("change", () => { if (!answered) checkAnswer(); });
    });
  }
}

function checkAnswer() {
  if (answered) return;
  answered = true;
  const isMulti = current.type === "多选";
  const selected = [...document.querySelectorAll('#optionsContainer input:checked')]
    .map(i => i.value).sort().join(",");
  const correct = current.answer;
  const isCorrect = selected === correct;
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + (isCorrect ? "correct" : "wrong");
  fb.textContent = isCorrect ? "✓ 回答正确！" : `✗ 正确答案是 ${correct}`;
  document.querySelectorAll(".option-label").forEach(label => {
    label.classList.add("disabled");
    const letter = label.dataset.letter;
    if (correct.split(",").includes(letter)) label.classList.add("correct");
    else if (selected.split(",").includes(letter)) label.classList.add("wrong");
  });
  document.getElementById("submitBtn").style.display = "none";
  document.getElementById("nextBtn").style.display = "inline-block";
  const p = loadProgress();
  p.answers[current.id] = { correct: isCorrect, attempts: (p.answers[current.id]?.attempts || 0) + 1 };
  if (isCorrect) p.wrongIds = p.wrongIds.filter(id => id !== current.id);
  else if (!p.wrongIds.includes(current.id)) p.wrongIds.push(current.id);
  saveProgress(p);
  updateStats();
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.type;
    showQuestion();
  });
});
document.getElementById("submitBtn").addEventListener("click", checkAnswer);
document.getElementById("nextBtn").addEventListener("click", showQuestion);
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("确定要重置所有进度吗？")) {
    localStorage.removeItem(STORAGE_KEY);
    updateStats();
    showQuestion();
  }
});

fetch("questions.json").then(r => r.json()).then(data => {
  questions = data;
  updateStats();
  showQuestion();
}).catch(err => {
  console.error(err);
  const message = window.location.protocol === "file:"
    ? "未能加载 questions.json。请通过本地静态服务器打开，不要直接双击 index.html。"
    : "未能加载题库数据，请确认 questions.json 与页面位于同一目录。";
  renderMessage(message, "empty-msg error-msg");
});
