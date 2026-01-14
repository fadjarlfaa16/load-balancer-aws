const API = "/api";

let state = { attemptId: null, bundle: null, idx: 0 };

function setToken(token) {
  localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}

function cacheBundle(quizId, bundle) {
  localStorage.setItem(`bundle_${quizId}`, JSON.stringify(bundle));
}

async function login() {
  const username = document.getElementById("u").value;
  const password = document.getElementById("p").value;
  const msg = document.getElementById("loginMsg");

  msg.textContent = "Logging in...";

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    msg.textContent = `Login failed: ${data.message || res.status}`;
    return;
  }

  setToken(data.token);
  msg.textContent = "Login success.";
  document.getElementById("quiz").style.display = "block";
  await resumeIfAny();
}

async function startQuiz() {
  const token = getToken();
  const out = document.getElementById("quizOut");
  out.textContent = "Starting...";

  const res = await fetch(`${API}/attempts/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quizId: "quiz-1" }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    out.textContent = `Start failed: ${data.message || res.status}`;
    return;
  }

  // ✅ isi state dulu
  state.attemptId = data.attemptId;
  state.bundle = data.bundle;
  state.idx = 0;

  // ✅ baru simpan ke localStorage
  localStorage.setItem("currentAttemptId", state.attemptId);
  localStorage.setItem("currentQuizId", state.bundle.quizId);
  localStorage.setItem("currentIdx", "0");

  cacheBundle(state.bundle.quizId, state.bundle);

  document.getElementById("quizTitle").textContent = state.bundle.title;
  document.getElementById("exam").style.display = "block";
  out.textContent = `attemptId: ${state.attemptId}`;

  renderQuestion();
}

function renderQuestion() {
  const q = state.bundle.questions[state.idx];
  document.getElementById("progress").textContent = `Soal ${state.idx + 1} / ${
    state.bundle.questions.length
  }`;

  document.getElementById("qText").textContent = q.text;

  const answersKey = `answers_${state.attemptId}`;
  const answers = JSON.parse(localStorage.getItem(answersKey) || "{}");

  const optionsEl = document.getElementById("options");
  optionsEl.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.style.display = "block";
    btn.style.margin = "6px 0";

    if (answers[q.id] === i) btn.style.border = "2px solid green";

    btn.onclick = async () => {
      // simpan lokal untuk UI cepat (optional)
      const answersKey = `answers_${state.attemptId}`;
      const answers = JSON.parse(localStorage.getItem(answersKey) || "{}");
      answers[q.id] = i;
      localStorage.setItem(answersKey, JSON.stringify(answers));
      renderQuestion();

      // autosave ke backend (DynamoDB)
      const token = getToken();
      await fetch(`${API}/attempts/${state.attemptId}/answers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId: q.id, choice: i }),
      });
    };

    optionsEl.appendChild(btn);
  });
}

function prev() {
  if (state.idx > 0) {
    state.idx--;
    localStorage.setItem("currentIdx", String(state.idx));
    renderQuestion();
  }
}
function next() {
  if (state.idx < state.bundle.questions.length - 1) {
    state.idx++;
    localStorage.setItem("currentIdx", String(state.idx));
    renderQuestion();
  }
}

async function submitAttempt() {
  const token = getToken();
  const res = await fetch(`${API}/attempts/${state.attemptId}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    document.getElementById("quizOut").textContent = `Submit failed: ${
      data.message || res.status
    }`;
    return;
  }

  // ✅ hapus penanda "ongoing" supaya tidak resume lagi
  localStorage.removeItem("currentAttemptId");
  localStorage.removeItem("currentQuizId");
  localStorage.removeItem("currentIdx");

  // ✅ lock UI
  document.getElementById("options").innerHTML = "";
  document.getElementById("qText").textContent =
    "Ujian sudah selesai (SUBMITTED).";
  document.getElementById("progress").textContent = "";
  document.getElementById("btnPrev").disabled = true;
  document.getElementById("btnNext").disabled = true;
  document.getElementById("btnSubmit").disabled = true;

  document.getElementById("quizOut").textContent = JSON.stringify(
    data,
    null,
    2
  );
}

async function resumeIfAny() {
  const token = getToken();
  const attemptId = localStorage.getItem("currentAttemptId");
  const quizId = localStorage.getItem("currentQuizId");
  const idxStr = localStorage.getItem("currentIdx");

  if (!token || !attemptId || !quizId) return;

  const res = await fetch(`${API}/attempts/${attemptId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const attempt = await res.json().catch(() => ({}));
  if (!res.ok) return;

  // ✅ TARUH DI SINI (cek status dulu)
  if (attempt.status === "SUBMITTED") {
    localStorage.removeItem("currentAttemptId");
    localStorage.removeItem("currentQuizId");
    localStorage.removeItem("currentIdx");

    document.getElementById("quiz").style.display = "block";
    document.getElementById("exam").style.display = "block";
    document.getElementById("qText").textContent =
      "Ujian sudah selesai (SUBMITTED).";
    document.getElementById("options").innerHTML = "";
    document.getElementById("progress").textContent = "";
    document.getElementById("btnPrev").disabled = true;
    document.getElementById("btnNext").disabled = true;
    document.getElementById("btnSubmit").disabled = true;
    document.getElementById(
      "quizOut"
    ).textContent = `Attempt ${attemptId} sudah SUBMITTED`;

    return;
  }

  // ...lanjutan kode kamu yang load bundle & render
  let bundle = loadCachedBundle(quizId);
  if (!bundle) {
    const qRes = await fetch(`${API}/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    bundle = await qRes.json().catch(() => null);
    if (!qRes.ok || !bundle) return;
    cacheBundle(quizId, bundle);
  }

  state.attemptId = attemptId;
  state.bundle = bundle;
  state.idx = idxStr ? Number(idxStr) : 0;

  localStorage.setItem(
    `answers_${attemptId}`,
    JSON.stringify(attempt.answers || {})
  );

  document.getElementById("quiz").style.display = "block";
  document.getElementById("quizTitle").textContent = bundle.title;
  document.getElementById("exam").style.display = "block";
  document.getElementById(
    "quizOut"
  ).textContent = `Resumed attemptId: ${attemptId}`;

  renderQuestion();
}

document.getElementById("btnSubmit").addEventListener("click", submitAttempt);

document.getElementById("btnLogin").addEventListener("click", login);
document.getElementById("btnStart").addEventListener("click", startQuiz);
document.getElementById("btnPrev").addEventListener("click", prev);
document.getElementById("btnNext").addEventListener("click", next);

function loadCachedBundle(quizId) {
  const raw = localStorage.getItem(`bundle_${quizId}`);
  return raw ? JSON.parse(raw) : null;
}

resumeIfAny();
