function renderAssetRow(asset) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = asset.name;

    const categoryCell = document.createElement("td");
    categoryCell.textContent = asset.category;

    const quantityCell = document.createElement("td");
    quantityCell.textContent = asset.quantity;

    const actionCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => removeAsset(asset.id, asset.quantity);
    actionCell.appendChild(removeBtn);

    row.append(nameCell, categoryCell, quantityCell, actionCell);
    return row;
}

function renderAssets(data) {
    const table = document.getElementById("assetTable");
    table.innerHTML = "";

    let total = 0;

    data.forEach(asset => {
        total += asset.quantity;
        table.appendChild(renderAssetRow(asset));
    });

    if (document.getElementById("totalAssets")) {
        document.getElementById("totalAssets").innerText = data.length;
    }

    if (document.getElementById("totalQuantity")) {
        document.getElementById("totalQuantity").innerText = total;
    }
}

async function loadAssets() {
    const { data, error } = await supabaseClient
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    renderAssets(data);
}

function openAddModal() {
    document.getElementById("addModal").style.display = "flex";
}

function closeAddModal() {
    document.getElementById("addModal").style.display = "none";
    document.getElementById("addAssetForm")?.reset();
}

async function saveAsset() {
    const name = document.getElementById("assetName").value.trim();
    const category = document.getElementById("assetCategory").value;
    const quantity = parseInt(document.getElementById("assetQuantity").value, 10);
    const description = document.getElementById("assetDescription").value.trim();

    if (!name || !category || !quantity || quantity < 1) {
        alert("Please fill all fields with valid values");
        return;
    }

    // Check if asset with same name already exists (case-insensitive)
    console.log("Checking for duplicate asset:", name);
    const { data: existingAssets, error: checkError } = await supabaseClient
        .from("assets")
        .select("name");

    console.log("Existing assets:", existingAssets);
    console.log("Check error:", checkError);

    if (checkError) {
        console.error("Error checking for duplicates:", checkError);
    }

    // Case-insensitive comparison
    const duplicateExists = existingAssets && existingAssets.some(
        asset => asset.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicateExists) {
        alert("An asset with this name already exists");
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        window.location.href = "index.html";
        return;
    }

    // Extract email prefix (part before @)
    console.log("Session user:", session.user);
    console.log("User email:", session.user.email);
    const emailPrefix = session.user.email ? session.user.email.split('@')[0] : 'Unknown';
    console.log("Email prefix:", emailPrefix);

    const { data, error } = await supabaseClient
        .from("assets")
        .insert({
            name,
            category,
            quantity,
            description,
            created_by: session.user.id
        })
        .select()
        .single();

    if (error) {
        alert(error.message);
        return;
    }

    await supabaseClient
        .from("history")
        .insert({
            asset_id: data.id,
            user_id: session.user.id,
            action: "ADD",
            quantity,
            done_by: emailPrefix
        });

    closeAddModal();
    loadAssets();
}

let currentRemoveAssetId = null;
let currentRemoveAssetQuantity = null;

function openRemoveModal(id, currentQuantity) {
    currentRemoveAssetId = id;
    currentRemoveAssetQuantity = currentQuantity;
    document.getElementById("removeQuantityInput").value = "";
    document.getElementById("removeReasonInput").value = "";
    document.getElementById("removeModal").style.display = "flex";
}

function closeRemoveModal() {
    document.getElementById("removeModal").style.display = "none";
    currentRemoveAssetId = null;
    currentRemoveAssetQuantity = null;
}

async function removeAsset(id, currentQuantity) {
    openRemoveModal(id, currentQuantity);
}

async function confirmRemove() {
    const amountStr = document.getElementById("removeQuantityInput").value;
    const reason = document.getElementById("removeReasonInput").value;

    if (!amountStr) {
        alert("Please enter a quantity");
        return;
    }

    // Validate that input is a number
    if (!/^\d+$/.test(amountStr)) {
        alert("Please enter a valid number");
        return;
    }

    const amount = parseInt(amountStr, 10);

    if (!amount || amount < 1) {
        alert("Enter a valid quantity");
        return;
    }

    if (amount > currentRemoveAssetQuantity) {
        alert("Not enough stock");
        return;
    }

    if (!reason || !reason.trim()) {
        alert("Reason required");
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        window.location.href = "index.html";
        return;
    }

    // Extract email prefix (part before @)
    console.log("Session user:", session.user);
    console.log("User email:", session.user.email);
    const emailPrefix = session.user.email ? session.user.email.split('@')[0] : 'Unknown';
    console.log("Email prefix:", emailPrefix);

    const newQuantity = currentRemoveAssetQuantity - amount;

    const { error } = await supabaseClient
        .from("assets")
        .update({ quantity: newQuantity })
        .eq("id", currentRemoveAssetId);

    if (error) {
        alert(error.message);
        return;
    }

    await supabaseClient
        .from("history")
        .insert({
            asset_id: currentRemoveAssetId,
            user_id: session.user.id,
            action: "REMOVE",
            quantity: amount,
            reason: reason.trim(),
            done_by: emailPrefix
        });

    closeRemoveModal();
    loadAssets();
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}

function searchAssets() {
    const text = document.getElementById("searchBox").value.toLowerCase();
    const rows = document.querySelectorAll("#assetTable tr");

    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(text) ? "" : "none";
    });
}

async function showLowInventory() {
    const { data, error } = await supabaseClient
        .from("assets")
        .select("*")
        .lt("quantity", 5);

    if (error) {
        console.error(error);
        return;
    }

    renderAssets(data);
}

async function initDashboard() {
    if (!(await requireAuth())) return;

    const addForm = document.getElementById("addAssetForm");
    if (addForm) {
        addForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await saveAsset();
        });
    }

    // Setup remove modal event listeners
    const confirmRemoveButton = document.getElementById("confirmRemoveButton");
    const cancelRemoveButton = document.getElementById("cancelRemoveButton");

    if (confirmRemoveButton) {
        confirmRemoveButton.addEventListener("click", confirmRemove);
    }

    if (cancelRemoveButton) {
        cancelRemoveButton.addEventListener("click", closeRemoveModal);
    }

    loadAssets();
}

initDashboard();
