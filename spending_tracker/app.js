// ==========================================
// SPENDWISE CORE APPLICATION LOGIC
// ==========================================

// 1. Initialize Client
const db = window.supabase.createClient("https://ehrkwohnqbigerhjyfvc.supabase.co", "sb_publishable_xq0f7IVIh9JoA-WVN8bcUg_UwYaiNSt", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Global Application State Variables
let currentUser = null;
let currentProfile = null;
let userFamilyGroups = [];
let isSignUpMode = false;
let confirmActionCallback = null;
let isAuthListenerReady = false;

// DOM Elements
const alertBox = document.getElementById("alert-box");
const mainHeader = document.getElementById("main-header");
const navUserBadge = document.getElementById("nav-user-badge");
const btnThemeToggle = document.getElementById("btn-theme-toggle");

const views = {
  auth: document.getElementById("auth-view"),
  onboarding: document.getElementById("onboarding-view"),
  dashboard: document.getElementById("dashboard-view"),
  family: document.getElementById("family-view"),
  mod: document.getElementById("mod-view"),
  admin: document.getElementById("admin-view"),
  settings: document.getElementById("settings-view")
};

const btnNavDashboard = document.getElementById("btn-nav-dashboard");
const btnNavFamily = document.getElementById("btn-nav-family");
const btnNavMod = document.getElementById("btn-nav-mod");
const btnNavAdmin = document.getElementById("btn-nav-admin");
const btnNavSettings = document.getElementById("btn-nav-settings");
const btnSignOut = document.getElementById("btn-sign-out");

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

const createFamilyForm = document.getElementById("create-family-form");
const familyNameInput = document.getElementById("family-name-input");
const familyGroupsContainer = document.getElementById("family-groups-container");
const familyInvitesList = document.getElementById("family-invites-list");

const modTbody = document.getElementById("mod-tbody");
const adminTbody = document.getElementById("admin-tbody");
const passwordForm = document.getElementById("password-form");

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

// Set Default Expense Date to Today
expenseDate.value = new Date().toISOString().split("T")[0];

// Theme Switcher
function initTheme() {
  const savedTheme = localStorage.getItem("spendwise_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  btnThemeToggle.textContent = savedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

btnThemeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("spendwise_theme", next);
  btnThemeToggle.textContent = next === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
});

initTheme();

// Alert Handling
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

// Navigation View Routing
function switchView(viewName) {
  hideAlert();
  Object.keys(views).forEach(name => {
    if (views[name]) views[name].classList.remove("active-view");
  });
  if (views[viewName]) views[viewName].classList.add("active-view");
  mainHeader.style.display = (viewName === "auth" || viewName === "onboarding") ? "none" : "block";
}

// Modal Confirmation Helper
function askConfirmation(title, message, callback) {
  document.getElementById("modal-confirm-title").textContent = title;
  document.getElementById("modal-confirm-message").textContent = message;
  confirmActionCallback = callback;
  modalConfirm.style.display = "flex";
}

btnModalCancel.addEventListener("click", () => {
  modalConfirm.style.display = "none";
  confirmActionCallback = null;
});

btnModalConfirmAction.addEventListener("click", async () => {
  modalConfirm.style.display = "none";
  if (confirmActionCallback) {
    const cb = confirmActionCallback;
    confirmActionCallback = null;
    await cb();
  }
});

// Privacy & Download Modals
linkPrivacy.addEventListener("click", (e) => { e.preventDefault(); modalPrivacy.style.display = "flex"; });
btnPrivacyClose.addEventListener("click", () => { modalPrivacy.style.display = "none"; });

btnTriggerDownload.addEventListener("click", () => { modalDownloadRisk.style.display = "flex"; });
btnDownloadCancel.addEventListener("click", () => { modalDownloadRisk.style.display = "none"; });

btnDownloadAcceptProceed.addEventListener("click", async () => {
  modalDownloadRisk.style.display = "none";
  try {
    const { data, error } = await db.from("expenses").select("*").eq("user_id", currentUser.id);
    if (error) throw error;
    
    const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spendwise_data_${currentProfile.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert("Data export downloaded successfully.", "success");
  } catch (err) {
    showAlert("Failed to export data: " + err.message);
  }
});

// Role Badge Display Helper
function renderRoleBadge(username, role) {
  const roleClass = role === 'app_admin' ? 'badge-admin' : role === 'moderator' ? 'badge-mod' : 'badge-user';
  const roleLabel = role === 'app_admin' ? 'Admin' : role === 'moderator' ? 'Mod' : 'User';
  return `@${username} <span class="badge ${roleClass}">${roleLabel}</span>`;
}

// Navigation Listeners
btnNavDashboard.addEventListener("click", () => { switchView("dashboard"); loadExpenses(); });
btnNavFamily.addEventListener("click", () => { switchView("family"); loadFamilyView(); });
btnNavMod.addEventListener("click", () => { switchView("mod"); loadModPanel(); });
btnNavAdmin.addEventListener("click", () => { switchView("admin"); loadAdminPanel(); });
btnNavSettings.addEventListener("click", () => switchView("settings"));
btnSignOut.addEventListener("click", async () => { await db.auth.signOut(); });

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================

async function handleUserSession() {
  try {
    const { data: profile, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) throw error;

    if (!profile || !profile.username) {
      switchView("onboarding");
      return;
    }

    currentProfile = profile;
    navUserBadge.innerHTML = renderRoleBadge(profile.username, profile.role);

    btnNavMod.style.display = (profile.role === "moderator" || profile.role === "app_admin") ? "inline-flex" : "none";
    btnNavAdmin.style.display = (profile.role === "app_admin") ? "inline-flex" : "none";

    await loadUserFamilyGroups();
    switchView("dashboard");
    await loadExpenses();
  } catch (err) {
    showAlert(err.message || "Error establishing user session.");
  }
}

db.auth.onAuthStateChange(async (event, session) => {
  cleanUrlParams();
  
  if (!isAuthListenerReady) return;

  if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentProfile = null;
    switchView("auth");
  } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
    currentUser = session.user;
    await handleUserSession();
  }
});

// Manual Boot Check
(async function initApp() {
  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    if (data?.session?.user) {
      currentUser = data.session.user;
      await handleUserSession();
    } else {
      switchView("auth");
    }
  } catch (err) {
    console.error("Session boot error:", err);
    switchView("auth");
  } finally {
    isAuthListenerReady = true;
  }
})();

// Toggle Sign In / Sign Up Mode
authToggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  hideAlert();
  isSignUpMode = !isSignUpMode;
  authTitle.textContent = isSignUpMode ? "Create an Account" : "Sign In to SpendWise";
  btnAuthSubmit.textContent = isSignUpMode ? "Sign Up" : "Sign In";
  authToggleText.textContent = isSignUpMode ? "Already have an account?" : "Don't have an account?";
  authToggleLink.textContent = isSignUpMode ? "Sign In" : "Sign Up";
  passwordHint.style.display = isSignUpMode ? "block" : "none";
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (isSignUpMode) {
    const { error } = await db.auth.signUp({ email, password });
    if (error) showAlert(error.message);
    else showAlert("Account created! Logging in...", "success");
  } else {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) showAlert(error.message);
  }
});

// GitHub OAuth Sign In
btnGithubLogin.addEventListener("click", async (e) => {
  e.preventDefault();
  hideAlert();
  try {
    let redirectUrl = window.location.origin + window.location.pathname;
    redirectUrl = redirectUrl.replace(/\/index\.html?$/i, "").replace(/\/+$/, "");
    
    const { error } = await db.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: redirectUrl || window.location.origin }
    });
    if (error) throw error;
  } catch (err) {
    showAlert(err.message || "Failed to initiate GitHub sign-in.");
  }
});

onboardingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const username = onboardingUsername.value.trim().toLowerCase();

  try {
    const { error } = await db.from("profiles").upsert({
      id: currentUser.id,
      username: username,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    await handleUserSession();
  } catch (err) {
    showAlert(err.message || "Failed to set handle.");
  }
});

// ==========================================
// EXPENSES LOGIC
// ==========================================

async function loadExpenses() {
  expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading transactions...</td></tr>';
  try {
    let query = db.from("expenses").select("*, family_groups(name)").order("date", { ascending: false });
    if (expenseViewFilter.value === "personal") {
      query = query.eq("user_id", currentUser.id).is("family_id", null);
    }

    const { data: expenses, error } = await query;
    if (error) throw error;

    renderExpensesTable(expenses || []);
  } catch (err) {
    showAlert("Failed to load expenses: " + err.message);
  }
}

expenseViewFilter.addEventListener("change", loadExpenses);

function renderExpensesTable(expenses) {
  expensesTbody.innerHTML = "";
  let total = 0;

  if (expenses.length === 0) {
    expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No entries found.</td></tr>';
    totalSpendingEl.textContent = "$0.00";
    return;
  }

  expenses.forEach(item => {
    const amountNum = parseFloat(item.amount) || 0;
    total += amountNum;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.date}</td>
      <td>${item.title} ${item.is_flagged ? '<span style="color:var(--danger); font-size:0.75rem;">[FLAGGED]</span>' : ''}</td>
      <td>${item.category}</td>
      <td>${item.family_groups ? item.family_groups.name : 'Personal'}</td>
      <td style="font-weight:600;">$${amountNum.toFixed(2)}</td>
      <td>
        <button class="btn btn-danger btn-sm">Delete</button>
      </td>
    `;

    tr.querySelector(".btn-danger").addEventListener("click", () => {
      askConfirmation("Delete Expense Entry?", "Are you sure you want to delete this expense post entry? This action cannot be undone.", async () => {
        await deleteExpense(item.id, item.receipt_path);
      });
    });

    expensesTbody.appendChild(tr);
  });

  totalSpendingEl.textContent = `$${total.toFixed(2)}`;
}

async function deleteExpense(expenseId, receiptPath) {
  try {
    if (receiptPath) {
      await db.storage.from("receipts").remove([receiptPath]);
    }
    const { error } = await db.from("expenses").delete().eq("id", expenseId);
    if (error) throw error;

    showAlert("Expense post deleted successfully.", "success");
    await loadExpenses();
  } catch (err) {
    showAlert("Failed to delete entry: " + err.message);
  }
}

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const title = expenseTitle.value.trim();
  const amount = parseFloat(expenseAmount.value);
  const category = expenseCategory.value;
  const date = expenseDate.value;
  const family_id = expenseFamilySelect.value || null;

  try {
    const { error } = await db.from("expenses").insert({
      user_id: currentUser.id,
      family_id,
      title,
      amount,
      category,
      date
    });

    if (error) throw error;
    expenseForm.reset();
    expenseDate.value = new Date().toISOString().split("T")[0];
    showAlert("Expense saved!", "success");
    await loadExpenses();
  } catch (err) {
    showAlert(err.message || "Failed to save expense.");
  }
});

// ==========================================
// FAMILY GROUPS LOGIC (WITH FOREIGN KEY FIX)
// ==========================================

async function loadUserFamilyGroups() {
  try {
    const { data, error } = await db
      .from("family_members")
      .select("family_id, role, family_groups(id, name, created_by)")
      .eq("user_id", currentUser.id);

    if (error) throw error;

    userFamilyGroups = data || [];
    expenseFamilySelect.innerHTML = '<option value="">Personal Only (No Family Group)</option>';
    userFamilyGroups.forEach(m => {
      if (m.family_groups) {
        const opt = document.createElement("option");
        opt.value = m.family_groups.id;
        opt.textContent = `${m.family_groups.name} (${m.role})`;
        expenseFamilySelect.appendChild(opt);
      }
    });
  } catch (err) {
    console.warn("Family groups warning:", err.message);
  }
}

async function loadFamilyView() {
  await loadUserFamilyGroups();
  renderFamilyGroupsList();
  await loadPendingInvites();
}

createFamilyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const name = familyNameInput.value.trim();

  try {
    // 1. Insert the group and explicitly ask for the ID back
    const { data: group, error: groupErr } = await db
      .from("family_groups")
      .insert({ name, created_by: currentUser.id })
      .select("id") 
      .single();

    if (groupErr) throw groupErr;
    if (!group) throw new Error("Failed to retrieve the new group ID.");

    // 2. Insert the user as group_admin using the verified ID
    const { error: memErr } = await db
      .from("family_members")
      .insert({ 
        family_id: group.id, 
        user_id: currentUser.id, 
        role: "group_admin" 
      });

    if (memErr) throw memErr;

    familyNameInput.value = "";
    showAlert(`Family group "${name}" created! You are the Group Admin.`, "success");
    await loadFamilyView();
  } catch (err) {
    showAlert(err.message || "Failed to create group.");
  }
});

function renderFamilyGroupsList() {
  familyGroupsContainer.innerHTML = "";
  if (userFamilyGroups.length === 0) {
    familyGroupsContainer.innerHTML = "<p style='color:var(--text-muted);'>No family groups joined yet.</p>";
    return;
  }

  userFamilyGroups.forEach(item => {
    const grp = item.family_groups;
    if (!grp) return;

    const div = document.createElement("div");
    div.className = "card";
    div.style.marginBottom = "12px";
    const isGroupAdmin = item.role === "group_admin";

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>${grp.name} <span class="badge badge-user">${item.role}</span></h3>
      </div>
      ${isGroupAdmin ? `
        <div style="margin-top:12px; display:flex; gap:8px;">
          <input type="text" placeholder="Invite username" id="invite-input-${grp.id}" style="padding:6px; font-size:0.85rem;" />
          <button class="btn btn-sm" onclick="sendInvite('${grp.id}')">Invite User</button>
        </div>
      ` : ''}
    `;
    familyGroupsContainer.appendChild(div);
  });
}

window.sendInvite = async function(familyId) {
  const input = document.getElementById(`invite-input-${familyId}`);
  const username = input.value.trim().toLowerCase();
  if (!username) return;

  try {
    const { error } = await db.from("family_invites").insert({
      family_id: familyId,
      invited_username: username,
      invited_by: currentUser.id
    });
    if (error) throw error;
    showAlert(`Invite sent to @${username}`, "success");
    input.value = "";
  } catch (err) {
    showAlert("Failed to send invite: " + err.message);
  }
};

async function loadPendingInvites() {
  familyInvitesList.innerHTML = "Checking invites...";
  try {
    const { data: invites, error } = await db
      .from("family_invites")
      .select("*, family_groups(name)")
      .eq("invited_username", currentProfile.username)
      .eq("status", "pending");

    if (error) throw error;

    if (!invites || invites.length === 0) {
      familyInvitesList.innerHTML = "<p style='color:var(--text-muted);'>No pending invites.</p>";
      return;
    }

    familyInvitesList.innerHTML = "";
    invites.forEach(inv => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.justifyContent = "space-between";
      div.style.alignItems = "center";
      div.style.padding = "8px 0";
      div.style.borderBottom = "1px solid var(--border)";
      div.innerHTML = `
        <span>Invited to <strong>${inv.family_groups.name}</strong></span>
        <div>
          <button class="btn btn-sm" onclick="respondInvite('${inv.id}', '${inv.family_id}', 'accepted')">Accept</button>
          <button class="btn btn-secondary btn-sm" onclick="respondInvite('${inv.id}', '${inv.family_id}', 'rejected')">Decline</button>
        </div>
      `;
      familyInvitesList.appendChild(div);
    });
  } catch (err) {
    familyInvitesList.innerHTML = "Failed to load invites.";
  }
}

window.respondInvite = async function(inviteId, familyId, responseStatus) {
  try {
    await db.from("family_invites").update({ status: responseStatus }).eq("id", inviteId);

    if (responseStatus === "accepted") {
      await db.from("family_members").insert({ family_id: familyId, user_id: currentUser.id, role: "member" });
    }

    showAlert(`Invite ${responseStatus}!`, "success");
    await loadFamilyView();
  } catch (err) {
    showAlert("Error responding to invite: " + err.message);
  }
};

// ==========================================
// MODERATOR & ADMIN PANELS
// ==========================================

async function loadModPanel() {
  modTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading moderation queue...</td></tr>';
  try {
    const { data: expenses, error } = await db.from("expenses").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    renderModTable(expenses || []);
  } catch (err) {
    showAlert("Failed to load moderator panel: " + err.message);
  }
}

function renderModTable(expenses) {
  modTbody.innerHTML = "";
  if (expenses.length === 0) {
    modTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No entries.</td></tr>';
    return;
  }

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
}

window.toggleFlagExpense = async function(id, flagStatus) {
  try {
    await db.from("expenses").update({ is_flagged: flagStatus }).eq("id", id);
    await loadModPanel();
  } catch (err) {
    showAlert(err.message);
  }
};

window.confirmModDelete = function(id, receiptPath) {
  askConfirmation("Remove Post?", "Moderator: Are you sure you want to permanently delete this expense entry?", async () => {
    await deleteExpense(id, receiptPath);
    await loadModPanel();
  });
};

async function loadAdminPanel() {
  adminTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading directory...</td></tr>';
  try {
    const { data: profiles, error } = await db.from("profiles").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    renderAdminTable(profiles || []);
  } catch (err) {
    showAlert("Failed to load admin panel: " + err.message);
  }
}

function renderAdminTable(profiles) {
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
      <td>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteUserAccount('${p.id}', '${p.username}')">Delete User</button>
      </td>
    `;
    adminTbody.appendChild(tr);
  });
}

window.changeUserRole = function(userId, newRole) {
  askConfirmation("Change Role?", `Change the role of user to "${newRole}"?`, async () => {
    try {
      await db.from("profiles").update({ role: newRole }).eq("id", userId);
      
      if (newRole === 'app_admin') {
        await db.from("admins").upsert({ user_id: userId });
        await db.from("moderators").delete().eq("user_id", userId);
      } else if (newRole === 'moderator') {
        await db.from("moderators").upsert({ user_id: userId });
        await db.from("admins").delete().eq("user_id", userId);
      } else {
        await db.from("admins").delete().eq("user_id", userId);
        await db.from("moderators").delete().eq("user_id", userId);
      }

      showAlert("Role updated successfully.", "success");
      await loadAdminPanel();
    } catch (err) {
      showAlert("Failed to update role: " + err.message);
    }
  });
};

window.confirmDeleteUserAccount = function(userId, username) {
  askConfirmation("DELETE USER ACCOUNT?", `PERMANENTLY delete account @${username}? All expenses and profile data will be removed!`, async () => {
    try {
      await db.from("profiles").delete().eq("id", userId);
      showAlert(`User @${username} was deleted.`, "success");
      await loadAdminPanel();
    } catch (err) {
      showAlert("Failed to delete user: " + err.message);
    }
  });
};

// User Self Account Deletion Warning
btnUserDeleteSelfData.addEventListener("click", () => {
  askConfirmation("DELETE YOUR ACCOUNT?", "WARNING: Are you sure you want to permanently delete your SpendWise account and all personal data? This action cannot be reversed.", async () => {
    try {
      await db.from("profiles").delete().eq("id", currentUser.id);
      await db.auth.signOut();
      showAlert("Account deleted successfully.", "success");
    } catch (err) {
      showAlert("Failed to delete account: " + err.message);
    }
  });
});

// Password Update Logic
passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const newPassword = document.getElementById("new-password").value;

  const { error } = await db.auth.updateUser({ password: newPassword });
  if (error) showAlert(error.message);
  else {
    showAlert("Password updated successfully!", "success");
    document.getElementById("new-password").value = "";
  }
});