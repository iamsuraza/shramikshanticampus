const SUPABASE_URL = "https://gxpgbrdldnwbuodawxsz.supabase.co";
const SUPABASE_KEY = "sb_publishable_SOVyPllQc9BqnWuDbDAMBg_Vktqyxwd";
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initGalleryLightbox();
  loadCmsText();
  loadPublicNotices();
  loadResources("syllabus", "syllabus-list");
  loadResources("result", "results-list");
  loadPopupNotice();
  bindForms();
});

function initNavigation() {
  const navbar = document.getElementById("navbar");
  const button = document.getElementById("hamburger");
  const mobile = document.getElementById("mobile-nav");
  if (navbar && !navbar.classList.contains("solid")) {
    const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    onScroll();
  }
  if (button && mobile) {
    button.addEventListener("click", () => mobile.classList.toggle("open"));
    mobile.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => mobile.classList.remove("open")));
  }
}

async function loadCmsText() {
  if (!db) return;
  const nodes = document.querySelectorAll("[data-cms]");
  if (!nodes.length) return;
  const { data } = await db.from("site_settings").select("key,value").in("key", [...nodes].map((node) => node.dataset.cms));
  if (!data) return;
  const values = Object.fromEntries(data.map((row) => [row.key, row.value]));
  nodes.forEach((node) => {
    if (node.dataset.cms === "hero_title" && values.hero_title === "Education Beyond Expectations") return;
    if (values[node.dataset.cms]) node.textContent = values[node.dataset.cms];
  });
}

async function loadPublicNotices() {
  const home = document.getElementById("home-notices");
  const all = document.getElementById("notices-container");
  if (!home && !all) return;
  const fallback = [
    { title: "Admission Open for BAIDS, BCSIT and BA LL.B", category: "Admission", body: "Contact the campus office at 015404111 for application details.", published_at: new Date().toISOString(), is_pinned: true, file_url: null },
    { title: "Welcome to Shramik Shanti Campus", category: "General", body: "Latest notices will appear here after Supabase schema setup.", published_at: new Date().toISOString(), is_pinned: false, file_url: null }
  ];
  let notices = fallback;
  if (db) {
    const { data } = await db.from("notices").select("*").eq("is_published", true).order("is_pinned", { ascending: false }).order("published_at", { ascending: false }).limit(all ? 50 : 4);
    if (data && data.length) notices = data;
  }
  if (home) home.innerHTML = notices.slice(0, 4).map(renderNotice).join("");
  if (all) all.innerHTML = notices.map(renderNotice).join("");
}

function renderNotice(notice) {
  const date = notice.published_at ? new Date(notice.published_at).toLocaleDateString() : "";
  const file = notice.file_url ? `<a class="btn btn-outline dark" href="${escapeAttr(notice.file_url)}" target="_blank" rel="noreferrer">Open attachment</a>` : "";
  return `<article class="card notice-card ${notice.is_pinned ? "pinned" : ""}">
    <div style="flex:1">
      <div class="notice-meta"><span class="tag">${escapeHtml(notice.category || "General")}</span>${notice.is_pinned ? '<span class="tag pinned">Pinned</span>' : ""}<span class="tag">${date}</span></div>
      <h3>${escapeHtml(notice.title || "Untitled notice")}</h3>
      <p>${escapeHtml(notice.body || "")}</p>
      <div class="notice-actions">${file}</div>
    </div>
  </article>`;
}

async function loadResources(type, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!db) {
    target.innerHTML = `<div class="empty-state">Connect Supabase to publish ${type} files.</div>`;
    return;
  }
  const { data } = await db.from("resources").select("*").eq("type", type).eq("is_published", true).order("published_at", { ascending: false });
  if (!data || !data.length) {
    target.innerHTML = `<div class="empty-state">No ${type} files have been published yet.</div>`;
    return;
  }
  target.innerHTML = `<table class="resource-table"><thead><tr><th>Title</th><th>Program</th><th>Published</th><th>File</th></tr></thead><tbody>${data.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.program || "All")}</td><td>${row.published_at ? new Date(row.published_at).toLocaleDateString() : ""}</td><td><a class="text-link" href="${escapeAttr(row.file_url)}" target="_blank" rel="noreferrer">Download</a></td></tr>`).join("")}</tbody></table>`;
}

async function loadPopupNotice() {
  if (sessionStorage.getItem("ssc_popup_closed")) return;
  let popup = null;
  if (db) {
    const { data } = await db.from("popup_notices").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    popup = data;
  }
  if (!popup) {
    popup = { title: "Admissions Open", body: "Join BAIDS, BCSIT or BA LL.B at Shramik Shanti Campus.", image_url: "images/admission_popup_2026.jpeg", link_url: "admissions.html", button_label: "Apply Now" };
  }
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay show";
  overlay.innerHTML = `<div class="popup-box" role="dialog" aria-modal="true" aria-label="${escapeAttr(popup.title)}">
    ${popup.image_url ? `<img src="${escapeAttr(popup.image_url)}" alt="${escapeAttr(popup.title)}" />` : ""}
    <div class="popup-body"><div><h3>${escapeHtml(popup.title)}</h3><p>${escapeHtml(popup.body || "")}</p></div><div style="display:flex;gap:10px;align-items:center">${popup.link_url ? `<a class="btn btn-primary" href="${escapeAttr(popup.link_url)}">${escapeHtml(popup.button_label || "Open")}</a>` : ""}<button class="popup-close" aria-label="Close popup">&times;</button></div></div>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => {
    sessionStorage.setItem("ssc_popup_closed", "true");
    overlay.remove();
  };
  overlay.querySelector(".popup-close").addEventListener("click", close);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
}

function bindForms() {
  bindInquiryForm("inquiry-form", "inquiry-status", "admission");
  bindInquiryForm("contact-form", "contact-status", "contact");
}

function bindInquiryForm(formId, statusId, type) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form || !status) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.type = type;
    status.classList.remove("error");
    status.textContent = "Sending...";
    if (!db) {
      status.textContent = "Supabase is not loaded. Please call 015404111.";
      status.classList.add("error");
      return;
    }
    const { error } = await db.from("inquiries").insert(payload);
    if (error) {
      status.textContent = "Could not submit right now. Please call 015404111.";
      status.classList.add("error");
      return;
    }
    form.reset();
    status.textContent = "Thank you. The campus team will contact you soon.";
  });
}

function initGalleryLightbox() {
  const items = document.querySelectorAll(".gallery-item");
  if (!items.length) return;
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = '<button aria-label="Close">&times;</button><img alt="Gallery preview" />';
  document.body.appendChild(lightbox);
  const img = lightbox.querySelector("img");
  items.forEach((item) => item.addEventListener("click", () => {
    img.src = item.dataset.src || item.querySelector("img").src;
    lightbox.classList.add("open");
  }));
  lightbox.querySelector("button").addEventListener("click", () => lightbox.classList.remove("open"));
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.classList.remove("open"); });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
