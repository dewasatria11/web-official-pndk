
// ==========================================
// FAQ Management (Separate File)
// ==========================================

async function uploadFaqCsv() {
    const fileInput = document.getElementById('faqCsvFile');
    const file = fileInput.files[0];

    if (!file) {
        toastr.warning('Silakan pilih file CSV terlebih dahulu');
        return;
    }

    const btn = document.getElementById('btnUploadFaq');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';

    try {
        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async function () {
            const base64String = reader.result; // Contains "data:text/csv;base64,..."

            try {
                const response = await fetch('/api/admin_faq_upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        file: base64String,
                        fileName: file.name
                    })
                });

                const result = await response.json();

                if (response.ok && result.ok) {
                    toastr.success(`Berhasil import FAQ! Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
                    fileInput.value = ''; // Reset input
                } else {
                    throw new Error(result.error || 'Gagal upload');
                }
            } catch (error) {
                console.error('Upload error:', error);
                toastr.error('Gagal upload: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        };

        reader.onerror = function (error) {
            console.error('File reading error:', error);
            toastr.error('Gagal membaca file');
            btn.disabled = false;
            btn.innerHTML = originalText;
        };

    } catch (error) {
        console.error('Error:', error);
        toastr.error('Terjadi kesalahan sistem');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Expose to window so onclick works
window.uploadFaqCsv = uploadFaqCsv;
