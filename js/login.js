// ===== Já logado vai direto pro board =====

if (findUser(getSession())) {
  location.replace("index.html");
}


// ===== Garante o usuário master =====

const masterReady = ensureMasterUser();


// ===== Elementos =====

const tabs = document.querySelectorAll(".auth-tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");


// ===== Abas =====

function showTab(name) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  loginForm.hidden = name !== "login";
  registerForm.hidden = name !== "register";
  showMessage("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
});


// ===== Mensagens =====

function showMessage(text) {
  authMessage.textContent = text;
  authMessage.hidden = !text;
}


// ===== Entrar =====

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await masterReady;

  const email = loginForm.elements.email.value.trim().toLowerCase();
  const password = loginForm.elements.password.value;
  const user = findUser(email);

  if (!user || user.password !== await hashPassword(password)) {
    showMessage("E-mail ou senha incorretos.");
    return;
  }

  setSession(email);
  location.href = "index.html";
});


// ===== Cadastrar =====

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await masterReady;

  const name = registerForm.elements.name.value.trim();
  const email = registerForm.elements.email.value.trim().toLowerCase();
  const password = registerForm.elements.password.value;
  const confirmPassword = registerForm.elements.confirmPassword.value;

  if (password !== confirmPassword) {
    showMessage("As senhas não conferem.");
    return;
  }

  if (findUser(email)) {
    showMessage("Já existe uma conta com esse e-mail.");
    return;
  }

  createUser(name, email, await hashPassword(password));
  setSession(email);
  location.href = "index.html";
});
