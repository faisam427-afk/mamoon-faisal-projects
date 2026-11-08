// ==========================================
// SPENDWISE CORE APPLICATION LOGIC
// ==========================================

// Initialize the Supabase Client
const db = window.supabase.createClient("https://ehrkwohnqbigerhjyfvc.supabase.co", "sb_publishable_xq0f7IVIh9JoA-WVN8bcUg_UwYaiNSt", {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});

// Global Application State Variables
let currentUser = null;
let currentProfile = null;
let isSignUpMode = false;
let isBootstrapping = true; // FIX: Track initial load to prevent race condition

// Alert Box & Common Header Elements
const alertBox = document.getElementById("alert-box");
const mainHeader = document.getElementById("main-header");
const displayUsername = document.getElementById("display-username");

// View Container Elements
const views = {
  auth: document.getElementById("auth-view"),
  onboarding: document.getElementById("onboarding-view"),
  dashboard: document.getElementById("dashboard-view"),
  password: document.getElementById("password-view")
};

// Auth Form Elements
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const passwordHint = document.getElementById("password-hint");
const btnAuthSubmit = document.getElementById("btn-auth-submit");
const authToggleLink = document.getElementById("auth-toggle-link");
const authToggleText = document.getElementById("auth-toggle-text");
const btnGithubLogin = document.getElementById("btn-github-login");

// Onboarding Elements
const onboardingForm = document.getElementById("onboarding-form");
const onboardingUsername = document.getElementById("onboarding-username");

// Expense Form & Table Elements
const expenseForm = document.getElementById("expense-form");
const expenseTitle = document.getElementById("expense-title");
const expenseAmount = document.getElementById("expense-amount");
const expenseCategory = document.getElementById("expense-category");
const expenseDate = document.getElementById("expense-date");
const expenseReceipt = document.getElementById("expense-receipt");
const expensesTbody = document.getElementById("expenses-tbody");
const totalSpendingEl = document.getElementById("total-spending");

// Password Settings & Navigation Controls
const passwordForm = document.getElementById("password-form");
const newPasswordInput = document.getElementById("new-password");
const btnNavPassword = document.getElementById("btn-nav-password");
const btnSignOut = document.getElementById("btn-sign-out");
const btnCancelPassword = document.getElementById("btn-cancel-password");

// Set default expense date picker to today's date
if (expenseDate) {
  expenseDate.value = new Date().toISOString().split("T")[0];
}

// Display feedback notifications to the user
function showAlert(message, type = "error") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Hide alert notification box
function hideAlert() {
  if (alertBox) alertBox.style.display = "none";
}

// Switch visible UI view cards smoothly
function switchView(viewName) {
  hideAlert();
  Object.keys(views).forEach(name => {
    if (views[name]) views[name].classList.remove("active-view");
  });

  if (views[viewName]) {
    views[viewName].classList.add("active-view");
  }

  if (mainHeader) {
    if (viewName === "dashboard" || viewName === "password") {
      mainHeader.style.display = "block";
    } else {
      mainHeader.style.display = "none";
    }
  }
}

// Enforce strong password validation rules
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

// FIX: Clean OAuth URL params after redirect
function cleanUrlParams() {
  if (window.location.search.includes("code=") || window.location.hash.includes("access_token")) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

// Verify user profile and direct to onboarding or dashboard
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
    } else {
      currentProfile = profile;
      if (displayUsername) displayUsername.textContent = `@${profile.username}`;
      switchView("dashboard");
      await loadExpenses();
    }
  } catch (err) {
    showAlert(err.message || "Error restoring user profile session.");
  }
}

// Listen to authentication state changes
db.auth.onAuthStateChange(async (event, session) => {
  cleanUrlParams();
  
  // FIX: Ignore the initial session event. bootstrapSession() handles it.
  if (event === 'INITIAL_SESSION') return;
  
  // FIX: If we are still bootstrapping, ignore SIGNED_OUT events 
  // because they can be a false positive before the session loads.
  if (isBootstrapping && event === 'SIGNED_OUT') return;

  if (session && session.user) {
    currentUser = session.user;
    await handleUserSession();
  } else {
    currentUser = null;
    currentProfile = null;
    switchView("auth");
  }
});

// FIX: Manually check for a saved session when the page first loads
(async function bootstrapSession() {
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
    console.error("Session restore failed:", err);
    switchView("auth");
  } finally {
    // FIX: Mark bootstrapping as complete so future SIGNED_OUT events work
    isBootstrapping = false;
  }
})();

// Toggle between Sign In and Sign Up modes
if (authToggleLink) {
  authToggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    hideAlert();
    isSignUpMode = !isSignUpMode;

    if (isSignUpMode) {
      if (authTitle) authTitle.textContent = "Create an Account";
      if (btnAuthSubmit) btnAuthSubmit.textContent = "Sign Up";
      if (authToggleText) authToggleText.textContent = "Already have an account?";
      authToggleLink.textContent = "Sign In";
      if (passwordHint) passwordHint.style.display = "block";
    } else {
      if (authTitle) authTitle.textContent = "Sign In to SpendWise";
      if (btnAuthSubmit) btnAuthSubmit.textContent = "Sign In";
      if (authToggleText) authToggleText.textContent = "Don't have an account?";
      authToggleLink.textContent = "Sign Up";
      if (passwordHint) passwordHint.style.display = "none";
    }
  });
}

// Submit Authentication (Sign In or Sign Up)
if (authForm) {
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

      const { data, error } = await db.auth.signUp({ email, password });
      if (error) {
        showAlert(error.message);
      } else {
        showAlert("Sign up successful! Logging in...", "success");
      }
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) {
        showAlert(error.message);
      }
    }
  });
}

// Trigger GitHub OAuth Redirect
if (btnGithubLogin) {
  btnGithubLogin.addEventListener("click", async () => {
    hideAlert();
    
    let redirectUrl = window.location.origin + window.location.pathname;
    redirectUrl = redirectUrl.replace(/\/index\.html?$/i, "").replace(/\/+$/, "");

    const { error } = await db.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: redirectUrl || window.location.origin
      }
    });

    if (error) showAlert(error.message);
  });
}

// Save Username during Onboarding
if (onboardingForm) {
  onboardingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const username = onboardingUsername.value.trim().toLowerCase();

    try {
      const { data: existing } = await db
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existing && existing.id !== currentUser.id) {
        showAlert("Username is already taken. Please pick another handle.");
        return;
      }

      const { error } = await db
        .from("profiles")
        .upsert({
          id: currentUser.id,
          username: username,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      await handleUserSession();
    } catch (err) {
      showAlert(err.message || "Failed to complete username onboarding.");
    }
  });
}

// Navigation and Sign-out Actions
if (btnSignOut) {
  btnSignOut.addEventListener("click", async () => {
    await db.auth.signOut();
  });
}

if (btnNavPassword) {
  btnNavPassword.addEventListener("click", () => switchView("password"));
}

if (btnCancelPassword) {
  btnCancelPassword.addEventListener("click", () => switchView("dashboard"));
}

// Password Change Form Submission
if (passwordForm) {
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const newPassword = newPasswordInput.value;
    const pwdError = validatePasswordRules(newPassword);

    if (pwdError) {
      showAlert(pwdError);
      return;
    }

    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) {
      showAlert(error.message);
    } else {
      showAlert("Password updated successfully!", "success");
      newPasswordInput.value = "";
      setTimeout(() => switchView("dashboard"), 1200);
    }
  });
}

// Fetch User Expenses
async function loadExpenses() {
  if (!expensesTbody) return;
  expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading transactions...</td></tr>';

  try {
    const { data: expenses, error } = await db
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    renderExpensesTable(expenses || []);
  } catch (err) {
    showAlert("Failed to load expenses: " + err.message);
  }
}

// Render Transactions Table & Compute Total Amount
function renderExpensesTable(expenses) {
  expensesTbody.innerHTML = "";
  let total = 0;

  if (expenses.length === 0) {
    expensesTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No expenses logged yet.</td></tr>';
    if (totalSpendingEl) totalSpendingEl.textContent = "$0.00";
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

  if (totalSpendingEl) totalSpendingEl.textContent = `$${total.toFixed(2)}`;
}

// Request temporary signed URL to view uploaded receipt file securely
async function openReceipt(receiptPath) {
  try {
    const { data, error } = await db
      .storage
      .from("receipts")
      .createSignedUrl(receiptPath, 60);

    if (error) throw error;

    if (data && data.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  } catch (err) {
    showAlert("Failed to view receipt attachment: " + err.message);
  }
}

// Submit New Expense Log Record
if (expenseForm) {
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
        const maxSize = 5 * 1024 * 1024; // 5 MB

        if (!allowedTypes.includes(file.type)) {
          showAlert("Invalid file format. Only JPG, PNG, and PDF files are permitted.");
          return;
        }

        if (file.size > maxSize) {
          showAlert("File size exceeds 5 MB limit.");
          return;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        receiptPath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await db
          .storage
          .from("receipts")
          .upload(receiptPath, file);

        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await db
        .from("expenses")
        .insert({
          user_id: currentUser.id,
          title,
          amount,
          category,
          date,
          receipt_path: receiptPath
        });

      if (insertError) throw insertError;

      expenseForm.reset();
      expenseDate.value = new Date().toISOString().split("T")[0];
      showAlert("Expense entry logged successfully!", "success");

      await loadExpenses();
    } catch (err) {
      showAlert("Failed to save expense: " + err.message);
    }
  });
}

// Remove Expense Entry and Attached File
async function deleteExpense(expenseId, receiptPath) {
  hideAlert();

  try {
    if (receiptPath) {
      const { error: storageErr } = await db
        .storage
        .from("receipts")
        .remove([receiptPath]);

      if (storageErr) {
        console.warn("Storage deletion warning:", storageErr.message);
      }
    }

    const { error: dbErr } = await db
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