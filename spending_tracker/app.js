// app.js

// Initialize Supabase Client (Requires config.js to be loaded first)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Application State Variables
let currentUser = null;
let currentProfile = null;
let userFamilyGroups = [];
let isSignUpMode = false;
let confirmActionCallback = null;
let isAuthListenerReady = false;

// DOM Element References
const alertBox = document.getElementById("alert-box");
const mainHeader = document.getElementById("main-header");
const navUserBadge = document.getElementById("nav-user-badge");
const btnThemeToggle = document.getElementById("btn-theme-toggle");

// Views
const views = {
  auth: document.getElementById("auth-view"),
  onboarding: document.getElementById("onboarding-view"),
  dashboard: document.getElementById("dashboard-view"),
  family: document.getElementById("family-view"),
  mod: document.getElementById("mod-view"),
  admin: document.getElementById("admin-view"),
  settings: document.getElementById("settings-view")
};

// Navigation Buttons
const btnNavDashboard = document.getElementById("btn-nav-dashboard");
const btnNavFamily = document.getElementById("btn-nav-family");
const btnNavMod = document.getElementById("btn-nav-mod");
const btnNavAdmin = document.getElementById("btn-nav-admin");
const btnNavSettings = document.getElementById("btn-nav-settings");
const btnSignOut = document.getElementById("btn-sign-out");

// Auth Elements
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const passwordHint = document.getElementById("password-hint");
const btnAuthSubmit = document.getElementById("btn-auth-submit");
const authToggleLink = document.getElementById("auth-toggle-link");
const authToggleText = document.getElementById("auth-toggle-text");
const btnGithubLogin = document.getElementById("btn-github-login");
const onboardingForm = document.getElementById("onboarding-form");
const onboardingUsername = document.getElementById("onboarding-username");

// Expense Elements
const expenseForm = document.getElementById("expense-form");
const expenseTitle = document.getElementById("expense-title");
const expenseAmount = document.getElementById("expense-amount");
const expenseCategory = document.getElementById("expense-category");
const expenseDate = document.getElementById("expense-date");
const expenseReceipt = document.getElementById("expense-receipt");
const expenseFamilySelect = document.getElementById("expense-family-select");
const expensesTbody = document.getElementById("expenses-tbody");
const totalSpendingEl = document.getElementById("total-spending");
const expenseViewFilter = document.getElementById("expense-view-filter");

// Family Elements
const createFamilyForm = document.getElementById("create-family-form");
const familyNameInput = document.getElementById("family-name-input");
const familyGroupsContainer = document.getElementById("family-groups-container");
const familyInvitesList = document.getElementById("family-invites-list");

// Mod/Admin/Settings Elements
const modTbody = document.getElementById("mod-tbody");
const adminTbody = document.getElementById("admin-tbody");
const passwordForm = document.getElementById("password-form");

// Modals
const modalConfirm = document.getElementById("modal-confirm");
const btnModalCancel = document.getElementById("btn-modal-cancel");
const btnModalConfirmAction = document.getElementById("btn-modal-confirm-action");
const modalDownloadRisk = document.getElementById("modal-download-risk");
const btnTriggerDownload = document.getElementById("btn-trigger-download");
const btnDownloadCancel = document.getElementById("btn-download-cancel");
const btnDownloadAcceptProceed = document.getElementById("btn-download-accept-proceed");
const modalPrivacy = document.getElementById("modal-privacy");
const linkPrivacy = document.getElementById("link-privacy");
const btnPrivacyClose = document.getElementById("btn-privacy-close");
const btnUserDeleteSelfData = document.getElementById("btn-user-delete-self-data");

// Set Default Expense Date
expenseDate.value = new Date().toISOString().split("T")[0];

// ============================================
// THEME & UI HELPERS
// ============================================
function initTheme() {
  const savedTheme = localStorage.getItem("spendwise_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  if(btnThemeToggle) btnThemeToggle.textContent = savedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

if(btnThemeToggle) {
  btnThemeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("spendwise_theme", next);
    btnThemeToggle.textContent = next === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  });
}
initTheme();

function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideAlert() { alertBox.style.display = "none"; }

function cleanUrlParams() {
  if (window.location.search.includes("code=") || window.location.hash.includes("access_token")) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

function switchView(viewName) {
  hideAlert();
  Object.keys(views).forEach(name => { if (views[name]) views[name].classList.remove("active-view"); });
  if (views[viewName]) views[viewName].classList.add("active-view");
  mainHeader.style.display = (viewName === "auth" || viewName === "onboarding") ? "none" : "block";
}

function renderRoleBadge(username, role) {
  const roleClass = role === 'app_admin' ? 'badge-admin' : role === 'moderator' ? 'badge-mod' : 'badge-user';
  const roleLabel = role === 'app_admin' ? 'Admin' : role === 'moderator' ? 'Mod' : 'User';
  return `@${username} <span class="badge ${roleClass}">${roleLabel}</span>`;
}

function askConfirmation(title, message, callback) {
  document.getElementById("modal-confirm-title").textContent = title;
  document.getElementById("modal-confirm-message").textContent = message;
  confirmActionCallback = callback;
  modalConfirm.style.display = "flex";
}

// Modals Logic
if(btnModalCancel) btnModalCancel.addEventListener("click", () => { modalConfirm.style.display = "none"; confirmActionCallback = null; });
if(btnModalConfirmAction) btnModalConfirmAction.addEventListener("click", async () => {
  modalConfirm.style.display = "none";
  if (confirmActionCallback) { const cb = confirmActionCallback; confirmActionCallback = null; await cb(); }
});

if(linkPrivacy) linkPrivacy.addEventListener("click", (e) => { e.preventDefault(); modalPrivacy.style.display = "flex"; });
if(btnPrivacyClose) btnPrivacyClose.addEventListener("click", () => { modalPrivacy.style.display = "none"; });
if(btnTriggerDownload) btnTriggerDownload.addEventListener("click", () => { modalDownloadRisk.style.display = "flex"; });
if(btnDownloadCancel) btnDownloadCancel.addEventListener("click", () => { modalDownloadRisk.style.display = "none"; });

if(btnDownloadAcceptProceed) btnDownloadAcceptProceed.addEventListener("click", async () => {
  modalDownloadRisk.style.display = "none";
  try {
    const { data, error } = await supabase.from("expenses").select("*").eq("user_id", currentUser.id);
    if (error) throw error;
    const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `spendwise_data_${currentProfile.username}.json`; a.click();
    URL.revokeObjectURL(url);
    showAlert("Data export downloaded successfully.", "success");
  } catch (err) { showAlert("Failed to export data: " + err.message); }
});

// ============================================
// NAVIGATION
// ============================================
btnNavDashboard.addEventListener("click", () => { switchView("dashboard"); loadExpenses(); });
btnNavFamily.addEventListener("click", () => { switchView("family"); loadFamilyView(); });
btnNavMod.addEventListener("click", () => { switchView("mod"); loadModPanel(); });
btnNavAdmin.addEventListener("click", () => { switchView("admin"); loadAdminPanel(); });
btnNavSettings.addEventListener("click", () => switchView("settings"));
btnSignOut.addEventListener("click", async () => { await supabase.auth.signOut(); });

// ============================================
// AUTHENTICATION
// ============================================
supabase.auth.onAuthStateChange(async (event, session) => {
  cleanUrlParams();
  if (!isAuthListenerReady) return;

  if (event === 'SIGNED_OUT') {
    currentUser = null; currentProfile = null; switchView("auth");
  } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
    currentUser = session.user; await handleUserSession();
  }
});

async function handleUserSession() {
  try {
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
    if (error) throw error;

    if (!profile || !profile.username) { switchView("onboarding"); return; }

    currentProfile = profile;
    navUserBadge.innerHTML = renderRoleBadge(profile.username, profile.role);

    // Toggle Mod/Admin Tabs
    btnNavMod.style.display = (profile.role === "moderator" || profile.role === "app_admin") ? "inline-flex" : "none";
    btnNavAdmin.style.display = (profile.role === "app_admin") ? "inline-flex" : "none";

    await loadUserFamilyGroups();
    switchView("dashboard");
    await loadExpenses();
  } catch (err) { showAlert(err.message || "Error establishing user session."); }
}

(async function initApp() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data?.session?.user) { currentUser = data.session.user; await handleUserSession(); }
    else { switchView("auth"); }
  } catch (err) { switchView("auth"); }
  finally { isAuthListenerReady = true; }
})();

authToggleLink.addEventListener("click", (e) => {
  e.preventDefault(); hideAlert(); isSignUpMode = !isSignUpMode;
  authTitle.textContent = isSignUpMode ? "Create an Account" : "Sign In to SpendWise";
  btnAuthSubmit.textContent = isSignUpMode ? "Sign Up" : "Sign In";
  authToggleText.textContent = isSignUpMode ? "Already have an account?" : "Don't have an account?";
  authToggleLink.textContent = isSignUpMode ? "Sign In" : "Sign Up";
  passwordHint.style.display = isSignUpMode ? "block" : "none";
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault(); hideAlert();
  const email = authEmail.value.trim(); const password = authPassword.value;
  if (isSignUpMode) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) showAlert(error.message); else showAlert("Account created! Logging in...", "success");
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showAlert(error.message);
  }
});

btnGithubLogin.addEventListener("click", async (e) => {
  e.preventDefault(); hideAlert();
  let redirectUrl = window.location.origin + window.location.pathname;
  redirectUrl = redirectUrl.replace(/\/index\.html?$/i, "").replace(/\/+$/, "");
  const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: redirectUrl || window.location.origin }});
  if (error) showAlert(error.message);
});

onboardingForm.addEventListener("submit", async (e) => {
  e.preventDefault(); hideAlert();
  const username = onboardingUsername.value.trim().toLowerCase();
  try {
    const { error } = await supabase.from("profiles").upsert({ id: currentUser.id, username, updated_at: new Date().toISOString() });
    if (error) throw error;
    await handleUserSession();
  } catch (err) { showAlert(err.message || "Failed to set handle."); }
});

// ============================================
// EXPENSES
// ============================================
async function loadExpenses() {
  expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading...</td></tr>';
  try {
    // No nested joins to prevent 400 errors
    let query = supabase.from("expenses").select("*").order("date", { ascending: false });
    if (expenseViewFilter.value === "personal") {
      query = query.eq("user_id", currentUser.id).is("family_id", null);
    }
    const { data: expenses, error } = await query;
    if (error) throw error;
    renderExpensesTable(expenses || []);
  } catch (err) { showAlert("Failed to load expenses: " + err.message); }
}
expenseViewFilter.addEventListener("change", loadExpenses);

function renderExpensesTable(expenses) {
  expensesTbody.innerHTML = "";
  let total = 0;
  if (expenses.length === 0) {
    expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No entries found.</td></tr>';
    totalSpendingEl.textContent = "$0.00"; return;
  }

  expenses.forEach(item => {
    const amountNum = parseFloat(item.amount) || 0;
    total += amountNum;
    
    // Find group name locally instead of querying
    let groupName = "Personal";
    if (item.family_id) {
      const grp = userFamilyGroups.find(g => g.family_id === item.family_id);
      if (grp) groupName = grp.name; else groupName = "Family";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.date}</td>
      <td>${item.title} ${item.is_flagged ? '<span style="color:var(--danger); font-size:0.75rem;">[FLAGGED]</span>' : ''}</td>
      <td>${item.category}</td>
      <td>${groupName}</td>
      <td style="font-weight:600;">$${amountNum.toFixed(2)}</td>
      <td>
        ${item.receipt_path ? `<span class="receipt-link" onclick="openReceipt('${item.receipt_path}')">📎 View</span> | ` : ''}
        <button class="btn btn-danger btn-sm" onclick="askDeleteExpense('${item.id}', '${item.receipt_path || ''}')">Delete</button>
      </td>
    `;
    expensesTbody.appendChild(tr);
  });
  totalSpendingEl.textContent = `$${total.toFixed(2)}`;
}

async function openReceipt(receiptPath) {
  try {
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(receiptPath, 60);
    if (error) throw error;
    if (data && data.signedUrl) window.open(data.signedUrl, "_blank");
  } catch (err) { showAlert("Failed to open receipt: " + err.message); }
}

window.askDeleteExpense = function(id, path) {
  askConfirmation("Delete Expense?", "Are you sure you want to delete this expense entry? This cannot be undone.", async () => {
    try {
      if (path) await supabase.storage.from("receipts").remove([path]);
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      showAlert("Expense deleted.", "success");
      await loadExpenses();
    } catch (err) { showAlert("Failed to delete: " + err.message); }
  });
};

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault(); hideAlert();
  const title = expenseTitle.value.trim();
  const amount = parseFloat(expenseAmount.value);
  const category = expenseCategory.value;
  const date = expenseDate.value;
  const family_id = expenseFamilySelect.value || null;
  const file = expenseReceipt.files[0];
  let receiptPath = null;

  try {
    if (file) {
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return showAlert("Invalid file type.");
      if (file.size > 5 * 1024 * 1024) return showAlert("File size exceeds 5 MB limit.");
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      receiptPath = `${currentUser.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(receiptPath, file);
      if (uploadError) throw uploadError;
    }

    const { error } = await supabase.from("expenses").insert({
      user_id: currentUser.id, family_id, title, amount, category, date, receipt_path: receiptPath
    });

    if (error) throw error;
    expenseForm.reset();
    expenseDate.value = new Date().toISOString().split("T")[0];
    showAlert("Expense saved!", "success");
    await loadExpenses();
  } catch (err) { showAlert(err.message || "Failed to save expense."); }
});

// ============================================
// FAMILY GROUPS
// ============================================
async function loadUserFamilyGroups() {
  try {
    const { data, error } = await supabase.from("family_members").select("family_id, role").eq("user_id", currentUser.id);
    if (error) throw error;

    userFamilyGroups = [];
    for (const m of (data || [])) {
      const { data: grp } = await supabase.from("family_groups").select("name").eq("id", m.family_id).single();
      if (grp) userFamilyGroups.push({ family_id: m.family_id, role: m.role, name: grp.name });
    }

    expenseFamilySelect.innerHTML = '<option value="">Personal Only (No Family Group)</option>';
    userFamilyGroups.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.family_id;
      opt.textContent = `${m.name} (${m.role})`;
      expenseFamilySelect.appendChild(opt);
    });
  } catch (err) { console.warn("Family groups warning:", err.message); }
}

async function loadFamilyView() {
  await loadUserFamilyGroups();
  renderFamilyGroupsList();
  if(familyInvitesList) familyInvitesList.innerHTML = "<p style='color:var(--text-muted);'>Add members directly inside your group below.</p>";
}

createFamilyForm.addEventListener("submit", async (e) => {
  e.preventDefault(); hideAlert();
  const name = familyNameInput.value.trim();
  if (!name) return;
  try {
    const { error } = await supabase.rpc("create_family_group", { group_name: name });
    if (error) throw error;
    familyNameInput.value = "";
    showAlert(`Family group "${name}" created!`, "success");
    await loadFamilyView();
  } catch (err) { showAlert(err.message || "Failed to create group."); }
});

function renderFamilyGroupsList() {
  familyGroupsContainer.innerHTML = "";
  if (userFamilyGroups.length === 0) {
    familyGroupsContainer.innerHTML = "<p style='color:var(--text-muted);'>No family groups joined yet.</p>";
    return;
  }

  userFamilyGroups.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.marginBottom = "12px";
    const isGroupAdmin = item.role === "group_admin";

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3>${item.name} <span class="badge badge-user">${item.role}</span></h3>
      </div>
      ${isGroupAdmin ? `
        <div style="margin-top:12px; display:flex; gap:8px;">
          <input type="text" placeholder="Add user by username" id="add-member-input-${item.family_id}" style="padding:6px; font-size:0.85rem;" />
          <button class="btn btn-sm" onclick="addMemberDirectly('${item.family_id}')">Add Member</button>
        </div>
      ` : ''}
      <div class="table-responsive" style="margin-top:12px;">
        <table>
          <thead><tr><th>Members</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody id="members-tbody-${item.family_id}">
            <tr><td colspan="3" style="text-align:center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    `;
    familyGroupsContainer.appendChild(div);
    loadGroupMembers(item.family_id);
  });
}

async function loadGroupMembers(familyId) {
  const tbody = document.getElementById(`members-tbody-${familyId}`);
  if (!tbody) return;
  const { data, error } = await supabase.from("family_members").select("*").eq("family_id", familyId);
  if (error) { tbody.innerHTML = `<tr><td colspan="3" style="color:red;">${error.message}</td></tr>`; return; }

  tbody.innerHTML = "";
  for (const m of data) {
    const { data: pData } = await supabase.from("profiles").select("username").eq("id", m.user_id).single();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>@${pData ? pData.username : "unknown"}</td><td>${m.role}</td><td>${new Date(m.created_at).toLocaleDateString()}</td>`;
    tbody.appendChild(tr);
  }
}

window.addMemberDirectly = async function(familyId) {
  const input = document.getElementById(`add-member-input-${familyId}`);
  const username = input.value.trim().toLowerCase();
  if (!username) return;
  try {
    const { error } = await supabase.rpc("add_family_member", { member_username: username });
    if (error) throw error;
    showAlert(`@${username} added!`, "success");
    input.value = "";
    await loadGroupMembers(familyId);
  } catch (err) { showAlert("Failed to add member: " + err.message); }
};

// ============================================
// MODERATOR PANEL
// ============================================
async function loadModPanel() {
  modTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
  try {
    const { data: expenses, error } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    modTbody.innerHTML = "";
    if(expenses.length === 0) { modTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No entries.</td></tr>'; return; }
    
    expenses.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.user_id.substring(0, 8)}...</td>
        <td>${item.title}</td>
        <td>$${parseFloat(item.amount).toFixed(2)}</td>
        <td>${item.is_flagged ? '<strong style="color:var(--danger)">Yes</strong>' : 'No'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="toggleFlagExpense('${item.id}', ${!item.is_flagged})">${item.is_flagged ? 'Unflag' : 'Flag'}</button>
          <button class="btn btn-danger btn-sm" onclick="confirmModDelete('${item.id}', '${item.receipt_path || ''}')">Remove</button>
        </td>
      `;
      modTbody.appendChild(tr);
    });
  } catch (err) { showAlert("Failed to load mod panel: " + err.message); }
}

window.toggleFlagExpense = async function(id, flagStatus) {
  try { await supabase.from("expenses").update({ is_flagged: flagStatus }).eq("id", id); await loadModPanel(); }
  catch (err) { showAlert(err.message); }
};

window.confirmModDelete = function(id, receiptPath) {
  askConfirmation("Remove Post?", "Moderator: Permanently delete this entry?", async () => {
    if (receiptPath) await supabase.storage.from("receipts").remove([receiptPath]);
    await supabase.from("expenses").delete().eq("id", id);
    await loadModPanel();
  });
};

// ============================================
// ADMIN PANEL
// ============================================
async function loadAdminPanel() {
  adminTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
  try {
    const { data: profiles, error } = await supabase.from("profiles").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    adminTbody.innerHTML = "";
    profiles.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.id.substring(0, 8)}...</td>
        <td>@${p.username}</td>
        <td><span class="badge ${p.role === 'app_admin' ? 'badge-admin' : p.role === 'moderator' ? 'badge-mod' : 'badge-user'}">${p.role}</span></td>
        <td>
          <select onchange="changeUserRole('${p.id}', this.value)" style="padding:4px; font-size:0.75rem; width:auto;">
            <option value="user" ${p.role === 'user' ? 'selected' : ''}>User</option>
            <option value="moderator" ${p.role === 'moderator' ? 'selected' : ''}>Moderator</option>
            <option value="app_admin" ${p.role === 'app_admin' ? 'selected' : ''}>App Admin</option>
          </select>
        </td>
        <td><button class="btn btn-danger btn-sm" onclick="confirmDeleteUserAccount('${p.id}', '${p.username}')">Delete User</button></td>
      `;
      adminTbody.appendChild(tr);
    });
  } catch (err) { showAlert("Failed to load admin panel: " + err.message); }
}

window.changeUserRole = function(userId, newRole) {
  askConfirmation("Change Role?", `Change role to "${newRole}"?`, async () => {
    try {
      // Note: Removed references to old "admins" and "moderators" tables since they aren't in your new schema.
      await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
      showAlert("Role updated successfully.", "success");
      await loadAdminPanel();
    } catch (err) { showAlert("Failed to update role: " + err.message); }
  });
};

window.confirmDeleteUserAccount = function(userId, username) {
  askConfirmation("DELETE USER?", `Permanently delete account @${username}?`, async () => {
    try {
      await supabase.from("profiles").delete().eq("id", userId);
      showAlert(`User @${username} deleted.`, "success");
      await loadAdminPanel();
    } catch (err) { showAlert("Failed to delete user: " + err.message); }
  });
};

// ============================================
// SETTINGS & ACCOUNT
// ============================================
btnUserDeleteSelfData.addEventListener("click", () => {
  askConfirmation("DELETE YOUR ACCOUNT?", "WARNING: Permanently delete your account and all data?", async () => {
    try {
      await supabase.from("profiles").delete().eq("id", currentUser.id);
      await supabase.auth.signOut();
      showAlert("Account deleted.", "success");
    } catch (err) { showAlert("Failed to delete account: " + err.message); }
  });
});

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault(); hideAlert();
  const newPassword = document.getElementById("new-password").value;
  
  // Validate password rules (from original app.js)
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return showAlert("Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) showAlert(error.message);
  else {
    showAlert("Password updated!", "success");
    document.getElementById("new-password").value = "";
  }
});