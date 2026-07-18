/* ---------- Shared icon set ---------- */

const ICONS = {
    box: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    grid: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    clock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    building: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg>',
    sun: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>',
    logout: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    plus: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    pencil: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    refresh: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    x: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    panelLeft: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M14 10l-2 2 2 2"/></svg>'
};

/* ---------- Theme (light / dark) ---------- */

// Applied immediately (before auth/render) so there's no flash of the wrong theme.
function getPreferredTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");
    if (icon) icon.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
    if (label) label.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
}

applyTheme(getPreferredTheme());

/* ---------- Sidebar collapse (desktop only) ---------- */

function getSidebarCollapsed() {
    return localStorage.getItem("sidebarCollapsed") === "1";
}

function applySidebarCollapsed(collapsed) {
    const shell = document.querySelector(".app-shell");
    if (!shell) return;
    shell.classList.toggle("sidebar-collapsed", collapsed);
    const icon = document.getElementById("collapseIcon");
    if (icon) icon.innerHTML = ICONS.panelLeft;
    const btn = document.getElementById("collapseBtn");
    if (btn) btn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
}

function toggleSidebar() {
    const next = !getSidebarCollapsed();
    localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
    applySidebarCollapsed(next);
}

applySidebarCollapsed(getSidebarCollapsed());

async function login() {

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        document.getElementById("message").innerText = error.message;
        return;
    }

    window.location.href = "dashboard.html";
}

/* ---------- Shared user / role / location context ---------- */

let currentUserProfile = null; // { role, email, full_name }
let currentUserLocations = []; // locations this user is directly assigned to: [{ id, name }]
let availableLocations = []; // locations the user can switch between (all of them, if admin)
let activeLocationId = null; // the office whose inventory is currently shown

async function getSessionUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = "index.html";
        return null;
    }
    return session.user;
}

function isAdmin() {
    return currentUserProfile?.role === "admin";
}

async function loadUserContext(user) {
    const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabaseClient.from("profiles").select("role, email, full_name").eq("id", user.id).single(),
        supabaseClient.from("user_locations").select("locations(id, name)").eq("user_id", user.id)
    ]);

    currentUserProfile = profile ?? { role: "member", email: user.email, full_name: null };
    currentUserLocations = (memberships ?? []).map(m => m.locations).filter(Boolean);

    availableLocations = isAdmin() ? await loadAllLocations() : currentUserLocations;

    const saved = localStorage.getItem("activeLocationId");
    const savedStillValid = availableLocations.some(l => String(l.id) === saved);
    activeLocationId = savedStillValid ? Number(saved) : (availableLocations[0]?.id ?? null);

    updateOfficeIndicator();
}

// Shows the current office in the sidebar: a dropdown when the user can switch
// between several, or a plain label when there's only one (or none) to show.
function updateOfficeIndicator() {
    const select = document.getElementById("locationSwitcher");
    const staticLabel = document.getElementById("locationStatic");
    if (!select || !staticLabel) return;

    if (availableLocations.length > 1) {
        select.innerHTML = "";
        availableLocations.forEach(loc => {
            const opt = document.createElement("option");
            opt.value = loc.id;
            opt.textContent = loc.name;
            if (loc.id === activeLocationId) opt.selected = true;
            select.appendChild(opt);
        });
        select.style.display = "block";
        staticLabel.style.display = "none";
    } else {
        select.style.display = "none";
        staticLabel.style.display = "flex";
        const activeLoc = availableLocations.find(l => l.id === activeLocationId);
        staticLabel.textContent = activeLoc ? activeLoc.name : "No office assigned";
    }
}

async function loadAllLocations() {
    const { data, error } = await supabaseClient.from("locations").select("*").order("name");
    if (error) return [];
    return data;
}

function setActiveLocation(id) {
    activeLocationId = id;
    localStorage.setItem("activeLocationId", String(id));
}

// Shared handler for the sidebar office switcher, wired up on every page.
// Each page reloads whatever data it owns, if it has any to reload.
function switchLocation(idStr) {
    setActiveLocation(Number(idStr));
    if (typeof loadAssets === "function") loadAssets();
    if (typeof loadHistory === "function") loadHistory();
}

async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        window.location.href = "dashboard.html";
    }
}

async function requireAuth() {
    // Set timeout fallback before auth check
    const timeoutId = setTimeout(() => {
        if (document.body.style.display === "none") {
            console.warn("Auth check timeout, showing body");
            document.body.style.display = "block";
        }
    }, 2000);

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        clearTimeout(timeoutId); // Clear timeout if auth check completes

        if (!session) {
            window.location.replace("index.html");
            return false;
        }

        // Show body only if authenticated
        document.body.style.display = "block";
        startIdleTimer();
        return true;
    } catch (error) {
        clearTimeout(timeoutId); // Clear timeout on error
        console.error("Auth check failed:", error);
        // Show body even if auth check fails to prevent white screen
        document.body.style.display = "block";
        window.location.replace("index.html");
        return false;
    }
}

/* ---------- Auto sign-out on inactivity ---------- */

const IDLE_TIMEOUT_MS = 25 * 60 * 1000;
let idleTimer = null;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(handleIdleSignOut, IDLE_TIMEOUT_MS);
}

async function handleIdleSignOut() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html?timeout=1";
}

function startIdleTimer() {
    ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(evt =>
        document.addEventListener(evt, resetIdleTimer)
    );
    resetIdleTimer();
}

function setupLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await login();
    });

    // Add Enter key handler as backup
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    if (emailInput && passwordInput) {
        const handleEnter = async (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                await login();
            }
        };

        emailInput.addEventListener("keydown", handleEnter);
        passwordInput.addEventListener("keydown", handleEnter);
    }
}

setupLoginForm();
