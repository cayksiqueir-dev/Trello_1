// ===== Chaves do localStorage =====

const USERS_KEY = "trellozinho-users";
const SESSION_KEY = "trellozinho-session";


// ===== Usuários =====

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function findUser(email) {
  return getUsers().find((user) => user.email === email);
}

function createUser(name, email, passwordHash) {
  const users = getUsers();
  users.push({ name: name, email: email, password: passwordHash, createdAt: new Date().toISOString() });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}


// ===== Senha =====

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}


// ===== Login master =====

const MASTER_USER = {
  name: "Administrador",
  email: "admin@trellozinho.com",
  password: "admin123",
};

async function ensureMasterUser() {
  if (findUser(MASTER_USER.email)) return;
  createUser(MASTER_USER.name, MASTER_USER.email, await hashPassword(MASTER_USER.password));
}


// ===== Sessão =====

function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

function setSession(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
