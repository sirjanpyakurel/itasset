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

async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        window.location.href = "dashboard.html";
    }
}

async function requireAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.replace("index.html");
        return false;
    }

    return true;
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
