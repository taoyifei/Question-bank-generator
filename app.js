let questions = [], current = null, mode = "all", sidebarFilter = "all", answered = false;
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

function getQuestionById(questionId) {
  return questions.find(question => question.id === questionId) || null;
}

function isQuestionInCurrentMode(question) {
  const p = loadProgress();
  if (mode === "all") return true;
  if (mode === "wrong") return p.wrongIds.includes(question.id);
  return question.type === mode;
}

function matchesSidebarFilter(question, progress) {
  const answerState = progress.answers[question.id];
  if (sidebarFilter === "all") return true;
  if (sidebarFilter === "unanswered") return !answerState;
  if (sidebarFilter === "wrong") return progress.wrongIds.includes(question.id);
  return true;
}

function updateQuestionGrid() {
  const progress = loadProgress();
  const grid = document.getElementById("questionGrid");
  if (!questions.length) {
    grid.innerHTML = "";
    return;
  }
  grid.innerHTML = questions.map(question => {
    const answerState = progress.answers[question.id];
    let statusClass = "unanswered";
    if (answerState) statusClass = answerState.correct ? "correct" : "wrong";
    const currentClass = current?.id === question.id ? " current" : "";
    const isVisible = matchesSidebarFilter(question, progress) || current?.id === question.id;
    const hiddenClass = isVisible ? "" : " hidden";
    const mutedClass = isQuestionInCurrentMode(question) ? "" : " muted";
    return `<button class="question-chip ${statusClass}${currentClass}${mutedClass}${hiddenClass}" data-question-id="${question.id}">${question.id}</button>`;
  }).join("");
  const currentChip = grid.querySelector(".question-chip.current");
  if (currentChip) {
    requestAnimationFrame(() => {
      currentChip.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }
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
  current = null;
  updateQuestionGrid();
}

function getPool() {
  const p = loadProgress();
  if (mode === "wrong") return questions.filter(q => p.wrongIds.includes(q.id));
  if (mode === "all") return questions;
  return questions.filter(q => q.type === mode);
}

function showQuestion(questionId = null) {
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
  const requestedQuestion = questionId === null ? null : getQuestionById(questionId);
  current = requestedQuestion && pool.some(question => question.id === requestedQuestion.id)
    ? requestedQuestion
    : pool[Math.floor(Math.random() * pool.length)];
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
  updateQuestionGrid();
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
  updateQuestionGrid();
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.type;
    showQuestion();
  });
});
document.querySelectorAll(".sidebar-filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    sidebarFilter = btn.dataset.sidebarFilter;
    updateQuestionGrid();
  });
});
document.getElementById("questionGrid").addEventListener("click", event => {
  const button = event.target.closest(".question-chip");
  if (!button) return;
  showQuestion(Number(button.dataset.questionId));
});
document.getElementById("sidebarSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("sidebarSearchInput");
  const questionId = Number(input.value);
  if (!Number.isInteger(questionId) || questionId < 1 || questionId > TOTAL_QUESTIONS) {
    input.focus();
    input.select();
    return;
  }
  showQuestion(questionId);
  input.value = "";
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
  updateQuestionGrid();
  showQuestion();
}).catch(err => {
  console.error(err);
  const message = window.location.protocol === "file:"
    ? "未能加载 questions.json。请通过本地静态服务器打开，不要直接双击 index.html。"
    : "未能加载题库数据，请确认 questions.json 与页面位于同一目录。";
  renderMessage(message, "empty-msg error-msg");
});
