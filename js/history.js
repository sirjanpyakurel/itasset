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
        // Parse the filter date as local date (midnight in user's timezone)
        const [year, month, day] = dateFilter.split('-').map(Number);
        const filterDateStart = new Date(year, month - 1, day, 0, 0, 0); // Local midnight
        const filterDateEnd = new Date(year, month - 1, day, 23, 59, 59, 999); // End of day
        
        // Convert to UTC timestamps for comparison
        const startUTC = filterDateStart.getTime();
        const endUTC = filterDateEnd.getTime();
        
        filteredData = data.filter(row => {
            const rowTimestamp = new Date(row.created_at).getTime();
            return rowTimestamp >= startUTC && rowTimestamp <= endUTC;
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
