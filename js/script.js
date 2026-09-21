// Pega os elementos do modal
const cardModalOverlay = document.getElementById("card-modal-overlay");
const cardModalTitle = document.getElementById("card-modal-title");
const cardModalDescription = document.getElementById("card-modal-description");
const cardModalCloseBtn = document.getElementById("card-modal-close-btn");

// Pega todos os cards do board
const cards = document.querySelectorAll(".card");

// Abre o modal ao clicar em um card, usando os dados do próprio card
cards.forEach((card) => {
  card.addEventListener("click", () => {
    cardModalTitle.textContent = card.dataset.title;
    cardModalDescription.textContent = card.dataset.desc;
    cardModalOverlay.classList.add("active");
  });
});

// Fecha o modal ao clicar no botão "x"
cardModalCloseBtn.addEventListener("click", () => {
  cardModalOverlay.classList.remove("active");
});

// Fecha o modal ao clicar fora da caixa branca (no fundo escuro)
cardModalOverlay.addEventListener("click", (event) => {
  if (event.target === cardModalOverlay) {
    cardModalOverlay.classList.remove("active");
  }
});
