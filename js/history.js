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
        // Parse the filter date as local date (user's timezone)
        const [year, month, day] = dateFilter.split('-').map(Number);
        
        // Create the start of the day in user's local timezone
        const localStart = new Date(year, month - 1, day, 0, 0, 0);
        
        // Get the timezone offset in minutes (negative for UTC-05:00)
        const offset = localStart.getTimezoneOffset();
        
        // Convert to UTC by subtracting the offset (in milliseconds)
        const startUTC = localStart.getTime() - (offset * 60000);
        
        // End of day is 24 hours later
        const endUTC = startUTC + (24 * 60 * 60 * 1000);
        
        filteredData = data.filter(row => {
            const rowTimestamp = new Date(row.created_at).getTime();
            return rowTimestamp >= startUTC && rowTimestamp < endUTC;
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
