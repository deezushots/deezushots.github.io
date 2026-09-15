(function () {
  const API = window.API_BASE_URL;
  const state = {
    activeType: "photography",
    activeCategory: null,
    categories: {},
    media: [],
  };

  document.getElementById("year").textContent = new Date().getFullYear();

  // Nav background only appears once the page is scrolled
  const navEl = document.querySelector(".nav");
  function syncNavScroll() {
    navEl.classList.toggle("scrolled", window.scrollY > 8);
  }
  syncNavScroll();
  window.addEventListener("scroll", syncNavScroll, { passive: true });

  // Mobile nav toggle
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  function fillFields(content) {
    document.querySelectorAll("[data-field]").forEach((el) => {
      const key = el.getAttribute("data-field");
      if (content[key] !== undefined && content[key] !== "") {
        el.textContent = content[key];
      }
    });
    document.querySelectorAll("[data-field-html]").forEach((el) => {
      const key = el.getAttribute("data-field-html");
      if (content[key]) {
        el.innerHTML = String(content[key])
          .split("\n\n")
          .map((p) => `<p>${escapeHTML(p).replace(/\n/g, "<br>")}</p>`)
          .join("");
      }
    });

    document.title = `${content.brandName || "Deezu Shots"} — Photography, Videography & Documentary`;

    const mapLink = content.mapLink || "#";
    document.getElementById("mapLink").href = mapLink;
    document.getElementById("mapButton").href = mapLink;

    const mapEmbed = document.getElementById("mapEmbed");
    const query = content.address || content.mapLink;
    if (query) {
      mapEmbed.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }

    const phoneLink = document.getElementById("phoneLink");
    phoneLink.textContent = content.phone || "";
    phoneLink.href = content.phone ? `tel:${content.phone.replace(/\s+/g, "")}` : "#";

    const emailLink = document.getElementById("emailLink");
    emailLink.textContent = content.email || "";
    emailLink.href = content.email ? `mailto:${content.email}` : "#";

    const fb = document.getElementById("facebookLink");
    if (content.socials && content.socials.facebook) {
      fb.href = content.socials.facebook;
      fb.closest("li").style.display = "";
    } else {
      fb.closest("li").style.display = "none";
    }
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderChips() {
    const chipWrap = document.getElementById("categoryChips");
    const cats = state.categories[state.activeType] || [];
    chipWrap.innerHTML = "";

    const allChip = makeChip("All", state.activeCategory === null);
    allChip.addEventListener("click", () => { state.activeCategory = null; renderChips(); renderGrid(); });
    chipWrap.appendChild(allChip);

    cats.forEach((cat) => {
      const chip = makeChip(cat, state.activeCategory === cat);
      chip.addEventListener("click", () => { state.activeCategory = cat; renderChips(); renderGrid(); });
      chipWrap.appendChild(chip);
    });
  }

  function makeChip(label, active) {
    const btn = document.createElement("button");
    btn.className = "chip" + (active ? " active" : "");
    btn.textContent = label;
    return btn;
  }

  function renderGrid() {
    const grid = document.getElementById("mediaGrid");
    grid.innerHTML = "";

    const items = state.media.filter((m) => {
      if (m.type !== state.activeType) return false;
      if (state.activeCategory && m.category !== state.activeCategory) return false;
      return true;
    });

    if (!items.length) {
      const note = document.createElement("div");
      note.className = "empty-note";
      note.textContent = "Nothing uploaded in this category yet — check back soon.";
      grid.appendChild(note);
      return;
    }

    items.forEach((item) => {
      const cell = document.createElement("div");
      cell.className = "grid-item";
      const src = item.url;

      if (item.mediaKind === "video") {
        cell.innerHTML = `
          <video src="${src}" muted playsinline preload="metadata"></video>
          <span class="play-badge">▶</span>
          <div class="cap">${escapeHTML(item.title || item.category)}</div>`;
      } else {
        cell.innerHTML = `
          <img src="${src}" alt="${escapeHTML(item.title || item.category)}" loading="lazy">
          <div class="cap">${escapeHTML(item.title || item.category)}</div>`;
      }

      cell.addEventListener("click", () => openLightbox(item, src));
      grid.appendChild(cell);
    });
  }

  function openLightbox(item, src) {
    const lightbox = document.getElementById("lightbox");
    const inner = document.getElementById("lightboxInner");
    inner.innerHTML =
      item.mediaKind === "video"
        ? `<video src="${src}" controls autoplay></video>`
        : `<img src="${src}" alt="${escapeHTML(item.title || item.category)}">`;
    if (item.title || item.caption) {
      const cap = document.createElement("p");
      cap.className = "lightbox-cap";
      cap.textContent = [item.title, item.caption].filter(Boolean).join(" — ");
      inner.appendChild(cap);
    }
    lightbox.classList.add("open");
  }

  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if (e.target.id === "lightbox") closeLightbox();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

  function closeLightbox() {
    const lightbox = document.getElementById("lightbox");
    lightbox.classList.remove("open");
    document.getElementById("lightboxInner").innerHTML = "";
  }

  document.getElementById("typeTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    document.querySelectorAll("#typeTabs .tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    state.activeType = btn.dataset.type;
    state.activeCategory = null;
    renderChips();
    renderGrid();
  });

  async function init() {
    try {
      const [contentRes, categoriesRes, mediaRes] = await Promise.all([
        fetch(`${API}/content`),
        fetch(`${API}/categories`),
        fetch(`${API}/media`),
      ]);
      const [content, categories, media] = await Promise.all([
        contentRes.json(),
        categoriesRes.json(),
        mediaRes.json(),
      ]);

      fillFields(content);
      state.categories = categories;
      state.media = media;
      renderChips();
      renderGrid();
    } catch (err) {
      console.error("Could not reach the Deezu Shots API:", err);
      document.getElementById("mediaGrid").innerHTML =
        '<div class="empty-note">The gallery couldn\'t load right now. Check back in a moment.</div>';
    }
  }

  init();
})();
