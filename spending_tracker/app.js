// ==========================================
// SPENDWISE CORE APPLICATION LOGIC
// ==========================================

// 1. Initialize Client (Renamed to 'db' to fix the shadowing bug)
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
let isSignUpMode = false;
let isAuthListenerReady = false; // FIX: Prevents the listener from logging us out before we check storage

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

// ... [KEEP ALL YOUR OTHER DOM ELEMENT SELECTORS HERE (authForm, expenseForm, etc.)] ...

// Set default expense date picker to today's date
if (expenseDate) {
  expenseDate.value = new Date().toISOString().split("T")[0];
}

// Display feedback notifications
function showAlert(message, type = "error") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideAlert() {
  if (alertBox) alertBox.style.display = "none";
}

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

function cleanUrlParams() {
  if (window.location.search.includes("code=") || window.location.hash.includes("access_token")) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

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

// ==========================================
// FIX: NEW AUTH BOOTSTRAP LOGIC
// ==========================================

// 1. Set up the listener
db.auth.onAuthStateChange(async (event, session) => {
  cleanUrlParams();
  
  // Ignore the very first event. We wait for getSession() to resolve first.
  if (!isAuthListenerReady) return;

  // Handle explicit logouts
  if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentProfile = null;
    switchView("auth");
  }
  
  // Handle new logins or token refreshes
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
    currentUser = session.user;
    await handleUserSession();
  }
});

// 2. Manually boot the session (This guarantees we check the browser's saved data before logging out)
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
    // NOW we allow the listener to start working (so Sign Out works)
    isAuthListenerReady = true;
  }
})();