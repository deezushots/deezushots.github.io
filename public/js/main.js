(function () {
  "use strict";

  const state = {
    business: null,
    categories: [],
    media: [],
    activeType: "all",
    activeCategory: "all"
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  document.getElementById("footerYear").textContent = new Date().getFullYear();

  // ---- nav toggle ---------------------------------------------------------
  $("#navToggle").addEventListener("click", () => {
    $("#mainNav").classList.toggle("open");
  });
  $$("#mainNav a").forEach((a) =>
    a.addEventListener("click", () => $("#mainNav").classList.remove("open"))
  );

  // ---- fetch helpers --------------------------------------------------------
  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  const TYPE_LABELS = {
    photography: "Photography",
    videography: "Videography",
    documentary: "Documentary"
  };

  // ---- render: business info -------------------------------------------------
  function renderBusiness(b) {
    document.title = `${b.name} — Photography, Videography & Documentary, Kano`;
    $("#brandName").textContent = b.name;
    $("#footerName").innerHTML = `© <span id="footerYear">${new Date().getFullYear()}</span> ${escapeHtml(b.name)}. All rights reserved.`;
    $("#heroHeadline").textContent = b.heroHeadline;
    $("#heroSubtext").textContent = b.heroSubtext;
    $("#ownerName").textContent = b.ownerName;

    const bioHtml = String(b.bio || "")
      .split(/\n{2,}/)
      .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
      .join("");
    $("#bioText").innerHTML = bioHtml || "<p>Biography coming soon.</p>";

    const footprint = Array.isArray(b.footprint) ? b.footprint : [];
    $("#footprintGrid").innerHTML = footprint
      .map(
        (f) => `
        <div class="footprint-card">
          <h3>${escapeHtml(f.title)}</h3>
          <p>${escapeHtml(f.text)}</p>
        </div>`
      )
      .join("");

    $("#cAddress").textContent = b.address || "—";
    $("#cPhone").textContent = b.phone || "—";
    $("#cEmail").textContent = b.email || "—";

    const socials = [];
    if (b.whatsapp) socials.push({ label: "WhatsApp", href: `https://wa.me/${b.whatsapp.replace(/[^\d]/g, "")}` });
    if (b.instagram) socials.push({ label: "Instagram", href: b.instagram });
    if (b.facebook) socials.push({ label: "Facebook", href: b.facebook });
    if (b.threads) socials.push({ label: "Threads", href: b.threads });
    $("#cSocial").innerHTML = socials
      .map((s) => `<a href="${escapeHtml(s.href)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`)
      .join("");

    const query = encodeURIComponent(b.mapQuery || b.address || "Kano, Nigeria");
    $("#mapFrame").innerHTML = `<iframe src="https://maps.google.com/maps?q=${query}&output=embed" loading="lazy" allowfullscreen title="Deezu Shots location"></iframe>`;
  }

  // ---- render: filters --------------------------------------------------------
  function renderSubfilters() {
    const container = $("#subFilters");
    if (state.activeType === "all") {
      container.innerHTML = "";
      return;
    }
    const cats = state.categories.filter((c) => c.type === state.activeType);
    const pills = [`<button class="filter-pill ${state.activeCategory === "all" ? "active" : ""}" data-cat="all">All ${TYPE_LABELS[state.activeType]}</button>`]
      .concat(
        cats.map(
          (c) =>
            `<button class="filter-pill ${state.activeCategory === c.id ? "active" : ""}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`
        )
      );
    container.innerHTML = pills.join("");
    container.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeCategory = btn.dataset.cat;
        renderSubfilters();
        renderMedia();
      });
    });
  }

  function categoryName(id) {
    const c = state.categories.find((c) => c.id === id);
    return c ? c.name : null;
  }

  // ---- render: media grid --------------------------------------------------------
  function renderMedia() {
    let items = state.media;
    if (state.activeType !== "all") {
      items = items.filter((m) => {
        const cat = state.categories.find((c) => c.id === m.categoryId);
        return cat && cat.type === state.activeType;
      });
      if (state.activeCategory !== "all") {
        items = items.filter((m) => m.categoryId === state.activeCategory);
      }
    }

    const grid = $("#mediaGrid");
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">No work uploaded in this category yet — check back soon.</div>`;
      return;
    }

    grid.innerHTML = items
      .map((m) => {
        const cat = categoryName(m.categoryId);
        const badge = cat ? `${TYPE_LABELS[(state.categories.find((c) => c.id === m.categoryId) || {}).type] || ""} · ${cat}` : "";
        const thumb =
          m.type === "video"
            ? `<video src="${m.url}" muted preload="metadata"></video>
               <div class="play"><svg viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="11" fill="rgba(16,23,26,0.55)" stroke="white" stroke-width="1"/><path d="M10 8l6 4-6 4V8z"/></svg></div>`
            : `<img src="${m.url}" alt="${escapeHtml(m.title)}" loading="lazy" />`;
        return `
          <div class="media-card" data-id="${m.id}">
            ${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ""}
            ${thumb}
            <div class="caption">${escapeHtml(m.title)}</div>
          </div>`;
      })
      .join("");

    grid.querySelectorAll(".media-card").forEach((card) => {
      card.addEventListener("click", () => openLightbox(card.dataset.id));
    });
  }

  // ---- type filter buttons --------------------------------------------------------
  $$("#typeFilters .filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$("#typeFilters .filter-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeType = btn.dataset.type;
      state.activeCategory = "all";
      renderSubfilters();
      renderMedia();
    });
  });

  // ---- lightbox --------------------------------------------------------
  const lightbox = $("#lightbox");
  function openLightbox(id) {
    const item = state.media.find((m) => m.id === id);
    if (!item) return;
    const el =
      item.type === "video"
        ? `<video src="${item.url}" controls autoplay></video>`
        : `<img src="${item.url}" alt="${escapeHtml(item.title)}" />`;
    $("#lightboxMedia").innerHTML = el;
    $("#lightboxCaption").textContent = item.title;
    lightbox.classList.add("open");
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    $("#lightboxMedia").innerHTML = "";
  }
  $("#lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // ---- boot --------------------------------------------------------
  async function init() {
    try {
      const [business, categories, media] = await Promise.all([
        getJSON("/api/business"),
        getJSON("/api/categories"),
        getJSON("/api/media")
      ]);
      state.business = business;
      state.categories = categories;
      state.media = media;
      renderBusiness(business);
      renderSubfilters();
      renderMedia();
    } catch (err) {
      console.error(err);
    }
  }

  init();
})();
