/* ============================================================
   Accept Invite — lands here from Supabase's invite email link,
   which the client library turns into a session automatically.
   ============================================================ */

async function initAcceptInvite() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        document.getElementById("message").textContent =
            "This invite link is invalid or has expired. Ask your admin to send a new one.";
        document.getElementById("acceptInviteForm").style.display = "none";
        return;
    }

    document.getElementById("acceptInviteForm").addEventListener("submit", async e => {
        e.preventDefault();
        await submitNewPassword();
    });
}

async function submitNewPassword() {
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const messageEl = document.getElementById("message");
    messageEl.textContent = "";

    if (password.length < 6) {
        messageEl.textContent = "Password must be at least 6 characters.";
        return;
    }
    if (password !== confirmPassword) {
        messageEl.textContent = "Passwords do not match.";
        return;
    }

    const submitBtn = document.querySelector("#acceptInviteForm button[type=submit]");
    submitBtn.disabled = true;

    const { error } = await supabaseClient.auth.updateUser({ password });

    submitBtn.disabled = false;

    if (error) {
        messageEl.textContent = error.message;
        return;
    }

    window.location.href = "dashboard.html";
}

initAcceptInvite();
