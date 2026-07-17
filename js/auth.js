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
