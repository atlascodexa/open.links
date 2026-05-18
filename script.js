const STORAGE_KEY = "openLinks.users";
const CURRENT_USER_KEY = "openLinks.currentUser";
const STORAGE_VERSION = 1;

let blocks = [];
let currentUserEmail = null;

function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

document.addEventListener("DOMContentLoaded", () => {
  const createBlockButton = document.getElementById("create-block-button");
  const blockNameInput = document.getElementById("block-name-input");
  const authOpenButton = document.getElementById("auth-open-button");
  const logoutButton = document.getElementById("logout-button");
  const loginButton = document.getElementById("login-button");
  const signupButton = document.getElementById("signup-button");
  const authForm = document.getElementById("auth-form");

  currentUserEmail = loadCurrentUserEmail();
  renderAuthState();

  blocks = loadBlocks();
  renderBlocks();

  if (createBlockButton) createBlockButton.addEventListener("click", createBlock);
  if (blockNameInput) {
    blockNameInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") createBlock();
    });
    blockNameInput.addEventListener("input", () => {
      blockNameInput.classList.remove("invalid");
    });
  }

  if (authOpenButton) {
    authOpenButton.addEventListener("click", () => {
      if (authForm) authForm.classList.toggle("hidden");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  if (loginButton) {
    loginButton.addEventListener("click", () => authenticateUser(false));
  }

  if (signupButton) {
    signupButton.addEventListener("click", () => authenticateUser(true));
  }
});

function getAllUsers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("Erro ao carregar contas de usuário", error);
  }
  return {};
}

function saveAllUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function loadCurrentUserEmail() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

function saveCurrentUserEmail(email) {
  localStorage.setItem(CURRENT_USER_KEY, email);
}

function clearCurrentUserEmail() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function getCurrentUserRecord() {
  const email = loadCurrentUserEmail();
  if (!email) return null;
  const users = getAllUsers();
  return users[email.toLowerCase()] || null;
}

function renderAuthState() {
  const authStatus = document.getElementById("auth-status");
  const authOpenButton = document.getElementById("auth-open-button");
  const createBlockButton = document.getElementById("create-block-button");
  const blockNameInput = document.getElementById("block-name-input");
  const authForm = document.getElementById("auth-form");
  const logoutButton = document.getElementById("logout-button");

  if (authStatus) {
    authStatus.classList.toggle("connected", Boolean(currentUserEmail));
    const statusText = authStatus.querySelector(".status-text");
    if (statusText) {
      statusText.textContent = currentUserEmail ? "Conectado" : "Não conectado";
    }
  }

  if (currentUserEmail) {
    if (authOpenButton) authOpenButton.classList.add("hidden");
    if (createBlockButton) createBlockButton.disabled = false;
    if (blockNameInput) blockNameInput.disabled = false;
    if (authForm) authForm.classList.add("hidden");
    if (logoutButton) logoutButton.classList.remove("hidden");
  } else {
    if (authOpenButton) authOpenButton.classList.remove("hidden");
    if (createBlockButton) createBlockButton.disabled = true;
    if (blockNameInput) blockNameInput.disabled = true;
    if (logoutButton) logoutButton.classList.add("hidden");
  }
}

async function authenticateUser(isSignUp) {
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");

  if (!emailInput || !passwordInput) return;

  const email = (emailInput.value || "").trim().toLowerCase();
  const password = passwordInput.value || "";

  if (!email || !password) {
    alert("Digite um e-mail e senha para continuar.");
    return;
  }

  try {
    const passwordHash = await hashString(password);
    const users = getAllUsers();
    const existingUser = users[email];

    if (isSignUp) {
      if (existingUser) {
        alert("Já existe uma conta para esse e-mail. Faça login.");
        return;
      }

      users[email] = {
        email,
        passwordHash,
        blocks: {
          version: STORAGE_VERSION,
          blocks: [],
        },
      };
      saveAllUsers(users);
      currentUserEmail = email;
      saveCurrentUserEmail(email);
      blocks = [];
      renderAuthState();
      renderBlocks();
      alert("Conta criada com sucesso. Seus blocos agora serão salvos.");
      return;
    }

    if (!existingUser || existingUser.passwordHash !== passwordHash) {
      alert("E-mail ou senha incorretos. Tente novamente.");
      return;
    }

    currentUserEmail = email;
    saveCurrentUserEmail(email);
    blocks = loadBlocks();
    renderAuthState();
    renderBlocks();
    alert("Login realizado com sucesso.");
  } catch (error) {
    console.error("Erro de autenticação:", error);
    alert("Ocorreu um erro durante a autenticação. Tente novamente.");
  }
}

function logout() {
  clearCurrentUserEmail();
  currentUserEmail = null;
  blocks = [];
  renderAuthState();
  renderBlocks();
}

function loadBlocks() {
  const user = getCurrentUserRecord();
  if (!user) return [];

  const migrated = migrateStoredData(user.blocks || { version: STORAGE_VERSION, blocks: [] });
  if (!isCurrentStorageFormat(user.blocks)) {
    const users = getAllUsers();
    users[user.email.toLowerCase()] = {
      ...user,
      blocks: migrated,
    };
    saveAllUsers(users);
  }
  return migrated.blocks;
}

function saveBlocks() {
  const user = getCurrentUserRecord();
  if (!user) return;

  const users = getAllUsers();
  users[user.email.toLowerCase()] = {
    ...user,
    blocks: {
      version: STORAGE_VERSION,
      blocks,
    },
  };
  saveAllUsers(users);
}

function isCurrentStorageFormat(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.version === "number" &&
    Array.isArray(value.blocks)
  );
}

function migrateStoredData(value) {
  if (Array.isArray(value)) {
    return {
      version: STORAGE_VERSION,
      blocks: value.map(normalizeBlock).filter(Boolean),
    };
  }

  if (value && typeof value === "object" && Array.isArray(value.blocks)) {
    return {
      version: typeof value.version === "number" ? value.version : STORAGE_VERSION,
      blocks: value.blocks.map(normalizeBlock).filter(Boolean),
    };
  }

  return {
    version: STORAGE_VERSION,
    blocks: [],
  };
}

function normalizeBlock(block) {
  if (!block || typeof block !== "object") return null;

  return {
    id: block.id || uuid(),
    name: String(block.name || ""),
    links: Array.isArray(block.links) ? block.links.map(normalizeLink).filter(Boolean) : [],
    collapsed: Boolean(block.collapsed),
  };
}

function normalizeLink(link) {
  if (!link || typeof link !== "object") return null;

  return {
    id: link.id || uuid(),
    label: String(link.label || ""),
    url: String(link.url || ""),
  };
}

async function hashString(value) {
  if (window.crypto && crypto.subtle && typeof crypto.subtle.digest === "function") {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return btoa(value);
}

function ensureLoggedIn() {
  if (!currentUserEmail) {
    alert("Faça login para salvar seus blocos e acessá-los a qualquer momento.");
    return false;
  }
  return true;
}

function createBlock() {
  if (!ensureLoggedIn()) return;

  try {
    const input = document.getElementById("block-name-input");
    const name = (input && input.value && input.value.trim()) || "";
    if (!name) {
      if (input) {
        input.classList.add("invalid");
        input.focus();
      }
      return;
    }

    if (input) input.classList.remove("invalid");

    blocks.push({
      id: uuid(),
      name,
      links: [],
      collapsed: false,
    });

    if (input) input.value = "";
    saveBlocks();
    renderBlocks();
  } catch (err) {
    console.error("Erro ao criar bloco:", err);
    alert("Ocorreu um erro ao criar o bloco. Abra o console para mais detalhes.");
  }
}

function renderBlocks() {
  const blocksContainer = document.getElementById("blocks-container");
  if (!blocksContainer) return;

  blocksContainer.innerHTML = "";

  if (blocks.length === 0) {
    blocksContainer.innerHTML = `
      <div class="empty-state">
        <p>Não há blocos ainda. Faça login para criar e salvar seus links.</p>
      </div>
    `;
    return;
  }

  blocks.forEach((block) => {
    const blockCard = document.createElement("article");
    blockCard.className = "block-card";
    blockCard.dataset.blockId = block.id;

    blockCard.innerHTML = `
      <div class="block-header">
        <div class="block-title-info">
          <span class="block-title-text">${escapeHtml(block.name)}</span>
        </div>
        <div class="block-actions">
          <button class="secondary edit-block" type="button" aria-label="Editar nome do bloco">✏️</button>
          <button class="primary open-all">Abrir links</button>
          <button class="primary add-link">Adicionar link</button>
          <button class="secondary toggle-links" type="button">${block.collapsed ? "Ver links" : "Ocultar links"}</button>
          <button class="remove delete-block">Excluir bloco</button>
        </div>
      </div>
      <ul class="link-list ${block.collapsed ? "collapsed" : ""}">
        ${block.links
          .map(
            (link) => `
              <li class="link-item" data-link-id="${link.id}">
                <div class="link-fields">
                  <input class="link-label" type="text" value="${escapeHtml(link.label || "")}" placeholder="Nome do link" aria-label="Nome do link" />
                  <input class="link-url" type="url" value="${escapeHtml(link.url || "")}" placeholder="https://..." aria-label="URL do link" />
                </div>
                <div class="link-actions">
                  <button class="remove remove-link">Excluir</button>
                </div>
              </li>
            `
          )
          .join("")}
      </ul>
    `;

    blocksContainer.appendChild(blockCard);

    const openAllBtn = blockCard.querySelector(".open-all");
    if (openAllBtn) openAllBtn.addEventListener("click", () => openAllLinks(block.id));

    const addLinkBtn = blockCard.querySelector(".add-link");
    if (addLinkBtn) addLinkBtn.addEventListener("click", () => addLink(block.id));

    const editBlockBtn = blockCard.querySelector(".edit-block");
    if (editBlockBtn) editBlockBtn.addEventListener("click", () => editBlockName(block.id));

    const toggleLinksBtn = blockCard.querySelector(".toggle-links");
    if (toggleLinksBtn) toggleLinksBtn.addEventListener("click", () => toggleLinkList(block.id));

    const deleteBlockBtn = blockCard.querySelector(".delete-block");
    if (deleteBlockBtn) deleteBlockBtn.addEventListener("click", () => deleteBlock(block.id));

    blockCard.querySelectorAll(".link-label").forEach((input) => {
      input.addEventListener("change", (event) => {
        const li = input.closest(".link-item");
        if (!li) return;
        updateLinkField(block.id, li.dataset.linkId, "label", event.target.value);
      });
    });

    blockCard.querySelectorAll(".link-url").forEach((input) => {
      input.addEventListener("change", (event) => {
        const li = input.closest(".link-item");
        if (!li) return;
        updateLinkField(block.id, li.dataset.linkId, "url", event.target.value);
      });
    });

    blockCard.querySelectorAll(".remove-link").forEach((button) => {
      button.addEventListener("click", () => {
        const linkItem = button.closest(".link-item");
        if (!linkItem) return;
        const linkId = linkItem.dataset.linkId;
        removeLink(block.id, linkId);
      });
    });
  });
}

function updateBlockName(blockId, value) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;
  block.name = value.trim() || block.name;
  saveBlocks();
  renderBlocks();
}

function editBlockName(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;

  const newName = prompt("Editar nome do bloco:", block.name);
  if (newName === null) return;

  const trimmed = newName.trim();
  if (!trimmed) {
    alert("O nome do bloco não pode ficar vazio.");
    return;
  }

  block.name = trimmed;
  saveBlocks();
  renderBlocks();
}

function toggleLinkList(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;
  block.collapsed = !block.collapsed;
  saveBlocks();
  renderBlocks();
}

function addLink(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;

  block.links.push({
    id: uuid(),
    label: "",
    url: "",
  });
  saveBlocks();
  renderBlocks();
}

function updateLinkField(blockId, linkId, field, value) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;
  const link = block.links.find((entry) => entry.id === linkId);
  if (!link) return;

  if (field !== "label" && field !== "url") return;
  link[field] = value.trim();
  saveBlocks();
}

function removeLink(blockId, linkId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;
  block.links = block.links.filter((entry) => entry.id !== linkId);
  saveBlocks();
  renderBlocks();
}

function deleteBlock(blockId) {
  blocks = blocks.filter((item) => item.id !== blockId);
  saveBlocks();
  renderBlocks();
}

function openAllLinks(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;

  const validLinks = block.links.map((link) => link.url.trim()).filter((url) => url);
  if (validLinks.length === 0) {
    alert("Adicione pelo menos um link válido antes de abrir todos.");
    return;
  }

  const confirmed = confirm(`Abrir ${validLinks.length} links do bloco '${block.name}'?`);
  if (!confirmed) return;

  validLinks.forEach((url) => {
    try {
      const normalized = normalizeUrl(url);
      window.open(normalized, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.warn("URL inválida", url, error);
    }
  });
}

function openLink(blockId, linkId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;
  const link = block.links.find((entry) => entry.id === linkId);
  if (!link || !link.url.trim()) {
    alert("Link inválido. Verifique a URL antes de abrir.");
    return;
  }

  try {
    const normalized = normalizeUrl(link.url.trim());
    window.open(normalized, "_blank", "noopener,noreferrer");
  } catch (error) {
    alert("URL inválida. Verifique o formato da URL.");
  }
}

function normalizeUrl(value) {
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}