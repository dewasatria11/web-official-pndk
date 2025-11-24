
/* =========================
   15) PAYMENT SETTINGS
   ========================= */
async function loadPaymentSettings() {
    try {
        const result = await jsonRequest("/api/payment_settings");
        if (result.ok && result.data) {
            const d = result.data;
            $("#payment-bank-name").value = d.bank_name || "";
            $("#payment-bank-account").value = d.bank_account || "";
            $("#payment-bank-holder").value = d.bank_holder || "";
            $("#payment-nominal").value = d.nominal || "";
            $("#payment-qris-nominal").value = d.qris_nominal || "";

            const preview = $("#payment-qris-preview");
            const noneMsg = $("#payment-qris-none");

            if (d.qris_image_url) {
                preview.src = d.qris_image_url;
                preview.style.display = "block";
                noneMsg.style.display = "none";
            } else {
                preview.style.display = "none";
                noneMsg.style.display = "block";
            }
        }
    } catch (e) {
        console.error("Error loading payment settings:", e);
        safeToastr.error("Gagal memuat pengaturan pembayaran");
    }
}

async function savePaymentSettings() {
    const btn = document.querySelector("button[onclick='savePaymentSettings()']");
    setButtonLoading(btn, true);

    try {
        const payload = {
            bank_name: $("#payment-bank-name").value,
            bank_account: $("#payment-bank-account").value,
            bank_holder: $("#payment-bank-holder").value,
            nominal: toInteger($("#payment-nominal").value),
            qris_nominal: toInteger($("#payment-qris-nominal").value),
        };

        // Handle QRIS upload if file selected
        const fileInput = $("#payment-qris-file");
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            // Convert to base64 for simplicity (assuming small image)
            // Or use uploadFile endpoint if we want to store in storage
            // For now, let's try base64 as it's easiest without new storage bucket logic
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            payload.qris_image_url = base64;
        }

        const result = await jsonRequest("/api/payment_settings", {
            method: "POST",
            body: payload
        });

        if (result.ok) {
            safeToastr.success("Pengaturan pembayaran berhasil disimpan");
            loadPaymentSettings(); // Reload to show updated data/image
            // Clear file input
            if (fileInput) fileInput.value = "";
        }
    } catch (e) {
        console.error("Error saving payment settings:", e);
        safeToastr.error("Gagal menyimpan pengaturan: " + e.message);
    } finally {
        setButtonLoading(btn, false, "Simpan Perubahan");
    }
}

// Expose functions
window.loadPaymentSettings = loadPaymentSettings;
window.savePaymentSettings = savePaymentSettings;
