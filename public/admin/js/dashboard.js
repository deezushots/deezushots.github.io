(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const TYPE_LABELS = {
    photography: "Photography",
    videography: "Videography",
    documentary: "Documentary"
  };

  let categories = [];
  let mediaItems = [];

  function showMsg(el, text, kind) {
    el.textContent = text;
    el.className = `msg show ${kind}`;
  }
  function hideMsg(el) {
    el.className = "msg";
  }

  async function api(url, opts) {
    const res = await fetch(url, opts);
    let data = {};
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/admin/login.html";
        throw new Error("Not authenticated");
      }
      throw new Error(data.error || "Something went wrong.");
    }
    return data;
  }

  // ---- auth check ----------------------------------------------------
  async function checkAuth() {
    const status = await api("/api/auth/status");
    if (!status.loggedIn) {
      window.location.href = "/admin/login.html";
      return;
    }
    $("#passwordReminder").style.display = status.passwordChanged ? "none" : "flex";
  }

  $("#logoutBtn").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login.html";
  });

  // =====================================================================
  // Business info
  // =====================================================================

  let footprint = [];

  function renderFootprintFields() {
    const wrap = $("#footprintFields");
    wrap.innerHTML = footprint
      .map(
        (f, i) => `
        <div class="field-row" data-idx="${i}" style="align-items:end;">
          <div>
            <label>Card ${i + 1} title</label>
            <input class="fp-title" value="${escAttr(f.title)}" />
          </div>
          <div style="display:flex; gap:10px;">
            <div style="flex:1;">
              <label>Card ${i + 1} text</label>
              <input class="fp-text" value="${escAttr(f.text)}" />
            </div>
            <button type="button" class="icon-btn danger fp-remove" title="Remove card" style="margin-bottom:16px;">✕</button>
          </div>
        </div>`
      )
      .join("");
    wrap.querySelectorAll(".fp-remove").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        footprint.splice(i, 1);
        renderFootprintFields();
      });
    });
  }

  function escAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  function collectFootprint() {
    const rows = $$("#footprintFields > div");
    return rows.map((row) => ({
      title: row.querySelector(".fp-title").value.trim(),
      text: row.querySelector(".fp-text").value.trim()
    })).filter((f) => f.title || f.text);
  }

  async function loadBusiness() {
    const b = await api("/api/business");
    $("#bName").value = b.name || "";
    $("#bOwnerName").value = b.ownerName || "";
    $("#bTagline").value = b.tagline || "";
    $("#bHeroHeadline").value = b.heroHeadline || "";
    $("#bHeroSubtext").value = b.heroSubtext || "";
    $("#bBio").value = b.bio || "";
    $("#bAddress").value = b.address || "";
    $("#bMapQuery").value = b.mapQuery || "";
    $("#bPhone").value = b.phone || "";
    $("#bWhatsapp").value = b.whatsapp || "";
    $("#bEmail").value = b.email || "";
    $("#bInstagram").value = b.instagram || "";
    $("#bFacebook").value = b.facebook || "";
    $("#bThreads").value = b.threads || "";
    footprint = Array.isArray(b.footprint) ? b.footprint.slice() : [];
    renderFootprintFields();
  }

  $("#businessForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#businessMsg");
    hideMsg(msg);
    footprint = collectFootprint();
    try {
      await api("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: $("#bName").value.trim(),
          ownerName: $("#bOwnerName").value.trim(),
          tagline: $("#bTagline").value.trim(),
          heroHeadline: $("#bHeroHeadline").value.trim(),
          heroSubtext: $("#bHeroSubtext").value.trim(),
          bio: $("#bBio").value,
          address: $("#bAddress").value.trim(),
          mapQuery: $("#bMapQuery").value.trim(),
          phone: $("#bPhone").value.trim(),
          whatsapp: $("#bWhatsapp").value.trim(),
          email: $("#bEmail").value.trim(),
          instagram: $("#bInstagram").value.trim(),
          facebook: $("#bFacebook").value.trim(),
          threads: $("#bThreads").value.trim(),
          footprint
        })
      });
      showMsg(msg, "Saved. Your changes are live on the site.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  });

  // =====================================================================
  // Categories
  // =====================================================================

  async function loadCategories() {
    categories = await api("/api/categories");
    renderCategoryGroups();
    renderCategorySelectForUpload();
  }

  function renderCategoryGroups() {
    const wrap = $("#catGroups");
    wrap.innerHTML = Object.keys(TYPE_LABELS)
      .map((type) => {
        const items = categories.filter((c) => c.type === type);
        return `
          <div class="cat-group">
            <h4>${TYPE_LABELS[type]}</h4>
            ${
              items.length
                ? items.map((c) => catItemHtml(c)).join("")
                : `<p class="empty-note">No categories yet.</p>`
            }
          </div>`;
      })
      .join("");

    wrap.querySelectorAll(".cat-item").forEach((row) => {
      const id = row.dataset.id;
      row.querySelector(".cat-save").addEventListener("click", () => saveCategory(id, row));
      row.querySelector(".cat-delete").addEventListener("click", () => deleteCategory(id));
    });
  }

  function catItemHtml(c) {
    return `
      <div class="cat-item" data-id="${c.id}">
        <input class="cat-name-input" value="${escAttr(c.name)}" />
        <div class="cat-actions">
          <button type="button" class="icon-btn cat-save" title="Save">✓</button>
          <button type="button" class="icon-btn danger cat-delete" title="Delete">✕</button>
        </div>
      </div>`;
  }

  async function saveCategory(id, row) {
    const msg = $("#catMsg");
    hideMsg(msg);
    const name = row.querySelector(".cat-name-input").value.trim();
    if (!name) return;
    try {
      await api(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      await loadCategories();
      await loadMedia();
      showMsg(msg, "Category updated.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  }

  async function deleteCategory(id) {
    const msg = $("#catMsg");
    hideMsg(msg);
    if (!confirm("Delete this category? This can't be undone.")) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      await loadCategories();
      showMsg(msg, "Category deleted.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  }

  $("#addCatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#catMsg");
    hideMsg(msg);
    const type = $("#newCatType").value;
    const name = $("#newCatName").value.trim();
    if (!name) return;
    try {
      await api("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name })
      });
      $("#newCatName").value = "";
      await loadCategories();
      showMsg(msg, "Category added.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  });

  // =====================================================================
  // Media
  // =====================================================================

  function renderCategorySelectForUpload() {
    // Any category can hold a photo or a video (e.g. a documentary category
    // can contain both), so every category is offered regardless of the
    // selected media type.
    const select = $("#mCategory");
    const options = categories
      .map((c) => `<option value="${c.id}">${TYPE_LABELS[c.type]} — ${escAttr(c.name)}</option>`)
      .join("");
    select.innerHTML = `<option value="">Uncategorized</option>${options}`;
  }

  $("#mType").addEventListener("change", renderCategorySelectForUpload);

  async function loadMedia() {
    mediaItems = await api("/api/media");
    renderMediaTable();
  }

  function renderMediaTable() {
    const body = $("#mediaTableBody");
    const emptyNote = $("#mediaEmptyNote");
    if (!mediaItems.length) {
      body.innerHTML = "";
      emptyNote.style.display = "block";
      return;
    }
    emptyNote.style.display = "none";

    body.innerHTML = mediaItems
      .map((m) => {
        const thumb =
          m.type === "video"
            ? `<video class="media-thumb" src="${m.url}" muted></video>`
            : `<img class="media-thumb" src="${m.url}" alt="" />`;
        const catOptions = categories
          .map(
            (c) =>
              `<option value="${c.id}" ${c.id === m.categoryId ? "selected" : ""}>${TYPE_LABELS[c.type]} — ${escAttr(c.name)}</option>`
          )
          .join("");
        return `
          <tr data-id="${m.id}">
            <td>${thumb}</td>
            <td><input class="media-title-input" value="${escAttr(m.title)}" /></td>
            <td>${m.type === "video" ? "Video" : "Photo"}</td>
            <td>
              <select class="media-cat-select">
                <option value="">Uncategorized</option>
                ${catOptions}
              </select>
            </td>
            <td class="row-actions">
              <button type="button" class="icon-btn media-save" title="Save changes">✓</button>
              <button type="button" class="icon-btn danger media-delete" title="Delete">✕</button>
            </td>
          </tr>`;
      })
      .join("");

    body.querySelectorAll("tr").forEach((row) => {
      const id = row.dataset.id;
      row.querySelector(".media-save").addEventListener("click", () => saveMediaRow(id, row));
      row.querySelector(".media-delete").addEventListener("click", () => deleteMediaRow(id));
    });
  }

  async function saveMediaRow(id, row) {
    const msg = $("#uploadMsg");
    hideMsg(msg);
    const title = row.querySelector(".media-title-input").value.trim();
    const categoryId = row.querySelector(".media-cat-select").value || null;
    try {
      await api(`/api/media/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, categoryId })
      });
      await loadMedia();
      showMsg(msg, "Updated.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  }

  async function deleteMediaRow(id) {
    const msg = $("#uploadMsg");
    hideMsg(msg);
    if (!confirm("Delete this file permanently?")) return;
    try {
      await api(`/api/media/${id}`, { method: "DELETE" });
      await loadMedia();
      showMsg(msg, "Deleted.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  }

  $("#uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#uploadMsg");
    hideMsg(msg);
    const fileInput = $("#mFile");
    if (!fileInput.files.length) return;

    const fd = new FormData();
    fd.append("file", fileInput.files[0]);
    fd.append("title", $("#mTitle").value.trim());
    fd.append("type", $("#mType").value);
    fd.append("categoryId", $("#mCategory").value);

    const btn = $("#uploadBtn");
    btn.disabled = true;
    btn.textContent = "Uploading…";
    try {
      await api("/api/media", { method: "POST", body: fd });
      $("#uploadForm").reset();
      renderCategorySelectForUpload();
      await loadMedia();
      showMsg(msg, "Uploaded.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Upload";
    }
  });

  // =====================================================================
  // Password
  // =====================================================================

  $("#passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#pwMsg");
    hideMsg(msg);
    const currentPassword = $("#currentPassword").value;
    const newPassword = $("#newPassword").value;
    const confirmPassword = $("#confirmPassword").value;
    if (newPassword !== confirmPassword) {
      showMsg(msg, "New password and confirmation don't match.", "error");
      return;
    }
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      $("#passwordForm").reset();
      $("#passwordReminder").style.display = "none";
      showMsg(msg, "Password updated.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  });

  // =====================================================================
  // Tabs (simple active-state highlight on scroll/click)
  // =====================================================================

  $$(".dash-header .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".dash-header .tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  // =====================================================================
  // Boot
  // =====================================================================

  (async function init() {
    try {
      await checkAuth();
      await loadCategories();
      await loadBusiness();
      await loadMedia();
    } catch (err) {
      console.error(err);
    }
  })();
})();
