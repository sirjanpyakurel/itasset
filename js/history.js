function renderHistoryRow(row, index) {
    const tr = document.createElement("tr");

    const cells = [
        index,
        new Date(row.created_at).toLocaleDateString(),
        row.assets?.name ?? "Deleted asset",
        row.action,
        row.quantity,
        row.done_by ?? "Unknown",
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
    const dateFilter = document.getElementById("dateFilter").value;

    let query = supabaseClient
        .from("history")
        .select(`
            *,
            assets(name)
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

    let filteredData = data;

    if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filteredData = data.filter(row => {
            const rowDate = new Date(row.created_at);
            // Compare dates using UTC to avoid timezone issues
            const rowDateUTC = Date.UTC(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
            const filterDateUTC = Date.UTC(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
            return rowDateUTC === filterDateUTC;
        });
    }

    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    filteredData.forEach((row, i) => {
        table.appendChild(renderHistoryRow(row, i + 1));
    });
}

async function initHistory() {
    if (!(await requireAuth())) return;
    loadHistory();
}

initHistory();
