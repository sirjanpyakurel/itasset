/* ============================================================
   Locations — admin panel: add/rename offices, assign users
   ============================================================ */

let allLocations = [];
let allMemberships = []; // [{ user_id, location_id }]
let allProfiles = [];
let editingLocationId = null;
let assigningProfile = null;

/* ---------- Toasts ---------- */

function toast(message, type = "info") {
    const box = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => {
        el.classList.add("leaving");
        setTimeout(() => el.remove(), 300);
    }, 3200);
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

/* ---------- Guard: admin only ---------- */

async function requireAdmin() {
    if (!(await requireAuth())) return false;

    const user = await getSessionUser();
    if (!user) return false;

    await loadUserContext(user);

    if (!isAdmin()) {
        window.location.href = "dashboard.html";
        return false;
    }
    return true;
}

/* ---------- Data ---------- */

async function loadLocationsAndUsers() {
    const [locRes, userLocRes, profilesRes] = await Promise.all([
        supabaseClient.from("locations").select("*").order("name"),
        supabaseClient.from("user_locations").select("user_id, location_id"),
        supabaseClient.from("profiles").select("id, email, full_name, role").order("email")
    ]);

    if (locRes.error) {
        toast("Could not load locations: " + locRes.error.message, "error");
        return;
    }

    if (userLocRes.error) {
        toast("Could not load location memberships: " + userLocRes.error.message, "error");
        return;
    }

    if (profilesRes.error) {
        toast("Could not load users: " + profilesRes.error.message, "error");
        return;
    }

    allLocations = locRes.data ?? [];
    allMemberships = userLocRes.data ?? [];
    allProfiles = profilesRes.data ?? [];

    renderLocationsTable();
    renderUsersTable();
}

/* ---------- Locations table ---------- */

function renderLocationsTable() {
    const table = document.getElementById("locationsTable");
    table.innerHTML = "";

    if (allLocations.length === 0) {
        table.innerHTML = '<tr class="state-row"><td colspan="3">No locations yet. Click “+ Add Location” to create one.</td></tr>';
        return;
    }

    allLocations.forEach(loc => {
        const count = allMemberships.filter(m => m.location_id === loc.id).length;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(loc.name)}</td>
            <td>${count} user${count === 1 ? "" : "s"}</td>
            <td class="row-actions"><button class="btn-edit">${ICONS.pencil}Rename</button></td>`;
        tr.querySelector(".btn-edit").onclick = () => openRenameLocationModal(loc);
        table.appendChild(tr);
    });
}

function openAddLocationModal() {
    editingLocationId = null;
    document.getElementById("locationModalTitle").innerText = "Add Location";
    document.getElementById("locationForm").reset();
    document.getElementById("locationModal").style.display = "flex";
    document.getElementById("locationName").focus();
}

function openRenameLocationModal(loc) {
    editingLocationId = loc.id;
    document.getElementById("locationModalTitle").innerText = "Rename Location";
    document.getElementById("locationName").value = loc.name;
    document.getElementById("locationModal").style.display = "flex";
    document.getElementById("locationName").focus();
}

function closeAddLocationModal() {
    document.getElementById("locationModal").style.display = "none";
    document.getElementById("locationForm").reset();
    editingLocationId = null;
}

async function saveLocation() {
    const name = document.getElementById("locationName").value.trim();
    if (!name) return;

    const duplicate = allLocations.some(l =>
        l.id !== editingLocationId && l.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        toast("A location with this name already exists", "error");
        return;
    }

    if (editingLocationId === null) {
        const { error } = await supabaseClient.from("locations").insert({ name });
        if (error) return toast(error.message, "error");
        toast(`Added “${name}”`, "success");
    } else {
        const { error } = await supabaseClient.from("locations").update({ name }).eq("id", editingLocationId);
        if (error) return toast(error.message, "error");
        toast(`Renamed to “${name}”`, "success");
    }

    closeAddLocationModal();
    loadLocationsAndUsers();
}

/* ---------- Users table ---------- */

function renderUsersTable() {
    const table = document.getElementById("usersTable");
    table.innerHTML = "";

    if (allProfiles.length === 0) {
        table.innerHTML = '<tr class="state-row"><td colspan="4">No users yet.</td></tr>';
        return;
    }

    allProfiles.forEach(profile => {
        const locNames = allMemberships
            .filter(m => m.user_id === profile.id)
            .map(m => allLocations.find(l => l.id === m.location_id)?.name)
            .filter(Boolean);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(profile.email || profile.full_name || profile.id)}</td>
            <td>${profile.role === "admin" ? '<span class="badge edit">Admin</span>' : '<span class="badge ok">Member</span>'}</td>
            <td>${locNames.length ? escapeHtml(locNames.join(", ")) : '<span class="pending-note">None</span>'}</td>
            <td class="row-actions"><button class="btn-edit">${ICONS.building}Assign Offices</button></td>`;
        tr.querySelector(".btn-edit").onclick = () => openAssignModal(profile);
        table.appendChild(tr);
    });
}

function openAssignModal(profile) {
    assigningProfile = profile;
    document.getElementById("assignModalInfo").textContent = profile.email || profile.full_name || "";

    const memberLocIds = new Set(
        allMemberships.filter(m => m.user_id === profile.id).map(m => m.location_id)
    );

    const box = document.getElementById("assignCheckboxes");
    box.innerHTML = allLocations.map(loc => `
        <label class="checkbox-row">
            <input type="checkbox" value="${loc.id}" ${memberLocIds.has(loc.id) ? "checked" : ""}>
            ${escapeHtml(loc.name)}
        </label>
    `).join("");

    document.getElementById("assignModal").style.display = "flex";
}

function closeAssignModal() {
    document.getElementById("assignModal").style.display = "none";
    assigningProfile = null;
}

async function saveAssignments() {
    if (!assigningProfile) return;

    const checked = Array.from(document.querySelectorAll("#assignCheckboxes input:checked"))
        .map(el => Number(el.value));

    const current = allMemberships
        .filter(m => m.user_id === assigningProfile.id)
        .map(m => m.location_id);

    const toAdd = checked.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !checked.includes(id));

    for (const locationId of toAdd) {
        const { error } = await supabaseClient
            .from("user_locations")
            .insert({ user_id: assigningProfile.id, location_id: locationId });
        if (error) return toast(error.message, "error");
    }

    for (const locationId of toRemove) {
        const { error } = await supabaseClient
            .from("user_locations")
            .delete()
            .eq("user_id", assigningProfile.id)
            .eq("location_id", locationId);
        if (error) return toast(error.message, "error");
    }

    toast("Updated office access", "success");
    closeAssignModal();
    loadLocationsAndUsers();
}

/* ---------- Misc ---------- */

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}

/* ---------- Init ---------- */

async function initLocations() {
    if (!(await requireAdmin())) return;

    document.getElementById("locationForm").addEventListener("submit", async e => {
        e.preventDefault();
        await saveLocation();
    });
    document.getElementById("saveAssignmentsBtn").addEventListener("click", saveAssignments);

    document.querySelectorAll(".modal").forEach(m => {
        m.addEventListener("click", e => { if (e.target === m) m.style.display = "none"; });
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape")
            document.querySelectorAll(".modal").forEach(m => (m.style.display = "none"));
    });

    loadLocationsAndUsers();
}

initLocations();
