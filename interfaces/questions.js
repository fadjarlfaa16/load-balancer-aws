// ====== SAMPLE QUESTIONS DATA ======
// type: "mcq" | "essay" | "tf"
const questions = [
  {
    type: "mcq",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis eros elit, luctus vitae sem quis, sollicitudin pharetra ligula.",
    options: [
      "A. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "B. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "C. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "D. Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    ]
  },
  {
    type: "essay",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis eros elit, luctus vitae sem quis, sollicitudin pharetra ligula."
  },
  {
    type: "tf",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis eros elit, luctus vitae sem quis, sollicitudin pharetra ligula."
  }
];

let index = 0;

// store answers by index
const answers = {}; // {0: "B", 1: "text...", 2: "true"}

// DOM
const qTitle = document.getElementById("qTitle");
const qDesc  = document.getElementById("qDesc");
const qBody  = document.getElementById("qBody");
const actions = document.getElementById("actions");

function render() {
  const q = questions[index];

  // header
  qTitle.textContent = `Question ${index + 1} of ${questions.length}`;
  qDesc.textContent = q.text;

  // body
  qBody.innerHTML = "";
  actions.innerHTML = "";

  if (q.type === "mcq") renderMCQ(q);
  if (q.type === "essay") renderEssay(q);
  if (q.type === "tf") renderTF(q);

  // actions alignment (match UI)
  if (q.type === "mcq") actions.className = "actions right";
  else actions.className = "actions split";
}

function renderMCQ(q) {
  const wrapper = document.createElement("div");
  wrapper.className = "mcq";

  q.options.forEach((opt, i) => {
    const label = document.createElement("label");
    label.className = "option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "mcq";
    input.value = String.fromCharCode(65 + i); // A/B/C/D

    // restore selection
    if (answers[index] === input.value) input.checked = true;

    input.addEventListener("change", () => {
      answers[index] = input.value;
    });

    const pill = document.createElement("span");
    pill.className = "option-pill";
    pill.textContent = opt;

    label.appendChild(input);
    label.appendChild(pill);
    wrapper.appendChild(label);
  });

  qBody.appendChild(wrapper);

  // Next button
  actions.appendChild(nextBtn());
}

function renderEssay() {
  const textarea = document.createElement("textarea");
  textarea.className = "essay-box";
  textarea.placeholder = "Type your answer here...";
  textarea.value = answers[index] || "";

  textarea.addEventListener("input", () => {
    answers[index] = textarea.value;
  });

  qBody.appendChild(textarea);

  // Prev + Next
  actions.appendChild(prevBtn());
  actions.appendChild(nextBtn());
}

function renderTF() {
  const wrapper = document.createElement("div");
  wrapper.className = "tf";

  // TRUE card
  wrapper.appendChild(tfCard("true", "Benar", "tf-card tf-card--true"));
  // FALSE card
  wrapper.appendChild(tfCard("false", "Salah", "tf-card tf-card--false"));

  qBody.appendChild(wrapper);

  // Prev + Submit
  actions.appendChild(prevBtn());
  actions.appendChild(submitBtn());
}

function tfCard(value, labelText, className) {
  const label = document.createElement("label");
  label.className = className;

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "tf";
  input.value = value;

  if (answers[index] === value) input.checked = true;

  input.addEventListener("change", () => {
    answers[index] = value;
  });

  const span = document.createElement("span");
  span.className = "tf-label";
  span.textContent = labelText;

  label.appendChild(input);
  label.appendChild(span);
  return label;
}

// ===== Buttons =====
function prevBtn() {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.type = "button";
  btn.innerHTML = `<span class="icon left" aria-hidden="true"></span><span>Previous Question</span>`;
  btn.disabled = index === 0;
  btn.addEventListener("click", () => {
    if (index > 0) index--;
    render();
  });
  return btn;
}

function nextBtn() {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.type = "button";
  btn.innerHTML = `<span>Next Question</span><span class="icon right" aria-hidden="true"></span>`;
  btn.disabled = index === questions.length - 1;
  btn.addEventListener("click", () => {
    if (index < questions.length - 1) index++;
    render();
  });
  return btn;
}

function submitBtn() {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.type = "button";
  btn.innerHTML = `<span>Submit Answer</span><span class="icon right" aria-hidden="true"></span>`;
  btn.addEventListener("click", () => {
    // (opsional) simpan jawaban dulu biar ga hilang
    // localStorage.setItem("examAnswers", JSON.stringify(answers));

    // redirect ke halaman submitted
    window.location.href = "submitted.html";
  });
  return btn;
}

// init
render();
