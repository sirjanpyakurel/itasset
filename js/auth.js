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

async function signup() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        document.getElementById("message").innerText = error.message;
        return;
    }

    document.getElementById("message").innerText = "Sign up successful! Please check your email to confirm your account.";
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

function setupSignupForm() {
    const form = document.getElementById("signupForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await signup();
    });

    // Add Enter key handler as backup
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    if (emailInput && passwordInput) {
        const handleEnter = async (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                await signup();
            }
        };

        emailInput.addEventListener("keydown", handleEnter);
        passwordInput.addEventListener("keydown", handleEnter);
    }
}

setupLoginForm();
