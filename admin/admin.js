(function () {
  const API = window.API_BASE_URL;
  const TYPES = ["photography", "videography", "documentary"];

  const token = localStorage.getItem("deezuAdminToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  let categories = {};
  let media = [];

  async function authFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      localStorage.removeItem("deezuAdminToken");
      window.location.href = "login.html";
      throw new Error("Session expired.");
    }
    return res;
  }

  function flash(el, message, ok = true) {
    el.textContent = message;
    el.className = ok ? "form-success" : "form-error";
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3500);
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("deezuAdminToken");
    window.location.href = "login.html";
  });

  // ── Content form ─────────────────────────────────────────
  const contentForm = document.getElementById("contentForm");
  const contentStatus = document.getElementById("contentStatus");

  async function loadContent() {
    const res = await authFetch("/content");
    const content = await res.json();
    Object.entries(content).forEach(([key, value]) => {
      if (key === "socials") return;
      const el = document.getElementById(key);
      if (el) el.value = value;
    });
    if (content.socials) {
      document.getElementById("facebook").value = content.socials.facebook || "";
      document.getElementById("instagram").value = content.socials.instagram || "";
      document.getElementById("threads").value = content.socials.threads || "";
      document.getElementById("audiomack").value = content.socials.audiomack || "";
    }
  }

  contentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      brandName: document.getElementById("brandName").value,
      tagline: document.getElementById("tagline").value,
      heroSubtext: document.getElementById("heroSubtext").value,
      bioName: document.getElementById("bioName").value,
      bioAka: document.getElementById("bioAka").value,
      bio: document.getElementById("bio").value,
      address: document.getElementById("address").value,
      mapLink: document.getElementById("mapLink").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      socials: {
        facebook: document.getElementById("facebook").value,
        instagram: document.getElementById("instagram").value,
        threads: document.getElementById("threads").value,
        audiomack: document.getElementById("audiomack").value,
      },
    };

    try {
      const res = await authFetch("/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not save.");
      flash(contentStatus, "Saved.");
    } catch (err) {
      flash(contentStatus, err.message, false);
    }
  });

  // ── Categories ───────────────────────────────────────────
  const catColumns = document.getElementById("catColumns");

  async function loadCategories() {
    const res = await authFetch("/categories");
    categories = await res.json();
    renderCategoryColumns();
    populateUploadCategorySelect();
  }

  function renderCategoryColumns() {
    catColumns.innerHTML = "";
    TYPES.forEach((type) => {
      const col = document.createElement("div");
      col.className = "cat-column";
      col.innerHTML = `<h3>${type}</h3>`;

      (categories[type] || []).forEach((name, index) => {
        const row = document.createElement("div");
        row.className = "cat-item";
        row.innerHTML = `
          <input value="${escapeAttr(name)}" data-type="${type}" data-index="${index}">
          <button class="icon-btn save-cat" title="Save name">✓</button>
          <button class="icon-btn danger del-cat" title="Delete category">✕</button>`;
        col.appendChild(row);
      });

      const addRow = document.createElement("div");
      addRow.className = "add-cat";
      addRow.innerHTML = `
        <input type="text" placeholder="New category…" data-add-type="${type}">
        <button class="icon-btn add-cat-btn" data-add-type="${type}" title="Add category">+</button>`;
      col.appendChild(addRow);

      catColumns.appendChild(col);
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  catColumns.addEventListener("click", async (e) => {
    if (e.target.classList.contains("save-cat")) {
      const input = e.target.previousElementSibling;
      const { type, index } = input.dataset;
      await authFetch(`/categories/${type}/${index}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: input.value }),
      });
      await loadCategories();
      await loadMedia();
    }

    if (e.target.classList.contains("del-cat")) {
      const input = e.target.previousElementSibling.previousElementSibling;
      const { type, index } = input.dataset;
      if (!confirm(`Delete "${input.value}"? Media in it will move to Uncategorized.`)) return;
      await authFetch(`/categories/${type}/${index}`, { method: "DELETE" });
      await loadCategories();
      await loadMedia();
    }

    if (e.target.classList.contains("add-cat-btn")) {
      const type = e.target.dataset.addType;
      const input = e.target.previousElementSibling;
      if (!input.value.trim()) return;
      const res = await authFetch(`/categories/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: input.value.trim() }),
      });
      if (res.ok) {
        input.value = "";
        await loadCategories();
      } else {
        alert((await res.json()).error || "Could not add category.");
      }
    }
  });

  // ── Upload ───────────────────────────────────────────────
  const uploadType = document.getElementById("uploadType");
  const uploadCategory = document.getElementById("uploadCategory");
  const uploadForm = document.getElementById("uploadForm");
  const uploadStatus = document.getElementById("uploadStatus");

  function populateUploadCategorySelect() {
    const cats = categories[uploadType.value] || [];
    uploadCategory.innerHTML = cats.map((c) => `<option value="${escapeAttr(c)}">${c}</option>`).join("");
  }
  uploadType.addEventListener("change", populateUploadCategorySelect);

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("file").files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", uploadType.value);
    formData.append("category", uploadCategory.value || "Uncategorized");
    formData.append("title", document.getElementById("uploadTitle").value);
    formData.append("caption", document.getElementById("uploadCaption").value);

    flash(uploadStatus, "Uploading…");
    try {
      const res = await authFetch("/media", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed.");
      uploadForm.reset();
      populateUploadCategorySelect();
      flash(uploadStatus, "Uploaded.");
      await loadMedia();
    } catch (err) {
      flash(uploadStatus, err.message, false);
    }
  });

  // ── Media library ────────────────────────────────────────
  const mediaLib = document.getElementById("mediaLib");

  async function loadMedia() {
    const res = await authFetch("/media");
    media = await res.json();
    renderMediaLib();
  }

  function renderMediaLib() {
    mediaLib.innerHTML = "";
    media.forEach((item) => {
      const src = item.url;
      const card = document.createElement("div");
      card.className = "media-card";
      const thumb =
        item.mediaKind === "video"
          ? `<video class="thumb" src="${src}" muted></video>`
          : `<img class="thumb" src="${src}" alt="">`;
      card.innerHTML = `
        ${thumb}
        <div class="meta">
          <div class="cat-badge">${item.type} · ${escapeAttr(item.category)}</div>
          <div class="title">${escapeAttr(item.title || "Untitled")}</div>
        </div>
        <button class="del-btn" data-id="${item._id}">Delete</button>`;
      mediaLib.appendChild(card);
    });
  }

  mediaLib.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("del-btn")) return;
    if (!confirm("Delete this file? This can't be undone.")) return;
    await authFetch(`/media/${e.target.dataset.id}`, { method: "DELETE" });
    await loadMedia();
  });

  // ── Password ─────────────────────────────────────────────
  const passwordForm = document.getElementById("passwordForm");
  const passwordStatus = document.getElementById("passwordStatus");

  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;

    try {
      const res = await authFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not update password.");
      flash(passwordStatus, "Password updated.");
      passwordForm.reset();
    } catch (err) {
      flash(passwordStatus, err.message, false);
    }
  });

  // ── Init ─────────────────────────────────────────────────
  (async function init() {
    await loadContent();
    await loadCategories();
    await loadMedia();
  })();
})();
