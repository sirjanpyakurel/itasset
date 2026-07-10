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
        // dateFilter is "YYYY-MM-DD" from the date input
        const [year, month, day] = dateFilter.split('-').map(Number);

        // Compare local calendar date components — the exact same local date
        // the table displays via toLocaleDateString(), so the filter can
        // never disagree with what's shown in the Date column.
        filteredData = data.filter(row => {
            const d = new Date(row.created_at);
            return d.getFullYear() === year &&
                   d.getMonth() === month - 1 &&
                   d.getDate() === day;
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
