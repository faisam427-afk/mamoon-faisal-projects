// app.js

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Application State Variables
let currentUser = null;
let currentProfile = null;
let isSignUpMode = false;

// DOM Element References
const alertBox = document.getElementById("alert-box");
const mainHeader = document.getElementById("main-header");
const displayUsername = document.getElementById("display-username");

// Views
const views = {
  auth: document.getElementById("auth-view"),
  onboarding: document.getElementById("onboarding-view"),
  dashboard: document.getElementById("dashboard-view"),
  family: document.getElementById("family-view"),
  password: document.getElementById("password-view")
};

// Forms & Inputs
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
const expensesTbody = document.getElementById("expenses-tbody");
const totalSpendingEl = document.getElementById("total-spending");

// Family share toggle in expense form
const shareFamilyWrap = document.getElementById("share-family-wrap");
const expenseShareFamily = document.getElementById("expense-share-family");

const passwordForm = document.getElementById("password-form");
const newPasswordInput = document.getElementById("new-password");

// Navigation Buttons
const btnNavFamily = document.getElementById("btn-nav-family");
const btnNavPassword = document.getElementById("btn-nav-password");
const btnSignOut = document.getElementById("btn-sign-out");
const btnCancelPassword = document.getElementById("btn-cancel-password");

// Family View Elements
const familyCreateWrap = document.getElementById("family-create-wrap");
const familyInfoWrap = document.getElementById("family-info-wrap");
const familyCreateForm = document.getElementById("family-create-form");
const familyNameInput = document.getElementById("family-name");
const familyGroupName = document.getElementById("family-group-name");
const familyGroupId = document.getElementById("family-group-id");
const familyMembersTbody = document.getElementById("family-members-tbody");
const familyExpensesTbody = document.getElementById("family-expenses-tbody");
const familyAddMemberForm = document.getElementById("family-add-member-form");
const familyAddUsername = document.getElementById("family-add-username");

// Current family state
let currentFamily = null;

// Set default expense date input to today
expenseDate.value = new Date().toISOString().split("T")[0];

// Helper: Alert Display
function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideAlert() {
  alertBox.style.display = "none";
}

// Helper: Switch View Containers
function switchView(viewName) {
  hideAlert();
  Object.keys(views).forEach(name => {
    views[name].classList.remove("active-view");
  });
  
  if (views[viewName]) {
    views[viewName].classList.add("active-view");
  }

  if (viewName === "dashboard" || viewName === "password" || viewName === "family") {
    mainHeader.style.display = "block";
  } else {
    mainHeader.style.display = "none";
  }
}

// Password Validation Rule Checker
function validatePasswordRules(password) {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!minLength) return "Password must be at least 8 characters long.";
  if (!hasUpper) return "Password must contain at least one uppercase letter.";
  if (!hasLower) return "Password must contain at least one lowercase letter.";
  if (!hasNumber) return "Password must contain at least one number.";
  return null;
}

// AUTHENTICATION EVENT LISTENERS & STATE HANDLING
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    await handleUserSession();
  } else {
    currentUser = null;
    currentProfile = null;
    switchView("auth");
  }
});

async function handleUserSession() {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) throw error;

    if (!profile || !profile.username) {
      switchView("onboarding");
    } else {
      currentProfile = profile;
      displayUsername.textContent = `@${profile.username}`;
      switchView("dashboard");
      await loadExpenses();
      await refreshShareFamilyVisibility();
    }
  } catch (err) {
    showAlert(err.message || "Error loading profile session.");
  }
}

// Toggle Sign In / Sign Up Modes
authToggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  hideAlert();
  isSignUpMode = !isSignUpMode;
  
  if (isSignUpMode) {
    authTitle.textContent = "Create an Account";
    btnAuthSubmit.textContent = "Sign Up";
    authToggleText.textContent = "Already have an account?";
    authToggleLink.textContent = "Sign In";
    passwordHint.style.display = "block";
  } else {
    authTitle.textContent = "Sign In to SpendWise";
    btnAuthSubmit.textContent = "Sign In";
    authToggleText.textContent = "Don't have an account?";
    authToggleLink.textContent = "Sign Up";
    passwordHint.style.display = "none";
  }
});

// Submit Email/Password Form
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (isSignUpMode) {
    const pwdError = validatePasswordRules(password);
    if (pwdError) {
      showAlert(pwdError);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      showAlert(error.message);
    } else {
      showAlert("Sign up successful! Logging in...", "success");
    }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showAlert(error.message);
    }
  }
});

// GitHub OAuth Sign In
btnGithubLogin.addEventListener("click", async () => {
  hideAlert();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    showAlert(error.message);
  }
});

// Save Username (Onboarding)
onboardingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const username = onboardingUsername.value.trim().toLowerCase();

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing && existing.id !== currentUser.id) {
      showAlert("Username is already taken. Please choose another.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: currentUser.id,
        username: username,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    await handleUserSession();
  } catch (err) {
    showAlert(err.message || "Failed to save username.");
  }
});

// Navigation Handlers
btnSignOut.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

btnNavPassword.addEventListener("click", () => {
  switchView("password");
});

btnCancelPassword.addEventListener("click", () => {
  switchView("dashboard");
});

// Change Password Handler
passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const newPassword = newPasswordInput.value;
  const pwdError = validatePasswordRules(newPassword);

  if (pwdError) {
    showAlert(pwdError);
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    showAlert(error.message);
  } else {
    showAlert("Password updated successfully!", "success");
    newPasswordInput.value = "";
    setTimeout(() => {
      switchView("dashboard");
    }, 1500);
  }
});

// EXPENSES CRUD & STORAGE LOGIC

// Load User Expenses
async function loadExpenses() {
  expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading transactions...</td></tr>';

  try {
    const { data: expenses, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    renderExpensesTable(expenses || []);
  } catch (err) {
    showAlert("Failed to load expenses: " + err.message);
  }
}

// Render Expenses Table & Calculate Total
function renderExpensesTable(expenses) {
  expensesTbody.innerHTML = "";
  let total = 0;

  if (expenses.length === 0) {
    expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No expenses logged yet.</td></tr>';
    totalSpendingEl.textContent = "$0.00";
    return;
  }

  expenses.forEach(item => {
    const amountNum = parseFloat(item.amount) || 0;
    total += amountNum;

    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = item.date;

    const tdTitle = document.createElement("td");
    tdTitle.textContent = item.title;

    const tdCategory = document.createElement("td");
    tdCategory.textContent = item.category;

    const tdAmount = document.createElement("td");
    tdAmount.style.fontWeight = "600";
    tdAmount.textContent = `$${amountNum.toFixed(2)}`;

    const tdReceipt = document.createElement("td");
    if (item.receipt_path) {
      const receiptBtn = document.createElement("span");
      receiptBtn.className = "receipt-link";
      receiptBtn.textContent = "📎 View";
      receiptBtn.addEventListener("click", () => openReceipt(item.receipt_path));
      tdReceipt.appendChild(receiptBtn);
    } else {
      tdReceipt.textContent = "—";
    }

    const tdAction = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.style.padding = "4px 8px";
    deleteBtn.style.fontSize = "0.75rem";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteExpense(item.id, item.receipt_path));
    tdAction.appendChild(deleteBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdTitle);
    tr.appendChild(tdCategory);
    tr.appendChild(tdAmount);
    tr.appendChild(tdReceipt);
    tr.appendChild(tdAction);

    expensesTbody.appendChild(tr);
  });

  totalSpendingEl.textContent = `$${total.toFixed(2)}`;
}

// Open Private Storage Receipt URL
async function openReceipt(receiptPath) {
  try {
    const { data, error } = await supabase
      .storage
      .from("receipts")
      .createSignedUrl(receiptPath, 60);

    if (error) throw error;

    if (data && data.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  } catch (err) {
    showAlert("Failed to open receipt file: " + err.message);
  }
}

// Save New Expense (with file bucket upload)
expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const title = expenseTitle.value.trim();
  const amount = parseFloat(expenseAmount.value);
  const category = expenseCategory.value;
  const date = expenseDate.value;
  const file = expenseReceipt.files[0];

  let receiptPath = null;

  try {
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        showAlert("Invalid file type. Only JPG, PNG, and PDF allowed.");
        return;
      }

      if (file.size > maxSize) {
        showAlert("File size exceeds 5 MB limit.");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      receiptPath = `${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase
        .storage
        .from("receipts")
        .upload(receiptPath, file);

      if (uploadError) throw uploadError;
    }

    let familyId = null;
    if (expenseShareFamily.checked && currentFamily) {
      familyId = currentFamily.id;
    }

    const { error: insertError } = await supabase
      .from("expenses")
      .insert({
        user_id: currentUser.id,
        title,
        amount,
        category,
        date,
        receipt_path: receiptPath,
        family_id: familyId
      });

    if (insertError) throw insertError;

    expenseForm.reset();
    expenseDate.value = new Date().toISOString().split("T")[0];
    expenseShareFamily.checked = false;
    showAlert("Expense logged successfully!", "success");

    await loadExpenses();
  } catch (err) {
    showAlert("Failed to save expense: " + err.message);
  }
});

// Delete Expense & Remove File from Bucket
async function deleteExpense(expenseId, receiptPath) {
  if (!confirm("Are you sure you want to delete this expense entry?")) return;

  hideAlert();

  try {
    if (receiptPath) {
      const { error: storageErr } = await supabase
        .storage
        .from("receipts")
        .remove([receiptPath]);

      if (storageErr) {
        console.warn("Storage removal warning:", storageErr.message);
      }
    }

    const { error: dbErr } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (dbErr) throw dbErr;

    showAlert("Expense entry deleted.", "success");
    await loadExpenses();
  } catch (err) {
    showAlert("Failed to delete entry: " + err.message);
  }
}

// ============================================
// FAMILY GROUPS
// ============================================

async function refreshShareFamilyVisibility() {
  if (!currentUser) return;
  
  // We can just use the currentFamily state we load on startup
  if (currentFamily) {
    shareFamilyWrap.style.display = "block";
  } else {
    shareFamilyWrap.style.display = "none";
    expenseShareFamily.checked = false;
  }
}

btnNavFamily.addEventListener("click", async () => {
  switchView("family");
  await loadFamilyState();
});

// Create a new family group (Uses RPC to automatically handle ID & admin role)
familyCreateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const name = familyNameInput.value.trim();
  if (name.length < 2) {
    showAlert("Group name must be at least 2 characters.");
    return;
  }

  try {
    const { error } = await supabase.rpc("create_family_group", {
      group_name: name
    });

    if (error) throw error;

    showAlert("Family group created!", "success");
    familyNameInput.value = "";
    await loadFamilyState();
    await refreshShareFamilyVisibility();
  } catch (err) {
    showAlert("Failed to create group: " + err.message);
  }
});

// Add member by username (Uses RPC so DB handles the secure insert)
familyAddMemberForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const username = familyAddUsername.value.trim().toLowerCase();
  if (!username) return;

  try {
    const { error } = await supabase.rpc("add_family_member", {
      member_username: username
    });

    if (error) throw error;

    showAlert(`@${username} added to family!`, "success");
    familyAddUsername.value = "";
    await loadFamilyState();
  } catch (err) {
    showAlert("Failed to add member: " + err.message);
  }
});

// Load family state (Removed the nested join that was causing the 400 error)
async function loadFamilyState() {
  if (!currentUser) return;

  familyMembersTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Loading...</td></tr>';

  try {
    // 1. Get membership
    const { data: memberships, error: memErr } = await supabase
      .from("family_members")
      .select("family_id, role, created_at")
      .eq("user_id", currentUser.id)
      .limit(1);

    if (memErr) throw memErr;

    if (!memberships || memberships.length === 0) {
      currentFamily = null;
      familyCreateWrap.style.display = "block";
      familyInfoWrap.style.display = "none";
      return;
    }

    const membership = memberships[0];
    
    // 2. Fetch group name separately (avoids schema cache join errors)
    const { data: groupData } = await supabase
      .from("family_groups")
      .select("name")
      .eq("id", membership.family_id)
      .single();

    currentFamily = {
      id: membership.family_id,
      name: groupData ? groupData.name : "Family Group",
      role: membership.role
    };

    familyCreateWrap.style.display = "none";
    familyInfoWrap.style.display = "block";
    familyGroupName.textContent = currentFamily.name;
    familyGroupId.textContent = currentFamily.id;

    // 3. Load all members
    const { data: members, error: mErr } = await supabase
      .from("family_members")
      .select("*")
      .eq("family_id", currentFamily.id);

    if (mErr) throw mErr;

    familyMembersTbody.innerHTML = "";
    for (const m of (members || [])) {
      // Fetch username separately to avoid join errors
      const { data: pData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", m.user_id)
        .single();

      const username = pData ? pData.username : "unknown";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>@${username}</td>
        <td>${m.role}</td>
        <td>${new Date(m.created_at).toLocaleDateString()}</td>
      `;
      familyMembersTbody.appendChild(tr);
    }

    await loadFamilyExpenses();
  } catch (err) {
    showAlert("Failed to load family state: " + err.message);
  }
}

// Load shared family expenses
async function loadFamilyExpenses() {
  if (!currentFamily) return;

  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("family_id", currentFamily.id)
      .order("date", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      familyExpensesTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No shared expenses yet.</td></tr>';
      return;
    }

    familyExpensesTbody.innerHTML = "";
    for (const item of data) {
      // Fetch username separately to avoid join errors
      const { data: pData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", item.user_id)
        .single();

      const username = pData ? pData.username : "unknown";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date}</td>
        <td>${item.title}</td>
        <td>${item.category}</td>
        <td>$${parseFloat(item.amount).toFixed(2)}</td>
        <td>@${username}</td>
      `;
      familyExpensesTbody.appendChild(tr);
    }
  } catch (err) {
    familyExpensesTbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger);">${err.message}</td></tr>`;
  }
}