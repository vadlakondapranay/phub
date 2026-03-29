let lastSavedInvoiceId = null;

/* Generate invoice number */
function generateInvoiceNumber() {
    const now = new Date();
    return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
}

/* Set current date */
function setCurrentDate() {
    const dateEl = document.getElementById("date");
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString("en-GB");
    }
}

/* Set invoice number in UI */
function setInvoiceNumber() {
    const invoiceNoEl = document.getElementById("invoiceNo");
    if (invoiceNoEl) {
        invoiceNoEl.innerText = generateInvoiceNumber();
    }
}

/* Add new item row */
function addItem() {
    const tbody = document.querySelector("#itemsTable tbody");
    const rowCount = tbody.rows.length + 1;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>
            <input
                type="text"
                id="description_${rowCount}"
                name="description_${rowCount}"
                placeholder="Description"
                autocomplete="off"
            >
        </td>
        <td>
            <input
                type="number"
                id="quantity_${rowCount}"
                name="quantity_${rowCount}"
                min="1"
                value="1"
                oninput="calculateTotal()"
            >
        </td>
        <td>
            <input
                type="number"
                id="rate_${rowCount}"
                name="rate_${rowCount}"
                min="0"
                step="0.01"
                value="0"
                oninput="calculateTotal()"
            >
        </td>
        <td class="amount">0.00</td>
        <td>
            <button type="button" class="remove-btn" onclick="removeRow(this)">X</button>
        </td>
    `;

    tbody.appendChild(row);
    calculateTotal();
}

/* Remove item row */
function removeRow(btn) {
    btn.closest("tr").remove();
    calculateTotal();
}

/* Calculate subtotal, GST and total */
function calculateTotal() {
    let subtotal = 0;
    const rows = document.querySelectorAll("#itemsTable tbody tr");

    rows.forEach((row) => {
        const qtyInput = row.cells[1].querySelector("input");
        const rateInput = row.cells[2].querySelector("input");

        const qty = parseFloat(qtyInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;

        const amount = qty * rate;
        row.cells[3].innerText = amount.toFixed(2);
        subtotal += amount;
    });

    const gstPercent = 18;
    const gstAmount = subtotal * (gstPercent / 100);
    const grandTotal = subtotal + gstAmount;

    document.getElementById("subtotal").innerText = subtotal.toFixed(2);
    document.getElementById("gst").innerText = gstAmount.toFixed(2);
    document.getElementById("total").innerText = grandTotal.toFixed(2);
}

/* Build invoice payload */
function buildInvoicePayload() {
    const customerName = document.getElementById("customerName")?.value.trim() || "";
    const customerEmail = document.getElementById("customerEmail")?.value.trim() || "";
    const invoiceNo = document.getElementById("invoiceNo")?.innerText.trim() || generateInvoiceNumber();

    if (!customerName) {
        alert("Please enter customer name");
        return null;
    }

    const rows = document.querySelectorAll("#itemsTable tbody tr");
    const items = [];

    rows.forEach((row) => {
        const description = row.cells[0].querySelector("input").value.trim();
        const quantity = parseInt(row.cells[1].querySelector("input").value) || 0;
        const rate = parseFloat(row.cells[2].querySelector("input").value) || 0;
        const amount = quantity * rate;

        if (description && quantity > 0) {
            items.push({
                description: description,
                quantity: quantity,
                rate: rate,
                amount: amount
            });
        }
    });

    if (items.length === 0) {
        alert("Please add at least one valid item");
        return null;
    }

    const subtotal = parseFloat(document.getElementById("subtotal").innerText) || 0;
    const gstAmount = parseFloat(document.getElementById("gst").innerText) || 0;
    const grandTotal = parseFloat(document.getElementById("total").innerText) || 0;

    return {
        invoice_no: invoiceNo,
        customer_name: customerName,
        customer_email: customerEmail,
        subtotal: subtotal,
        gst_percent: 18,
        gst_amount: gstAmount,
        grand_total: grandTotal,
        items: items
    };
}

/* Save invoice */
async function saveInvoice() {
    try {
        const payload = buildInvoicePayload();
        if (!payload) return;

        const response = await fetch("/save_invoice", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to save invoice");
        }

        lastSavedInvoiceId = data.invoice_id;
        alert("Invoice saved successfully!");
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

/* Download PDF */
function downloadPDF() {
    if (!lastSavedInvoiceId) {
        alert("Please save invoice first before downloading PDF");
        return;
    }

    const customerPhone = encodeURIComponent(document.getElementById("customerPhone")?.value.trim() || "");
    const customerAddress = encodeURIComponent(document.getElementById("customerAddress")?.value.trim() || "Customer Address");

    window.open(
        `/download_pdf/${lastSavedInvoiceId}?customer_phone=${customerPhone}&customer_address=${customerAddress}`,
        "_blank"
    );
}

/* Send email + SMS */
async function sendInvoice() {
    try {
        if (!lastSavedInvoiceId) {
            alert("Please save invoice first before sending");
            return;
        }

        const payload = {
            customer_phone: document.getElementById("customerPhone")?.value.trim() || "",
            customer_address: document.getElementById("customerAddress")?.value.trim() || "Customer Address"
        };

        const response = await fetch(`/send_invoice/${lastSavedInvoiceId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to send invoice");
        }

        alert(`Done!\n${data.email_status}\n${data.sms_status}`);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

/* Initial load */
document.addEventListener("DOMContentLoaded", () => {
    setCurrentDate();
    setInvoiceNumber();
    addItem();
});