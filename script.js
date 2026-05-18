const STORAGE_KEY = "openLinks.blocks";

let blocks = [];

// Gera um id único; usa crypto.randomUUID quando disponível, senão fallback simples
function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

document.addEventListener("DOMContentLoaded", () => {
  const blocksContainer = document.getElementById("blocks-container");
  const createBlockButton = document.getElementById("create-block-button");
  const blockNameInput = document.getElementById("block-name-input");

  // Load from storage and render
  blocks = loadBlocks();
  renderBlocks();

  // Attach UI listeners
  if (createBlockButton) createBlockButton.addEventListener("click", createBlock);
  if (blockNameInput)
    blockNameInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") createBlock();
    });
});

function loadBlocks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Erro ao carregar cache local", error);
    return [];
  }
}

function saveBlocks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
}

function createBlock() {
  try {
    const input = document.getElementById("block-name-input");
    const name = (input && input.value && input.value.trim()) || "";
    if (!name) {
      if (input) input.focus();
      }
      return;
    }

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
        <p>Não há blocos ainda. Crie um bloco para organizar seus links.</p>
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
          <button class="primary open-all">Abrir links</button>
          <button class="primary add-link">Adicionar link</button>
          <button class="secondary toggle-links" type="button">${block.collapsed ? "Ver links" : "Ocultar links"}</button>
                    <button class="secondary edit-block">✏️</button>
          <button class="remove delete-block">❌</button>
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

  const confirmed = confirm(`Abrir ${validLinks.length} links do bloco '${block.name}'?\n\n(Nota: Se apenas o primeiro link abrir, verifique a barra de endereços do seu navegador e autorize a abertura de pop-ups para este site).`);
  if (!confirmed) return;

  validLinks.forEach((url) => {
    try {
      const normalized = normalizeUrl(url);
      const newWindow = window.open(normalized, "_blank", "noopener,noreferrer");
      
      if (!newWindow) {
        console.warn("O pop-up para a URL foi bloqueado pelo navegador:", url);
      }
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