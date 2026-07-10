/* ============================================================
   Dashboard — inventory list, low-stock alerts, add/edit/remove
   ============================================================ */

const DEFAULT_REORDER_LEVEL = 5;

let allAssets = [];
let sortKey = "name";
let sortDir = 1; // 1 asc, -1 desc
let lowOnly = false;
let editingAssetId = null;
let currentRemoveAsset = null;
let deletingAsset = null;

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

/* ---------- Helpers ---------- */

function reorderLevel(asset) {
    return asset.reorder_level ?? DEFAULT_REORDER_LEVEL;
}

function stockStatus(asset) {
    if (asset.quantity === 0) return "out";
    if (asset.quantity < reorderLevel(asset)) return "low";
    return "ok";
}

async function getSessionUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = "index.html";
        return null;
    }
    return session.user;
}

function emailPrefix(user) {
    return user.email ? user.email.split("@")[0] : "Unknown";
}

async function logHistory(entry) {
    const { error } = await supabaseClient.from("history").insert(entry);
    if (error) console.error("History log failed:", error.message);
}

/* ---------- Rendering ---------- */

function renderStats() {
    const lowAssets = allAssets.filter(a => stockStatus(a) !== "ok");
    document.getElementById("totalAssets").innerText = allAssets.length;
    document.getElementById("totalQuantity").innerText =
        allAssets.reduce((sum, a) => sum + a.quantity, 0);
    document.getElementById("lowStockCount").innerText = lowAssets.length;
    document.getElementById("lowStockCard").classList.toggle("alert", lowAssets.length > 0);
}

function renderCategoryFilter() {
    const select = document.getElementById("categoryFilter");
    const current = select.value;
    const categories = [...new Set(allAssets.map(a => a.category))].sort();
    select.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option${c === current ? " selected" : ""}>${escapeHtml(c)}</option>`).join("");
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

function visibleAssets() {
    const text = document.getElementById("searchBox").value.trim().toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    let rows = allAssets.filter(a => {
        if (lowOnly && stockStatus(a) === "ok") return false;
        if (category && a.category !== category) return false;
        if (text && !`${a.name} ${a.category} ${a.description ?? ""}`.toLowerCase().includes(text)) return false;
        return true;
    });

    rows.sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        const cmp = typeof va === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), undefined, { sensitivity: "base" });
        return cmp * sortDir;
    });

    return rows;
}

function renderTable() {
    const table = document.getElementById("assetTable");
    table.innerHTML = "";

    // sort arrows
    document.querySelectorAll(".sort-arrow").forEach(el => {
        el.textContent = el.dataset.key === sortKey ? (sortDir === 1 ? "▲" : "▼") : "";
    });

    const rows = visibleAssets();

    if (rows.length === 0) {
        const tr = document.createElement("tr");
        tr.className = "state-row";
        tr.innerHTML = `<td colspan="5"><span class="emoji">📦</span>${
            allAssets.length === 0
                ? "No assets yet. Click “+ Add Asset” to get started."
                : "Nothing matches your filters."
        }</td>`;
        table.appendChild(tr);
        return;
    }

    rows.forEach(asset => {
        const status = stockStatus(asset);
        const tr = document.createElement("tr");
        if (status === "low") tr.className = "low-stock";
        if (status === "out") tr.className = "out-of-stock";

        const badge = status === "ok"
            ? '<span class="badge ok">In stock</span>'
            : status === "low"
                ? `<span class="badge low">Low · reorder at ${reorderLevel(asset)}</span>`
                : '<span class="badge out">Out of stock</span>';

        tr.innerHTML = `
            <td title="${escapeHtml(asset.description)}">${escapeHtml(asset.name)}</td>
            <td>${escapeHtml(asset.category)}</td>
            <td><strong>${asset.quantity}</strong></td>
            <td>${badge}</td>
            <td class="row-actions">
                <button class="btn-edit">Edit</button>
                <button class="remove">Remove</button>
            </td>`;

        tr.querySelector(".btn-edit").onclick = () => openEditModal(asset);
        tr.querySelector(".remove").onclick = () => openRemoveModal(asset);
        table.appendChild(tr);
    });
}

function renderAll() {
    renderStats();
    renderCategoryFilter();
    renderTable();
}

function applyFilters() {
    renderTable();
}

function setSort(key) {
    if (sortKey === key) sortDir = -sortDir;
    else { sortKey = key; sortDir = 1; }
    renderTable();
}

function toggleLowFilter() {
    lowOnly = !lowOnly;
    document.getElementById("lowPill").classList.toggle("visible", lowOnly);
    renderTable();
}

/* ---------- Loading ---------- */

function showSkeleton() {
    const table = document.getElementById("assetTable");
    table.innerHTML = Array.from({ length: 4 }, () =>
        `<tr class="skeleton">${'<td><div class="bar"></div></td>'.repeat(5)}</tr>`
    ).join("");
}

async function loadAssets() {
    showSkeleton();

    const { data, error } = await supabaseClient
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        toast("Could not load inventory: " + error.message, "error");
        document.getElementById("assetTable").innerHTML =
            '<tr class="state-row"><td colspan="5">Failed to load inventory.</td></tr>';
        return;
    }

    allAssets = data;
    renderAll();
}

/* ---------- Add / Edit ---------- */

function openAddModal() {
    editingAssetId = null;
    document.getElementById("deleteAssetRow").style.display = "none";
    document.getElementById("assetModalTitle").innerText = "Add Asset";
    document.getElementById("assetQuantityLabel").innerText = "Quantity";
    document.getElementById("assetQuantity").disabled = false;
    document.getElementById("assetForm").reset();
    document.getElementById("assetReorderLevel").value = DEFAULT_REORDER_LEVEL;
    document.getElementById("assetModal").style.display = "flex";
    document.getElementById("assetName").focus();
}

function openEditModal(asset) {
    editingAssetId = asset.id;
    document.getElementById("assetModalTitle").innerText = "Edit Asset";
    document.getElementById("assetName").value = asset.name;
    document.getElementById("assetCategory").value = asset.category;
    document.getElementById("assetQuantity").value = asset.quantity;
    // Quantity changes must go through Add/Remove so the audit trail stays honest
    document.getElementById("assetQuantity").disabled = true;
    document.getElementById("assetQuantityLabel").innerText = "Quantity (use Remove / Add Stock to change)";
    document.getElementById("assetReorderLevel").value = reorderLevel(asset);
    document.getElementById("assetDescription").value = asset.description ?? "";
    const delRow = document.getElementById("deleteAssetRow");
    delRow.style.display = "flex";
    document.getElementById("deleteAssetBtn").onclick = () => {
        closeAssetModal();
        openDeleteModal(asset);
    };
    document.getElementById("assetModal").style.display = "flex";
}

function closeAssetModal() {
    document.getElementById("assetModal").style.display = "none";
    document.getElementById("assetForm").reset();
    document.getElementById("assetQuantity").disabled = false;
    editingAssetId = null;
}

async function saveAsset() {
    const name = document.getElementById("assetName").value.trim();
    const category = document.getElementById("assetCategory").value;
    const quantity = parseInt(document.getElementById("assetQuantity").value, 10);
    const reorder = parseInt(document.getElementById("assetReorderLevel").value, 10);
    const description = document.getElementById("assetDescription").value.trim();

    if (!name || !category || Number.isNaN(quantity) || quantity < 0) {
        toast("Please fill all fields with valid values", "error");
        return;
    }

    const user = await getSessionUser();
    if (!user) return;

    const saveBtn = document.getElementById("assetSaveBtn");
    saveBtn.disabled = true;

    try {
        if (editingAssetId === null) {
            await createAsset({ name, category, quantity, reorder, description, user });
        } else {
            await updateAsset({ name, category, reorder, description, user });
        }
    } finally {
        saveBtn.disabled = false;
    }
}

async function createAsset({ name, category, quantity, reorder, description, user }) {
    const duplicate = allAssets.some(a => a.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        toast("An asset with this name already exists", "error");
        return;
    }

    const payload = {
        name, category, quantity, description,
        created_by: user.id,
        reorder_level: Number.isNaN(reorder) ? DEFAULT_REORDER_LEVEL : reorder
    };

    let { data, error } = await supabaseClient.from("assets").insert(payload).select().single();

    // Graceful fallback if migration-v2.sql hasn't been run yet
    if (error && /reorder_level/.test(error.message)) {
        delete payload.reorder_level;
        ({ data, error } = await supabaseClient.from("assets").insert(payload).select().single());
        if (!error) toast("Tip: run supabase/migration-v2.sql to enable per-item thresholds", "info");
    }

    if (error) {
        toast(error.message, "error");
        return;
    }

    await logHistory({
        asset_id: data.id,
        user_id: user.id,
        action: "ADD",
        quantity,
        reason: description || "New asset",
        done_by: emailPrefix(user)
    });

    closeAssetModal();
    toast(`Added “${name}”`, "success");
    loadAssets();
}

async function updateAsset({ name, category, reorder, description, user }) {
    const original = allAssets.find(a => a.id === editingAssetId);
    if (!original) return;

    const duplicate = allAssets.some(a =>
        a.id !== editingAssetId && a.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        toast("Another asset already has this name", "error");
        return;
    }

    const payload = {
        name, category, description,
        reorder_level: Number.isNaN(reorder) ? DEFAULT_REORDER_LEVEL : reorder
    };

    let { error } = await supabaseClient.from("assets").update(payload).eq("id", editingAssetId);

    if (error && /reorder_level/.test(error.message)) {
        delete payload.reorder_level;
        ({ error } = await supabaseClient.from("assets").update(payload).eq("id", editingAssetId));
        if (!error) toast("Tip: run supabase/migration-v2.sql to enable per-item thresholds", "info");
    }

    if (error) {
        toast(error.message, "error");
        return;
    }

    const changes = [];
    if (original.name !== name) changes.push(`name: ${original.name} → ${name}`);
    if (original.category !== category) changes.push(`category: ${original.category} → ${category}`);
    if ((original.description ?? "") !== description) changes.push("description updated");
    if (reorderLevel(original) !== payload.reorder_level && payload.reorder_level !== undefined)
        changes.push(`alert level: ${reorderLevel(original)} → ${payload.reorder_level}`);

    if (changes.length > 0) {
        // 'EDIT' requires migration-v2.sql; fails quietly on old schema
        await logHistory({
            asset_id: editingAssetId,
            user_id: user.id,
            action: "EDIT",
            quantity: original.quantity || 1,
            reason: changes.join("; "),
            done_by: emailPrefix(user)
        });
    }

    closeAssetModal();
    toast(`Updated “${name}”`, "success");
    loadAssets();
}

/* ---------- Remove quantity ---------- */

function openRemoveModal(asset) {
    currentRemoveAsset = asset;
    document.getElementById("removeModalInfo").innerText =
        `${asset.name} — ${asset.quantity} in stock`;
    document.getElementById("removeQuantityInput").value = "";
    document.getElementById("removeReasonInput").value = "";
    document.getElementById("removeModal").style.display = "flex";
    document.getElementById("removeQuantityInput").focus();
}

function closeRemoveModal() {
    document.getElementById("removeModal").style.display = "none";
    currentRemoveAsset = null;
}

async function confirmRemove() {
    if (!currentRemoveAsset) return;

    const amount = parseInt(document.getElementById("removeQuantityInput").value, 10);
    const reason = document.getElementById("removeReasonInput").value.trim();

    if (!amount || amount < 1) return toast("Enter a valid quantity", "error");
    if (amount > currentRemoveAsset.quantity) return toast("Not enough stock", "error");
    if (!reason) return toast("Reason is required", "error");

    const user = await getSessionUser();
    if (!user) return;

    const { error } = await supabaseClient
        .from("assets")
        .update({ quantity: currentRemoveAsset.quantity - amount })
        .eq("id", currentRemoveAsset.id);

    if (error) return toast(error.message, "error");

    await logHistory({
        asset_id: currentRemoveAsset.id,
        user_id: user.id,
        action: "REMOVE",
        quantity: amount,
        reason,
        done_by: emailPrefix(user)
    });

    const name = currentRemoveAsset.name;
    closeRemoveModal();
    toast(`Removed ${amount} × ${name}`, "success");
    loadAssets();
}

/* ---------- Delete asset ---------- */

function openDeleteModal(asset) {
    deletingAsset = asset;
    document.getElementById("deleteAssetName").innerText = asset.name;
    document.getElementById("deleteModal").style.display = "flex";
}

function closeDeleteModal() {
    document.getElementById("deleteModal").style.display = "none";
    deletingAsset = null;
}

async function confirmDelete() {
    if (!deletingAsset) return;
    const user = await getSessionUser();
    if (!user) return;

    // Log first so the entry survives even on old cascade-delete schema… it
    // won't (cascade removes it), but on migrated schema asset_id is nulled.
    await logHistory({
        asset_id: deletingAsset.id,
        user_id: user.id,
        action: "DELETE",
        quantity: deletingAsset.quantity || 1,
        reason: `Deleted asset “${deletingAsset.name}” (${deletingAsset.category})`,
        done_by: emailPrefix(user)
    });

    const { error } = await supabaseClient.from("assets").delete().eq("id", deletingAsset.id);
    if (error) {
        toast(error.message, "error");
        return;
    }

    const name = deletingAsset.name;
    closeDeleteModal();
    toast(`Deleted “${name}”`, "success");
    loadAssets();
}

/* ---------- Reorder list export ---------- */

function exportReorderList() {
    const low = allAssets
        .filter(a => stockStatus(a) !== "ok")
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    if (low.length === 0) {
        toast("Nothing needs ordering right now 🎉", "info");
        return;
    }

    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
        ["Name", "Category", "In Stock", "Alert Level", "Suggested Order"].map(esc).join(","),
        ...low.map(a => [
            a.name, a.category, a.quantity, reorderLevel(a),
            Math.max(reorderLevel(a) * 2 - a.quantity, 1)
        ].map(esc).join(","))
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reorder-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast(`Exported ${low.length} item${low.length > 1 ? "s" : ""} to order`, "success");
}

/* ---------- Misc ---------- */

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}

/* ---------- Init ---------- */

async function initDashboard() {
    if (!(await requireAuth())) return;

    document.getElementById("assetForm").addEventListener("submit", async e => {
        e.preventDefault();
        await saveAsset();
    });

    document.getElementById("confirmRemoveButton").addEventListener("click", confirmRemove);
    document.getElementById("cancelRemoveButton").addEventListener("click", closeRemoveModal);
    document.getElementById("confirmDeleteButton").addEventListener("click", confirmDelete);

    // Close modals on backdrop click / Escape
    document.querySelectorAll(".modal").forEach(m => {
        m.addEventListener("click", e => { if (e.target === m) m.style.display = "none"; });
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape")
            document.querySelectorAll(".modal").forEach(m => (m.style.display = "none"));
    });

    loadAssets();
}

initDashboard();
