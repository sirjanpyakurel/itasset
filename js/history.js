function renderHistoryRow(row, index) {
    const tr = document.createElement("tr");

    const cells = [
        index,
        new Date(row.created_at).toLocaleDateString(),
        row.assets?.name ?? "Deleted asset",
        row.action,
        row.quantity,
        row.profiles?.full_name ?? "Unknown",
        row.reason ?? "-"
    ];

    cells.forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
    });

    return tr;
}

async function loadHistory() {
    const filter = document.getElementById("filter").value;

    let query = supabaseClient
        .from("history")
        .select(`
            *,
            assets(name),
            profiles(full_name)
        `)
        .order("created_at", { ascending: false });

    if (filter !== "ALL") {
        query = query.eq("action", filter);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    data.forEach((row, i) => {
        table.appendChild(renderHistoryRow(row, i + 1));
    });
}

async function initHistory() {
    if (!(await requireAuth())) return;
    loadHistory();
}

initHistory();
