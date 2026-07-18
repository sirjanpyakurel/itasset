/* ============================================================
   Dashboard — inventory list, low-stock alerts, add/edit/remove
   ============================================================ */

const DEFAULT_REORDER_LEVEL = 5;

let allAssets = [];
let allOrders = []; // all pending (undelivered, uncancelled) orders
let sortKey = "name";
let sortDir = 1; // 1 asc, -1 desc
let lowOnly = false;
let editingAssetId = null;
let currentStockAsset = null;
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

function isSafePurchaseUrl(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url);
}

function ordersFor(assetId) {
    return allOrders.filter(o => o.asset_id === assetId);
}

function pendingOrderQty(asset) {
    return ordersFor(asset.id).reduce((sum, o) => sum + o.quantity, 0);
}

function effectiveQuantity(asset) {
    return asset.quantity + pendingOrderQty(asset);
}

// Whether an asset still needs ordering once incoming (pending order) stock is counted
function needsOrdering(asset) {
    return effectiveQuantity(asset) < reorderLevel(asset);
}

function stockStatus(asset) {
    if (!needsOrdering(asset)) return pendingOrderQty(asset) > 0 ? "ordered" : "ok";
    return asset.quantity === 0 ? "out" : "low";
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
    const lowAssets = allAssets.filter(needsOrdering);
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
        if (lowOnly && !needsOrdering(a)) return false;
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

        const pendingQty = pendingOrderQty(asset);

        const badge = status === "ok"
            ? '<span class="badge ok">In stock</span>'
            : status === "ordered"
                ? `<span class="badge ordered">Ordered · ${pendingQty} incoming</span>`
                : status === "low"
                    ? `<span class="badge low">Low · reorder at ${reorderLevel(asset)}</span>`
                    : '<span class="badge out">Out of stock</span>';

        const quantityCell = pendingQty > 0
            ? `<strong>${asset.quantity}</strong> + ${pendingQty} <span class="pending-note">(Ordered)</span>`
            : `<strong>${asset.quantity}</strong>`;

        tr.innerHTML = `
            <td class="name-cell" title="${escapeHtml(asset.description)}"></td>
            <td>${escapeHtml(asset.category)}</td>
            <td>${quantityCell}</td>
            <td>${badge}</td>
            <td class="row-actions">
                <button class="btn-edit">${ICONS.pencil}Edit</button>
                <button class="btn-update">${ICONS.refresh}Update</button>
            </td>`;

        const nameCell = tr.querySelector(".name-cell");
        if (isSafePurchaseUrl(asset.purchase_url)) {
            const link = document.createElement("a");
            link.href = asset.purchase_url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "asset-link";
            link.title = "Open purchase link";
            link.textContent = asset.name;
            link.onclick = e => e.stopPropagation();
            nameCell.appendChild(link);
        } else {
            nameCell.textContent = asset.name;
        }

        tr.querySelector(".btn-edit").onclick = () => openEditModal(asset);
        tr.querySelector(".btn-update").onclick = () => openStockModal(asset);
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

    if (!activeLocationId) {
        allAssets = [];
        allOrders = [];
        renderAll();
        document.getElementById("assetTable").innerHTML =
            '<tr class="state-row"><td colspan="5"><span class="emoji">🏢</span>You haven’t been assigned to an office yet. Ask your admin to add you to one.</td></tr>';
        return;
    }

    const [assetsRes, ordersRes] = await Promise.all([
        supabaseClient.from("assets").select("*").eq("location_id", activeLocationId).order("created_at", { ascending: false }),
        supabaseClient.from("orders").select("*").eq("location_id", activeLocationId).order("created_at", { ascending: true })
    ]);

    if (assetsRes.error) {
        toast("Could not load inventory: " + assetsRes.error.message, "error");
        document.getElementById("assetTable").innerHTML =
            '<tr class="state-row"><td colspan="5">Failed to load inventory.</td></tr>';
        return;
    }

    allAssets = assetsRes.data;
    // Graceful fallback if migration-v4.sql (orders table) hasn't been run yet
    allOrders = ordersRes.error ? [] : ordersRes.data;
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
    document.getElementById("assetPurchaseUrl").value = asset.purchase_url ?? "";
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
    const purchaseUrl = document.getElementById("assetPurchaseUrl").value.trim();

    if (!name || !category || Number.isNaN(quantity) || quantity < 0) {
        toast("Please fill all fields with valid values", "error");
        return;
    }

    if (purchaseUrl && !/^https?:\/\//i.test(purchaseUrl)) {
        toast("Purchase URL must start with http:// or https://", "error");
        return;
    }

    const user = await getSessionUser();
    if (!user) return;

    const saveBtn = document.getElementById("assetSaveBtn");
    saveBtn.disabled = true;

    try {
        if (editingAssetId === null) {
            await createAsset({ name, category, quantity, reorder, description, purchaseUrl, user });
        } else {
            await updateAsset({ name, category, reorder, description, purchaseUrl, user });
        }
    } finally {
        saveBtn.disabled = false;
    }
}

async function createAsset({ name, category, quantity, reorder, description, purchaseUrl, user }) {
    const duplicate = allAssets.some(a => a.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        toast("An asset with this name already exists", "error");
        return;
    }

    const payload = {
        name, category, quantity, description,
        created_by: user.id,
        location_id: activeLocationId,
        reorder_level: Number.isNaN(reorder) ? DEFAULT_REORDER_LEVEL : reorder,
        purchase_url: purchaseUrl || null
    };

    let { data, error } = await supabaseClient.from("assets").insert(payload).select().single();

    // Graceful fallback if migration-v2.sql / migration-v3.sql hasn't been run yet
    if (error && /reorder_level/.test(error.message)) {
        delete payload.reorder_level;
        ({ data, error } = await supabaseClient.from("assets").insert(payload).select().single());
        if (!error) toast("Tip: run supabase/migration-v2.sql to enable per-item thresholds", "info");
    }

    if (error && /purchase_url/.test(error.message)) {
        delete payload.purchase_url;
        ({ data, error } = await supabaseClient.from("assets").insert(payload).select().single());
        if (!error) toast("Tip: run supabase/migration-v3.sql to enable purchase links", "info");
    }

    if (error) {
        toast(error.message, "error");
        return;
    }

    await logHistory({
        asset_id: data.id,
        user_id: user.id,
        location_id: data.location_id,
        action: "ADD",
        quantity,
        reason: description || "New asset",
        done_by: emailPrefix(user)
    });

    closeAssetModal();
    toast(`Added “${name}”`, "success");
    loadAssets();
}

async function updateAsset({ name, category, reorder, description, purchaseUrl, user }) {
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
        reorder_level: Number.isNaN(reorder) ? DEFAULT_REORDER_LEVEL : reorder,
        purchase_url: purchaseUrl || null
    };

    let { error } = await supabaseClient.from("assets").update(payload).eq("id", editingAssetId);

    if (error && /reorder_level/.test(error.message)) {
        delete payload.reorder_level;
        ({ error } = await supabaseClient.from("assets").update(payload).eq("id", editingAssetId));
        if (!error) toast("Tip: run supabase/migration-v2.sql to enable per-item thresholds", "info");
    }

    if (error && /purchase_url/.test(error.message)) {
        delete payload.purchase_url;
        ({ error } = await supabaseClient.from("assets").update(payload).eq("id", editingAssetId));
        if (!error) toast("Tip: run supabase/migration-v3.sql to enable purchase links", "info");
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
    if ((original.purchase_url ?? "") !== (payload.purchase_url ?? "") && payload.purchase_url !== undefined)
        changes.push("purchase link updated");

    if (changes.length > 0) {
        // 'EDIT' requires migration-v2.sql; fails quietly on old schema
        await logHistory({
            asset_id: editingAssetId,
            user_id: user.id,
            location_id: original.location_id,
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

/* ---------- Update stock (add, remove, or order quantity) ---------- */

let stockMode = "ADD"; // "ADD" | "REMOVE" | "ORDER"

function setStockMode(mode) {
    stockMode = mode;
    document.getElementById("stockAddBtn").classList.toggle("active", mode === "ADD");
    document.getElementById("stockRemoveBtn").classList.toggle("active", mode === "REMOVE");
    document.getElementById("stockOrderBtn").classList.toggle("active", mode === "ORDER");

    document.getElementById("confirmStockButton").innerText =
        mode === "ADD" ? "Add Stock" : mode === "REMOVE" ? "Remove Stock" : "Place Order";
    document.getElementById("confirmStockButton").classList.toggle("btn-danger", mode === "REMOVE");

    document.getElementById("stockQuantityLabel").innerText =
        mode === "ORDER" ? "Quantity to order" : "Quantity";
    document.getElementById("stockReasonLabel").innerText =
        mode === "REMOVE" ? "Reason (required)" : "Reason (optional)";
    document.getElementById("stockReasonInput").placeholder =
        mode === "ADD" ? "e.g. New shipment received"
            : mode === "REMOVE" ? "e.g. Issued to new hire"
                : "e.g. Ordered from Amazon";

    document.getElementById("pendingOrdersBox").style.display = mode === "ORDER" ? "block" : "none";
    if (mode === "ORDER") renderPendingOrders();
}

function openStockModal(asset) {
    currentStockAsset = asset;
    const pending = pendingOrderQty(asset);
    document.getElementById("stockModalInfo").innerText = pending > 0
        ? `${asset.name} — ${asset.quantity} in stock (+${pending} on order)`
        : `${asset.name} — ${asset.quantity} in stock`;
    document.getElementById("stockQuantityInput").value = "";
    document.getElementById("stockReasonInput").value = "";
    setStockMode(pending > 0 ? "ORDER" : "ADD");
    document.getElementById("stockModal").style.display = "flex";
    document.getElementById("stockQuantityInput").focus();
}

function closeStockModal() {
    document.getElementById("stockModal").style.display = "none";
    currentStockAsset = null;
}

function renderPendingOrders() {
    const box = document.getElementById("pendingOrdersList");
    box.innerHTML = "";
    if (!currentStockAsset) return;

    const orders = ordersFor(currentStockAsset.id);
    if (orders.length === 0) {
        box.innerHTML = '<p class="pending-empty">No pending orders.</p>';
        return;
    }

    orders.forEach(order => {
        const row = document.createElement("div");
        row.className = "pending-order-row";
        row.innerHTML = `
            <span class="pending-order-info">${order.quantity} units — ${escapeHtml(order.reason || "No reason given")}</span>
            <span class="pending-order-actions">
                <button type="button" class="btn-deliver">${ICONS.check}Delivered</button>
                <button type="button" class="btn-cancel-order">${ICONS.x}Cancel</button>
            </span>`;
        row.querySelector(".btn-deliver").onclick = () => deliverOrder(order);
        row.querySelector(".btn-cancel-order").onclick = () => cancelOrder(order);
        box.appendChild(row);
    });
}

async function confirmStockUpdate() {
    if (!currentStockAsset) return;

    const amount = parseInt(document.getElementById("stockQuantityInput").value, 10);
    const reason = document.getElementById("stockReasonInput").value.trim();

    if (!amount || amount < 1) return toast("Enter a valid quantity", "error");

    if (stockMode === "REMOVE") {
        if (amount > currentStockAsset.quantity) return toast("Not enough stock", "error");
        if (!reason) return toast("Reason is required when removing stock", "error");
    }

    const user = await getSessionUser();
    if (!user) return;

    if (stockMode === "ORDER") {
        const { error } = await supabaseClient.from("orders").insert({
            asset_id: currentStockAsset.id,
            location_id: currentStockAsset.location_id,
            quantity: amount,
            reason: reason || null,
            created_by: user.id
        });

        if (error) {
            return toast(/relation .*orders.* does not exist/i.test(error.message)
                ? "Run supabase/migration-v4.sql to enable ordering"
                : error.message, "error");
        }

        await logHistory({
            asset_id: currentStockAsset.id,
            user_id: user.id,
            location_id: currentStockAsset.location_id,
            action: "ORDER",
            quantity: amount,
            reason: reason || "Order placed",
            done_by: emailPrefix(user)
        });

        const name = currentStockAsset.name;
        closeStockModal();
        toast(`Ordered ${amount} × ${name}`, "success");
        loadAssets();
        return;
    }

    const newQuantity = stockMode === "ADD"
        ? currentStockAsset.quantity + amount
        : currentStockAsset.quantity - amount;

    const { error } = await supabaseClient
        .from("assets")
        .update({ quantity: newQuantity })
        .eq("id", currentStockAsset.id);

    if (error) return toast(error.message, "error");

    await logHistory({
        asset_id: currentStockAsset.id,
        user_id: user.id,
        location_id: currentStockAsset.location_id,
        action: stockMode,
        quantity: amount,
        reason: reason || (stockMode === "ADD" ? "Restock" : "-"),
        done_by: emailPrefix(user)
    });

    const name = currentStockAsset.name;
    closeStockModal();
    toast(
        stockMode === "ADD"
            ? `Added ${amount} × ${name} (now ${newQuantity})`
            : `Removed ${amount} × ${name} (now ${newQuantity})`,
        "success"
    );
    loadAssets();
}

async function deliverOrder(order) {
    const user = await getSessionUser();
    if (!user) return;

    const asset = allAssets.find(a => a.id === order.asset_id);
    if (!asset) return;

    const newQuantity = asset.quantity + order.quantity;

    const { error: updateError } = await supabaseClient
        .from("assets")
        .update({ quantity: newQuantity })
        .eq("id", asset.id);

    if (updateError) return toast(updateError.message, "error");

    const { error: deleteError } = await supabaseClient.from("orders").delete().eq("id", order.id);
    if (deleteError) return toast(deleteError.message, "error");

    await logHistory({
        asset_id: asset.id,
        user_id: user.id,
        location_id: order.location_id,
        action: "DELIVER",
        quantity: order.quantity,
        reason: order.reason || "Order delivered",
        done_by: emailPrefix(user)
    });

    closeStockModal();
    toast(`Delivered ${order.quantity} × ${asset.name} (now ${newQuantity})`, "success");
    loadAssets();
}

async function cancelOrder(order) {
    const user = await getSessionUser();
    if (!user) return;

    const asset = allAssets.find(a => a.id === order.asset_id);

    const { error } = await supabaseClient.from("orders").delete().eq("id", order.id);
    if (error) return toast(error.message, "error");

    await logHistory({
        asset_id: order.asset_id,
        user_id: user.id,
        location_id: order.location_id,
        action: "CANCEL",
        quantity: order.quantity,
        reason: order.reason ? `Order cancelled: ${order.reason}` : "Order cancelled",
        done_by: emailPrefix(user)
    });

    closeStockModal();
    toast(`Cancelled order for ${asset ? asset.name : "asset"}`, "info");
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
        location_id: deletingAsset.location_id,
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
        .filter(needsOrdering)
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
            Math.max(reorderLevel(a) * 2 - effectiveQuantity(a), 1)
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

/* ---------- Location switcher ---------- */

function initLocationSwitcher() {
    const navBtn = document.getElementById("locationsNavBtn");
    navBtn.style.display = isAdmin() ? "inline-flex" : "none";

    const addBtn = document.getElementById("addAssetBtn");
    addBtn.disabled = !activeLocationId;
    addBtn.title = activeLocationId ? "" : "You haven't been assigned to an office yet";

    updateOfficeIndicator();
}

/* ---------- Misc ---------- */

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}

/* ---------- Init ---------- */

async function initDashboard() {
    if (!(await requireAuth())) return;

    const user = await getSessionUser();
    if (!user) return;
    await loadUserContext(user);
    initLocationSwitcher();

    document.getElementById("assetForm").addEventListener("submit", async e => {
        e.preventDefault();
        await saveAsset();
    });

    document.getElementById("confirmStockButton").addEventListener("click", confirmStockUpdate);
    document.getElementById("cancelStockButton").addEventListener("click", closeStockModal);
    document.getElementById("stockAddBtn").addEventListener("click", () => setStockMode("ADD"));
    document.getElementById("stockRemoveBtn").addEventListener("click", () => setStockMode("REMOVE"));
    document.getElementById("stockOrderBtn").addEventListener("click", () => setStockMode("ORDER"));
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
