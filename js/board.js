// ===== Sessão =====

const currentUser = findUser(getSession());

if (!currentUser) {
  clearSession();
  location.replace("login.html");
}


// ===== Etiquetas =====

const LABELS = [
  { id: "dev", name: "Dev" },
  { id: "design", name: "Design" },
  { id: "planejamento", name: "Planejamento" },
  { id: "estudo", name: "Estudo" },
];


// ===== Capas e fundos =====

const COVERS = ["verde", "amarelo", "laranja", "vermelho", "roxo", "azul"];

const BACKGROUNDS = [
  { id: "roxo", name: "Roxo" },
  { id: "oceano", name: "Oceano" },
  { id: "floresta", name: "Floresta" },
  { id: "por-do-sol", name: "Pôr do sol" },
  { id: "noite", name: "Noite" },
];

const DUE_TITLES = {
  overdue: "Atrasado",
  soon: "Vence em breve",
  ok: "No prazo",
};


// ===== Estado =====

let board = currentUser ? loadBoard() : null;
let draggingCard = null;
let editingCardId = null;
let draftChecklist = [];


// ===== Elementos =====

const columnsEl = document.getElementById("columns");
const columnTemplate = document.getElementById("column-template");
const cardTemplate = document.getElementById("card-template");
const searchInput = document.getElementById("search-input");

const addColumnBtn = document.getElementById("add-column-btn");
const addColumnForm = document.getElementById("add-column-form");
const addColumnInput = document.getElementById("add-column-input");
const addColumnCancel = document.getElementById("add-column-cancel");

const cardModal = document.getElementById("card-modal");
const cardForm = document.getElementById("card-form");
const cardTitleInput = document.getElementById("card-title");
const cardDescriptionInput = document.getElementById("card-description");
const cardColumnName = document.getElementById("card-column-name");
const labelPicker = document.getElementById("label-picker");
const coverPicker = document.getElementById("cover-picker");
const cardDueInput = document.getElementById("card-due");

const checklistEl = document.getElementById("checklist");
const checklistInput = document.getElementById("checklist-input");
const checklistProgress = document.getElementById("checklist-progress");
const checklistBar = document.getElementById("checklist-bar");
const checklistPercent = document.getElementById("checklist-percent");

const bgBtn = document.getElementById("bg-btn");
const bgPicker = document.getElementById("bg-picker");


// ===== Armazenamento =====

function boardKey() {
  return "trellozinho-board-" + currentUser.email;
}

function loadBoard() {
  const saved = localStorage.getItem(boardKey());
  const data = saved ? JSON.parse(saved) : createDefaultBoard();

  // Completa os campos novos em boards salvos antes deles existirem
  data.background = data.background || "roxo";
  data.columns.forEach((column) => {
    column.cards = column.cards.map((card) => ({
      description: "", labels: [], dueDate: "", cover: "", checklist: [], ...card,
    }));
  });

  return data;
}

function saveBoard() {
  localStorage.setItem(boardKey(), JSON.stringify(board));
}

function newId() {
  return crypto.randomUUID();
}

function newChecklistItem(text, done = false) {
  return { id: newId(), text: text, done: done };
}

function createDefaultBoard() {
  return {
    background: "roxo",
    columns: [
      {
        id: newId(),
        title: "A Fazer",
        cards: [
          {
            id: newId(),
            title: "Estudar HTML",
            description: "Rever tags semânticas e estrutura básica de uma página.",
            labels: ["estudo"],
            dueDate: daysFromToday(-1),
            checklist: [newChecklistItem("Tags semânticas", true), newChecklistItem("Formulários"), newChecklistItem("Tabelas")],
          },
          {
            id: newId(),
            title: "Criar wireframe",
            description: "Desenhar o protótipo das telas antes de codar.",
            labels: ["design"],
            cover: "roxo",
            dueDate: daysFromToday(1),
          },
        ],
      },
      {
        id: newId(),
        title: "Fazendo",
        cards: [
          {
            id: newId(),
            title: "Estruturar HTML do board",
            description: "Montar as colunas e os cartões da página principal.",
            labels: ["dev"],
            dueDate: daysFromToday(5),
            checklist: [newChecklistItem("Colunas", true), newChecklistItem("Cartões", true), newChecklistItem("Modal")],
          },
        ],
      },
      {
        id: newId(),
        title: "Feito",
        cards: [
          {
            id: newId(),
            title: "Escolher o tema do projeto",
            description: "Definido: um clone simples do Trello.",
            labels: ["planejamento"],
            cover: "verde",
            checklist: [newChecklistItem("Pesquisar ideias", true), newChecklistItem("Definir o tema", true)],
          },
        ],
      },
    ],
  };
}


// ===== Consultas =====

function findColumn(id) {
  return board.columns.find((column) => column.id === id);
}

function findCard(id) {
  for (const column of board.columns) {
    const card = column.cards.find((card) => card.id === id);
    if (card) return { column, card };
  }
  return null;
}

function getInitials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}


// ===== Prazos =====

function getDueStatus(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(dueDate + "T00:00:00") - today) / 86400000);

  if (days < 0) return "overdue";
  if (days <= 1) return "soon";
  return "ok";
}

function formatDate(dueDate) {
  return new Date(dueDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function daysFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}


// ===== Renderização =====

function render() {
  columnsEl.innerHTML = "";
  board.columns.forEach((column) => columnsEl.appendChild(createColumnElement(column)));
  applySearch();
}

function createColumnElement(column) {
  const element = columnTemplate.content.firstElementChild.cloneNode(true);
  const titleInput = element.querySelector(".column-title");
  const list = element.querySelector(".card-list");
  const deleteBtn = element.querySelector(".column-delete");
  const addBtn = element.querySelector(".add-card-btn");
  const form = element.querySelector(".add-card-form");
  const input = element.querySelector(".add-card-input");
  const cancelBtn = element.querySelector(".add-card-cancel");

  element.dataset.id = column.id;
  titleInput.value = column.title;
  element.querySelector(".column-count").textContent = column.cards.length;
  column.cards.forEach((card) => list.appendChild(createCardElement(card)));

  // Renomear lista
  titleInput.addEventListener("change", () => {
    const title = titleInput.value.trim();
    if (title) {
      column.title = title;
      saveBoard();
    }
    titleInput.value = column.title;
  });

  titleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") titleInput.blur();
  });

  // Excluir lista
  deleteBtn.addEventListener("click", () => deleteColumn(column.id));

  // Novo cartão
  function showForm(visible) {
    form.hidden = !visible;
    addBtn.hidden = visible;
    input.value = "";
    if (visible) input.focus();
  }

  addBtn.addEventListener("click", () => showForm(true));
  cancelBtn.addEventListener("click", () => showForm(false));

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
    if (event.key === "Escape") showForm(false);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (title) addCard(column.id, title);
  });

  // Receber cartão arrastado
  element.addEventListener("dragover", (event) => {
    if (!draggingCard) return;
    event.preventDefault();

    const below = getCardBelow(list, event.clientY);
    if (below) {
      if (below !== draggingCard.nextSibling) list.insertBefore(draggingCard, below);
    } else if (list.lastElementChild !== draggingCard) {
      list.appendChild(draggingCard);
    }
  });

  return element;
}

function createCardElement(card) {
  const element = cardTemplate.content.firstElementChild.cloneNode(true);
  const labelsEl = element.querySelector(".card-labels");

  element.dataset.id = card.id;
  element.querySelector(".card-title").textContent = card.title;

  // Capa
  const cover = element.querySelector(".card-cover");
  cover.hidden = !card.cover;
  if (card.cover) cover.classList.add("cover-" + card.cover);

  // Prazo
  const dueBadge = element.querySelector(".badge-due");
  dueBadge.hidden = !card.dueDate;
  if (card.dueDate) {
    const status = getDueStatus(card.dueDate);
    dueBadge.textContent = "📅 " + formatDate(card.dueDate);
    dueBadge.title = DUE_TITLES[status];
    dueBadge.classList.add("due-" + status);
  }

  // Checklist
  const checklistBadge = element.querySelector(".badge-checklist");
  const doneCount = card.checklist.filter((item) => item.done).length;
  checklistBadge.hidden = !card.checklist.length;
  checklistBadge.textContent = `☑ ${doneCount}/${card.checklist.length}`;
  checklistBadge.classList.toggle("complete", card.checklist.length > 0 && doneCount === card.checklist.length);

  // Descrição
  element.querySelector(".badge-desc").hidden = !card.description;
  element.querySelector(".card-badges").hidden = !card.description && !card.dueDate && !card.checklist.length;

  card.labels.forEach((labelId) => {
    const label = LABELS.find((label) => label.id === labelId);
    if (!label) return;

    const chip = document.createElement("span");
    chip.className = "label label-" + label.id;
    chip.textContent = label.name;
    labelsEl.appendChild(chip);
  });

  // Abrir detalhes
  element.addEventListener("click", () => openCardModal(card.id));
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openCardModal(card.id);
  });

  // Arrastar
  element.addEventListener("dragstart", (event) => {
    draggingCard = element;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.id);
    element.classList.add("dragging");
  });

  element.addEventListener("dragend", () => {
    element.classList.remove("dragging");
    draggingCard = null;
    syncOrderFromDom();
  });

  return element;
}

function renderLabelPicker() {
  LABELS.forEach((label) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "label label-option label-" + label.id;
    option.dataset.id = label.id;
    option.textContent = label.name;
    option.addEventListener("click", () => option.classList.toggle("selected"));
    labelPicker.appendChild(option);
  });
}

function renderCoverPicker() {
  ["", ...COVERS].forEach((cover) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "cover-option " + (cover ? "cover-" + cover : "cover-none");
    option.dataset.id = cover;
    option.title = cover || "Sem capa";
    option.textContent = cover ? "" : "✕";
    option.addEventListener("click", () => selectCover(cover));
    coverPicker.appendChild(option);
  });
}

function selectCover(cover) {
  coverPicker.querySelectorAll(".cover-option").forEach((option) => {
    option.classList.toggle("selected", option.dataset.id === cover);
  });
}


// ===== Arrastar e soltar =====

function getCardBelow(list, mouseY) {
  const cards = [...list.querySelectorAll(".card:not(.dragging)")];
  return cards.find((card) => {
    const box = card.getBoundingClientRect();
    return mouseY < box.top + box.height / 2;
  });
}

function syncOrderFromDom() {
  const allCards = board.columns.flatMap((column) => column.cards);

  columnsEl.querySelectorAll(".column").forEach((columnEl) => {
    const column = findColumn(columnEl.dataset.id);
    column.cards = [...columnEl.querySelectorAll(".card")].map((cardEl) =>
      allCards.find((card) => card.id === cardEl.dataset.id)
    );
  });

  saveBoard();
  render();
}


// ===== Ações: listas =====

function addColumn(title) {
  board.columns.push({ id: newId(), title: title, cards: [] });
  saveBoard();
  render();
}

function deleteColumn(id) {
  const column = findColumn(id);
  const message = column.cards.length
    ? `Excluir a lista "${column.title}" e seus ${column.cards.length} cartões?`
    : `Excluir a lista "${column.title}"?`;

  if (!confirm(message)) return;

  board.columns = board.columns.filter((item) => item.id !== id);
  saveBoard();
  render();
}


// ===== Ações: cartões =====

function addCard(columnId, title) {
  findColumn(columnId).cards.push({
    id: newId(), title: title, description: "", labels: [], dueDate: "", cover: "", checklist: [],
  });
  saveBoard();
  render();

  // Mantém o formulário aberto para adicionar outro em seguida
  columnsEl.querySelector(`[data-id="${columnId}"] .add-card-btn`).click();
}

function updateCard(id, data) {
  Object.assign(findCard(id).card, data);
  saveBoard();
  render();
}

function deleteCard(id) {
  const { column } = findCard(id);
  column.cards = column.cards.filter((card) => card.id !== id);
  saveBoard();
  render();
}


// ===== Busca =====

function applySearch() {
  const term = searchInput.value.trim().toLowerCase();

  columnsEl.querySelectorAll(".card").forEach((cardEl) => {
    const { card } = findCard(cardEl.dataset.id);
    const checklistText = card.checklist.map((item) => item.text).join(" ");
    const text = (card.title + " " + card.description + " " + checklistText).toLowerCase();
    cardEl.hidden = term !== "" && !text.includes(term);
  });
}

searchInput.addEventListener("input", applySearch);


// ===== Nova lista =====

function showAddColumnForm(visible) {
  addColumnForm.hidden = !visible;
  addColumnBtn.hidden = visible;
  addColumnInput.value = "";
  if (visible) addColumnInput.focus();
}

addColumnBtn.addEventListener("click", () => showAddColumnForm(true));
addColumnCancel.addEventListener("click", () => showAddColumnForm(false));

addColumnInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") showAddColumnForm(false);
});

addColumnForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = addColumnInput.value.trim();
  if (!title) return;

  addColumn(title);
  showAddColumnForm(true);
});


// ===== Modal do cartão =====

function openCardModal(id) {
  const { column, card } = findCard(id);
  editingCardId = id;

  cardTitleInput.value = card.title;
  cardDescriptionInput.value = card.description;
  cardColumnName.textContent = column.title;
  cardDueInput.value = card.dueDate;
  selectCover(card.cover);

  draftChecklist = card.checklist.map((item) => ({ ...item }));
  checklistInput.value = "";
  renderChecklist();

  labelPicker.querySelectorAll(".label-option").forEach((option) => {
    option.classList.toggle("selected", card.labels.includes(option.dataset.id));
  });

  cardModal.hidden = false;
  cardTitleInput.focus();
}

function closeCardModal() {
  document.activeElement.blur();
  cardModal.hidden = true;
  editingCardId = null;
}

cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = cardTitleInput.value.trim();
  if (!title) return;

  // Item digitado e não adicionado também é salvo
  addChecklistItem();

  updateCard(editingCardId, {
    title: title,
    description: cardDescriptionInput.value.trim(),
    labels: [...labelPicker.querySelectorAll(".selected")].map((option) => option.dataset.id),
    dueDate: cardDueInput.value,
    cover: coverPicker.querySelector(".selected").dataset.id,
    checklist: draftChecklist,
  });
  closeCardModal();
});

document.getElementById("card-delete-btn").addEventListener("click", () => {
  if (!confirm("Excluir este cartão?")) return;
  deleteCard(editingCardId);
  closeCardModal();
});

document.getElementById("card-modal-close").addEventListener("click", closeCardModal);
document.getElementById("card-cancel-btn").addEventListener("click", closeCardModal);

cardModal.addEventListener("click", (event) => {
  if (event.target === cardModal) closeCardModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !cardModal.hidden) closeCardModal();
});


// ===== Checklist =====

function renderChecklist() {
  checklistEl.innerHTML = "";

  draftChecklist.forEach((item) => {
    const li = document.createElement("li");
    li.className = "checklist-item";
    li.classList.toggle("done", item.done);

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.addEventListener("change", () => {
      item.done = checkbox.checked;
      renderChecklist();
    });

    const text = document.createElement("span");
    text.textContent = item.text;
    label.append(checkbox, text);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "icon-btn";
    removeBtn.title = "Remover item";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      draftChecklist = draftChecklist.filter((other) => other.id !== item.id);
      renderChecklist();
    });

    li.append(label, removeBtn);
    checklistEl.appendChild(li);
  });

  // Barra de progresso
  const total = draftChecklist.length;
  const done = draftChecklist.filter((item) => item.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  checklistProgress.hidden = total === 0;
  checklistPercent.textContent = percent + "%";
  checklistBar.style.width = percent + "%";
  checklistBar.classList.toggle("complete", total > 0 && done === total);
}

function addChecklistItem() {
  const text = checklistInput.value.trim();
  if (!text) return;

  draftChecklist.push(newChecklistItem(text));
  checklistInput.value = "";
  renderChecklist();
}

document.getElementById("checklist-add-btn").addEventListener("click", addChecklistItem);

checklistInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addChecklistItem();
  }
});


// ===== Fundo do board =====

function renderBackgroundPicker() {
  BACKGROUNDS.forEach((background) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "bg-option";
    option.dataset.id = background.id;
    option.textContent = background.name;
    option.style.background = `var(--bg-${background.id})`;
    option.addEventListener("click", () => {
      board.background = background.id;
      saveBoard();
      applyBackground();
    });
    bgPicker.appendChild(option);
  });
}

function applyBackground() {
  document.body.style.setProperty("--bg", `var(--bg-${board.background})`);
  bgPicker.querySelectorAll(".bg-option").forEach((option) => {
    option.classList.toggle("selected", option.dataset.id === board.background);
  });
}

bgBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  bgPicker.hidden = !bgPicker.hidden;
});

document.addEventListener("click", (event) => {
  if (!bgPicker.contains(event.target)) bgPicker.hidden = true;
});


// ===== Atalhos =====

document.addEventListener("keydown", (event) => {
  const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);

  if (event.key === "/" && !typing) {
    event.preventDefault();
    searchInput.focus();
  }
});


// ===== Usuário =====

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  location.href = "login.html";
});


// ===== Início =====

function init() {
  document.getElementById("user-name").textContent = currentUser.name;
  document.getElementById("user-avatar").textContent = getInitials(currentUser.name);
  renderLabelPicker();
  renderCoverPicker();
  renderBackgroundPicker();
  applyBackground();
  render();
}

if (currentUser) init();
