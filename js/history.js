/* ============================================================
   History — audit trail with server-side filters & CSV export
   ============================================================ */

const HISTORY_LIMIT = 1000;

let historyRows = [];

function toast(message, type = "info") {
    const box = document.getElementById("toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => {
        el.classList.add("leaving");
        setTimeout(() => el.remove(), 300);
    }, 3200);
}

const ACTION_BADGES = {
    ADD: '<span class="badge add">ADD</span>',
    REMOVE: '<span class="badge rem">REMOVE</span>',
    EDIT: '<span class="badge edit">EDIT</span>',
    DELETE: '<span class="badge del">DELETE</span>'
};

function renderHistoryRow(row, index) {
    const tr = document.createElement("tr");
    const date = new Date(row.created_at);

    const cells = [
        index,
        `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        row.assets?.name ?? "Deleted asset",
        null, // action badge (HTML)
        row.quantity,
        row.done_by ?? "Unknown",
        row.reason ?? "-"
    ];

    cells.forEach((value, i) => {
        const td = document.createElement("td");
        if (i === 3) td.innerHTML = ACTION_BADGES[row.action] ?? row.action;
        else td.textContent = value;
        tr.appendChild(td);
    });

    return tr;
}

/* ---------- Data ---------- */

async function loadHistory() {
    const table = document.getElementById("historyTable");
    table.innerHTML = Array.from({ length: 5 }, () =>
        `<tr class="skeleton">${'<td><div class="bar"></div></td>'.repeat(7)}</tr>`
    ).join("");

    const action = document.getElementById("filter").value;
    const dateFilter = document.getElementById("dateFilter").value;

    let query = supabaseClient
        .from("history")
        .select("*, assets(name)")
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

    if (action !== "ALL") query = query.eq("action", action);

    if (dateFilter) {
        // Local calendar day -> UTC range, filtered server-side
        const [y, m, d] = dateFilter.split("-").map(Number);
        const start = new Date(y, m - 1, d);
        const end = new Date(y, m - 1, d + 1);
        query = query.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        toast("Could not load history: " + error.message, "error");
        table.innerHTML = '<tr class="state-row"><td colspan="7">Failed to load history.</td></tr>';
        return;
    }

    historyRows = data;
    renderHistory();
}

/* ---------- Rendering (client-side text search on loaded rows) ---------- */

function visibleRows() {
    const text = document.getElementById("historySearch").value.trim().toLowerCase();
    if (!text) return historyRows;
    return historyRows.filter(r =>
        `${r.assets?.name ?? "deleted asset"} ${r.done_by ?? ""} ${r.reason ?? ""} ${r.action}`
            .toLowerCase().includes(text)
    );
}

function renderHistory() {
    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    const rows = visibleRows();

    if (rows.length === 0) {
        table.innerHTML = `<tr class="state-row"><td colspan="7"><span class="emoji">🗂️</span>${
            historyRows.length === 0 ? "No history for the selected filters." : "No rows match your search."
        }</td></tr>`;
        return;
    }

    rows.forEach((row, i) => table.appendChild(renderHistoryRow(row, i + 1)));
}

function clearFilters() {
    document.getElementById("historySearch").value = "";
    document.getElementById("filter").value = "ALL";
    document.getElementById("dateFilter").value = "";
    loadHistory();
}

/* ---------- CSV export ---------- */

function exportHistoryCsv() {
    const rows = visibleRows();
    if (rows.length === 0) return toast("Nothing to export", "info");

    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
        ["Date", "Time", "Asset", "Action", "Quantity", "Done By", "Reason"].map(esc).join(","),
        ...rows.map(r => {
            const d = new Date(r.created_at);
            return [
                d.toLocaleDateString(), d.toLocaleTimeString(),
                r.assets?.name ?? "Deleted asset",
                r.action, r.quantity, r.done_by ?? "Unknown", r.reason ?? "-"
            ].map(esc).join(",");
        })
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast(`Exported ${rows.length} entries`, "success");
}

/* ---------- Init ---------- */

async function initHistory() {
    if (!(await requireAuth())) return;
    loadHistory();
}

initHistory();
