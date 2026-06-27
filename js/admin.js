const SUPABASE_URL = "https://gxpgbrdldnwbuodawxsz.supabase.co";
const SUPABASE_KEY = "sb_publishable_SOVyPllQc9BqnWuDbDAMBg_Vktqyxwd";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "campus-assets";

document.addEventListener("DOMContentLoaded", async () => {
  bindLogin();
  bindTabs();
  bindLogout();
  const { data } = await db.auth.getSession();
  if (data.session) showAdmin();
});

function bindLogin() {
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("login-status");
    const form = new FormData(event.target);
    status.textContent = "Signing in...";
    const { error } = await db.auth.signInWithPassword({ email: form.get("email"), password: form.get("password") });
    if (error) return setStatus(status, error.message, true);
    showAdmin();
  });
}

function bindLogout() {
  document.getElementById("logout-button").addEventListener("click", async () => {
    await db.auth.signOut();
    location.reload();
  });
}

function bindTabs() {
  document.querySelectorAll(".admin-side [data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".admin-side [data-panel]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`panel-${button.dataset.panel}`).classList.add("active");
    });
  });
}

async function showAdmin() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-app").style.display = "grid";
  bindAdminForms();
  await Promise.all([loadNotices(), loadResources(), loadSettings(), loadInquiries(), loadCounts()]);
}

function bindAdminForms() {
  document.getElementById("notice-form").addEventListener("submit", saveNotice);
  document.getElementById("resource-form").addEventListener("submit", saveResource);
  document.getElementById("popup-form").addEventListener("submit", savePopup);
  document.getElementById("settings-form").addEventListener("submit", saveSettings);
}

async function uploadFile(file, folder) {
  if (!file || !file.name) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function saveNotice(event) {
  event.preventDefault();
  const status = document.getElementById("notice-status");
  const form = event.target;
  const data = new FormData(form);
  try {
    setStatus(status, "Saving...");
    const fileUrl = await uploadFile(data.get("file"), "notices");
    const payload = {
      title: data.get("title"),
      category: data.get("category"),
      body: data.get("body"),
      is_pinned: data.get("is_pinned") === "on",
      is_published: data.get("is_published") === "on",
      published_at: data.get("published_at") ? new Date(data.get("published_at")).toISOString() : new Date().toISOString()
    };
    if (fileUrl) payload.file_url = fileUrl;
    const id = data.get("id");
    const query = id ? db.from("notices").update(payload).eq("id", id) : db.from("notices").insert(payload);
    const { error } = await query;
    if (error) throw error;
    form.reset();
    setStatus(status, "Notice saved.");
    await loadNotices();
    await loadCounts();
  } catch (error) {
    setStatus(status, error.message, true);
  }
}

async function saveResource(event) {
  event.preventDefault();
  const status = document.getElementById("resource-status");
  const form = event.target;
  const data = new FormData(form);
  try {
    setStatus(status, "Uploading...");
    const fileUrl = await uploadFile(data.get("file"), data.get("type"));
    const payload = { title: data.get("title"), type: data.get("type"), program: data.get("program") || null, file_url: fileUrl, is_published: data.get("is_published") === "on", published_at: new Date().toISOString() };
    const { error } = await db.from("resources").insert(payload);
    if (error) throw error;
    form.reset();
    setStatus(status, "Resource saved.");
    await loadResources();
    await loadCounts();
  } catch (error) {
    setStatus(status, error.message, true);
  }
}

async function savePopup(event) {
  event.preventDefault();
  const status = document.getElementById("popup-status");
  const data = new FormData(event.target);
  try {
    setStatus(status, "Saving popup...");
    const fileUrl = await uploadFile(data.get("file"), "popups");
    const { error: disableError } = await db.from("popup_notices").update({ is_active: false }).eq("is_active", true);
    if (disableError) throw disableError;
    const payload = { title: data.get("title"), body: data.get("body"), link_url: data.get("link_url"), button_label: data.get("button_label"), image_url: fileUrl || "images/admission_popup_2026.jpeg", is_active: data.get("is_active") === "on" };
    const { error } = await db.from("popup_notices").insert(payload);
    if (error) throw error;
    setStatus(status, "Popup saved.");
  } catch (error) {
    setStatus(status, error.message, true);
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const status = document.getElementById("settings-status");
  const data = new FormData(event.target);
  const rows = ["hero_title", "hero_subtitle", "about_summary"].map((key) => ({ key, value: data.get(key) || "" }));
  const { error } = await db.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return setStatus(status, error.message, true);
  setStatus(status, "Content saved.");
}

async function loadNotices() {
  const list = document.getElementById("notice-admin-list");
  const { data, error } = await db.from("notices").select("*").order("created_at", { ascending: false });
  if (error) return list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  list.innerHTML = data.map((row) => `<div class="admin-row"><div><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.category)} ${row.is_pinned ? "| pinned" : ""} ${row.is_published ? "| published" : "| hidden"}</p></div><div class="admin-row-actions"><button class="btn btn-outline dark" onclick="deleteRow('notices','${row.id}')">Delete</button></div></div>`).join("") || '<div class="empty-state">No notices yet.</div>';
}

async function loadResources() {
  const list = document.getElementById("resource-admin-list");
  const { data, error } = await db.from("resources").select("*").order("created_at", { ascending: false });
  if (error) return list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  list.innerHTML = data.map((row) => `<div class="admin-row"><div><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.type)} | ${escapeHtml(row.program || "All programs")}</p></div><div class="admin-row-actions"><a class="btn btn-outline dark" href="${row.file_url}" target="_blank" rel="noreferrer">Open</a><button class="btn btn-outline dark" onclick="deleteRow('resources','${row.id}')">Delete</button></div></div>`).join("") || '<div class="empty-state">No resources yet.</div>';
}

async function loadSettings() {
  const { data } = await db.from("site_settings").select("key,value");
  if (!data) return;
  data.forEach((row) => {
    const field = document.querySelector(`#settings-form [name="${row.key}"]`);
    if (field) field.value = row.value || "";
  });
}

async function loadInquiries() {
  const list = document.getElementById("inquiry-admin-list");
  const { data, error } = await db.from("inquiries").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  list.innerHTML = data.map((row) => `<div class="admin-row"><div><strong>${escapeHtml(row.name || "Unknown")}</strong><p>${escapeHtml(row.type || "")} | ${escapeHtml(row.program || row.subject || "")}</p><p>${escapeHtml(row.phone || "")} ${escapeHtml(row.email || "")}</p><p>${escapeHtml(row.message || "")}</p></div></div>`).join("") || '<div class="empty-state">No inquiries yet.</div>';
}

async function loadCounts() {
  const [notices, syllabus, results, inquiries] = await Promise.all([
    db.from("notices").select("id", { count: "exact", head: true }),
    db.from("resources").select("id", { count: "exact", head: true }).eq("type", "syllabus"),
    db.from("resources").select("id", { count: "exact", head: true }).eq("type", "result"),
    db.from("inquiries").select("id", { count: "exact", head: true })
  ]);
  document.getElementById("count-notices").textContent = notices.count || 0;
  document.getElementById("count-syllabus").textContent = syllabus.count || 0;
  document.getElementById("count-results").textContent = results.count || 0;
  document.getElementById("count-inquiries").textContent = inquiries.count || 0;
}

async function deleteRow(table, id) {
  if (!confirm("Delete this item?")) return;
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) return alert(error.message);
  await Promise.all([loadNotices(), loadResources(), loadCounts()]);
}

function setStatus(node, message, isError = false) {
  node.textContent = message;
  node.classList.toggle("error", isError);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
