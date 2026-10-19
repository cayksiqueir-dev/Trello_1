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


// ===== Estado =====

let board = currentUser ? loadBoard() : null;
let draggingCard = null;
let editingCardId = null;


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


// ===== Armazenamento =====

function boardKey() {
  return "trellozinho-board-" + currentUser.email;
}

function loadBoard() {
  const saved = localStorage.getItem(boardKey());
  return saved ? JSON.parse(saved) : createDefaultBoard();
}

function saveBoard() {
  localStorage.setItem(boardKey(), JSON.stringify(board));
}

function newId() {
  return crypto.randomUUID();
}

function createDefaultBoard() {
  return {
    columns: [
      {
        id: newId(),
        title: "A Fazer",
        cards: [
          { id: newId(), title: "Estudar HTML", description: "Rever tags semânticas e estrutura básica de uma página.", labels: ["estudo"] },
          { id: newId(), title: "Criar wireframe", description: "Desenhar o protótipo das telas antes de codar.", labels: ["design"] },
        ],
      },
      {
        id: newId(),
        title: "Fazendo",
        cards: [
          { id: newId(), title: "Estruturar HTML do board", description: "Montar as colunas e os cartões da página principal.", labels: ["dev"] },
        ],
      },
      {
        id: newId(),
        title: "Feito",
        cards: [
          { id: newId(), title: "Escolher o tema do projeto", description: "Definido: um clone simples do Trello.", labels: ["planejamento"] },
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
  element.querySelector(".card-badges").hidden = !card.description;

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
  findColumn(columnId).cards.push({ id: newId(), title: title, description: "", labels: [] });
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
    const text = (card.title + " " + card.description).toLowerCase();
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

  labelPicker.querySelectorAll(".label-option").forEach((option) => {
    option.classList.toggle("selected", card.labels.includes(option.dataset.id));
  });

  cardModal.hidden = false;
  cardTitleInput.focus();
}

function closeCardModal() {
  cardModal.hidden = true;
  editingCardId = null;
}

cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = cardTitleInput.value.trim();
  if (!title) return;

  updateCard(editingCardId, {
    title: title,
    description: cardDescriptionInput.value.trim(),
    labels: [...labelPicker.querySelectorAll(".selected")].map((option) => option.dataset.id),
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
  render();
}

if (currentUser) init();
