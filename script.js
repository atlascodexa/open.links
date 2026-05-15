const STORAGE_KEY = "openLinks.blocks";

const blocksContainer = document.getElementById("blocks-container");
const createBlockButton = document.getElementById("create-block-button");
const blockNameInput = document.getElementById("block-name-input");

let blocks = loadBlocks();

document.addEventListener("DOMContentLoaded", renderBlocks);
createBlockButton.addEventListener("click", createBlock);
blockNameInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") createBlock();
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
  const name = blockNameInput.value.trim();
  if (!name) {
    blockNameInput.focus();
    return;
  }

  blocks.push({
    id: crypto.randomUUID(),
    name,
    links: [],
  });

  blockNameInput.value = "";
  saveBlocks();
  renderBlocks();
}

function renderBlocks() {
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
        <input class="block-title" type="text" value="${escapeHtml(block.name)}" aria-label="Nome do bloco" />
        <div class="block-actions">
          <button class="primary open-all">Abrir links</button>
          <button class="primary add-link">Adicionar link</button>
          <button class="remove delete-block">Excluir bloco</button>
        </div>
      </div>
      <ul class="link-list">
        ${block.links
          .map(
            (link) => `
              <li class="link-item" data-link-id="${link.id}">
                <input class="link-url" type="url" value="${escapeHtml(link.url)}" placeholder="https://..." aria-label="URL do link" />
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

    blockCard.querySelector(".block-title").addEventListener("change", (event) => {
      updateBlockName(block.id, event.target.value);
    });
    blockCard.querySelector(".open-all").addEventListener("click", () => openAllLinks(block.id));
    blockCard.querySelector(".add-link").addEventListener("click", () => addLink(block.id));
    blockCard.querySelector(".delete-block").addEventListener("click", () => deleteBlock(block.id));

    blockCard.querySelectorAll(".link-url").forEach((input) => {
      input.addEventListener("change", (event) => {
        updateLinkUrl(block.id, input.closest(".link-item").dataset.linkId, event.target.value);
      });
    });

    blockCard.querySelectorAll(".open-link").forEach((button) => {
      button.addEventListener("click", () => {
        const linkItem = button.closest(".link-item");
        const linkId = linkItem.dataset.linkId;
        openLink(block.id, linkId);
      });
    });

    blockCard.querySelectorAll(".remove-link").forEach((button) => {
      button.addEventListener("click", () => {
        const linkItem = button.closest(".link-item");
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

function addLink(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;

  block.links.push({
    id: crypto.randomUUID(),
    url: "",
  });
  saveBlocks();
  renderBlocks();
}

function updateLinkUrl(blockId, linkId, value) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;
  const link = block.links.find((entry) => entry.id === linkId);
  if (!link) return;
  link.url = value.trim();
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
