document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    requireAuth();

    const API_URL = `http://${window.location.hostname}:8000`;

    // --- Elements ---
    const issueBtn = document.getElementById('issueBtn');
    const resultModal = document.getElementById('resultModal');
    const resTitle = document.getElementById('resTitle');
    const resMsg = document.getElementById('resMsg');
    const resDetails = document.getElementById('resDetails');
    const resLink = document.getElementById('resLink');
    const resId = document.getElementById('resId');
    const resTx = document.getElementById('resTx');

    const signaturesContainer = document.getElementById('signaturesContainer');
    const addSignBtn = document.getElementById('addSignBtn');

    if (!issueBtn || !resultModal || !signaturesContainer) {
        console.error("Critical UI elements missing for certificate issuance.");
        return;
    }

    let isRestoring = false;

    // Inputs
    const inputs = {
        // Content
        name: document.getElementById('studentName'),
        course: document.getElementById('course'),
        date: document.getElementById('date'),
        title: document.getElementById('certTitle'),
        subtitle: document.getElementById('certSubtitle'),
        body: document.getElementById('certBody'),

        // Style
        bgColor: document.getElementById('bgColor'),
        bgOpacity: document.getElementById('bgOpacity'),
        bgUpload: document.getElementById('bgUpload'),
        borderStyle: document.getElementById('borderStyle'),
        borderColor: document.getElementById('borderColor'),

        // Typography
        titleColor: document.getElementById('titleColor'),
        fontFamily: document.getElementById('fontFamily'),
        textAlign: document.getElementById('textAlign'),

        // Visuals
        sealUpload: document.getElementById('sealUpload'),
        qrPosition: document.getElementById('qrPosition'),
        email: document.getElementById('studentEmail')
    };

    // Preview Elements
    const preview = {
        canvas: document.getElementById('certCanvas'),
        title: document.getElementById('pTitle'),
        subtitle: document.getElementById('pSubtitle'),
        student: document.getElementById('pStudent'),
        course: document.getElementById('pCourse'),
        body: document.getElementById('pBody'),
        date: document.getElementById('pDate'),
        signatures: document.getElementById('pSignatures'),
        seal: document.getElementById('pSeal'),
        qr: document.getElementById('pQR')
    };

    // --- Live Preview Logic ---
    function updatePreview() {
        if (!preview.canvas) return;

        // 1. Content Updates
        preview.student.textContent = inputs.name.value || '[Recipient Name]';
        preview.course.textContent = inputs.course.value || '[Course Name]';
        preview.date.textContent = inputs.date.value || '--/--/----';

        preview.title.textContent = inputs.title.value;
        preview.subtitle.textContent = inputs.subtitle.value;
        preview.body.textContent = inputs.body.value;

        // 2. Style Updates
        const baseColor = inputs.bgColor.value;
        const opacity = inputs.bgOpacity.value;
        preview.canvas.style.backgroundColor = hexToRgba(baseColor, opacity);

        // Border
        if (inputs.borderStyle.value === 'none') {
            preview.canvas.style.border = 'none';
        } else {
            const width = inputs.borderStyle.value === 'double' ? '20px' : '10px';
            preview.canvas.style.border = `${width} ${inputs.borderStyle.value} ${inputs.borderColor.value}`;
        }

        // 3. Typography Updates
        preview.title.style.color = inputs.titleColor.value;
        preview.canvas.style.fontFamily = inputs.fontFamily.value;
        preview.canvas.style.textAlign = inputs.textAlign.value;

        // Align specific elements based on global alignment
        if (inputs.textAlign.value === 'center') {
            preview.student.style.margin = '20px auto';
        } else {
            preview.student.style.margin = '20px 0';
        }

        // 4. QR Position
        if (preview.qr) {
            preview.qr.style.display = 'block';
            preview.qr.style.top = 'auto'; preview.qr.style.bottom = 'auto';
            preview.qr.style.left = 'auto'; preview.qr.style.right = 'auto';
            preview.qr.style.position = 'absolute';

            switch (inputs.qrPosition.value) {
                case 'bottom-right':
                    preview.qr.style.bottom = '40px';
                    preview.qr.style.right = '40px';
                    break;
                case 'bottom-left':
                    preview.qr.style.bottom = '40px';
                    preview.qr.style.left = '40px';
                    break;
                case 'bottom-center':
                    preview.qr.style.bottom = '40px';
                    preview.qr.style.left = '50%';
                    preview.qr.style.transform = 'translateX(-50%)';
                    break;
                case 'hide':
                    preview.qr.style.display = 'none';
                    break;
            }
        }

        // 5. Signatures Preview
        updateSignaturesPreview();

        // --- Persist Design State ---
        if (!isRestoring) {
            saveDesignState();
        }
    }

    function updateSignaturesPreview() {
        if (!preview.signatures) return;
        preview.signatures.innerHTML = "";
        const entries = signaturesContainer.querySelectorAll('.signature-entry');
        entries.forEach(entry => {
            const fileInput = entry.querySelector('.sign-upload-input');
            const labelInput = entry.querySelector('.sign-label-input');

            const signArea = document.createElement('div');
            signArea.className = 'cert-sign-area';

            const img = document.createElement('img');
            img.className = 'sign-img';
            img.style.maxHeight = '80px';
            img.style.margin = '0 auto';

            // Only use dataset.preview to avoid async race conditions during render
            if (fileInput.dataset.preview) {
                img.src = fileInput.dataset.preview;
                img.style.display = 'block';
            } else {
                img.style.display = 'none';
            }

            const label = document.createElement('div');
            label.style.borderTop = '1px solid #333';
            label.style.width = '150px';
            label.style.marginTop = '10px';
            label.textContent = labelInput.value || "Authorized Signature";

            signArea.appendChild(img);
            signArea.appendChild(label);
            preview.signatures.appendChild(signArea);
        });
    }

    // --- Dynamic Signature Management ---
    function addSignatureField() {
        const div = document.createElement('div');
        div.className = 'signature-entry';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.border = '1px dashed var(--border-color)';
        div.style.borderRadius = '8px';
        div.style.position = 'relative';

        div.innerHTML = `
            <button type="button" class="remove-sign" style="position: absolute; right: 5px; top: 5px; background: none; border: none; color: var(--error); cursor: pointer;"><i class="fas fa-times"></i></button>
            <input type="file" class="sign-upload-input" accept="image/*" style="margin-bottom: 5px;">
            <input type="text" class="sign-label-input" placeholder="Authorized Signature (e.g. Director)" value="Authorized Signature">
        `;

        signaturesContainer.appendChild(div);

        // Event Listeners for new field
        div.querySelector('.sign-upload-input').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function (reg) {
                    e.target.dataset.preview = reg.target.result;
                    updateSignaturesPreview();
                    saveDesignState();
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
        div.querySelector('.sign-label-input').addEventListener('input', updateSignaturesPreview);
        div.querySelector('.remove-sign').addEventListener('click', () => {
            div.remove();
            updateSignaturesPreview();
        });
    }

    // --- Image Handlers ---
    function handleImageUpload(input, targetImg, isBackground = false) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                if (isBackground) {
                    preview.canvas.style.backgroundImage = `url(${e.target.result})`;
                    sessionStorage.setItem('cert_bg_base64', e.target.result);
                } else {
                    targetImg.src = e.target.result;
                    targetImg.style.display = 'block';
                    sessionStorage.setItem('cert_seal_base64', e.target.result);
                }
                saveDesignState();
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    // --- Event Listeners ---
    // Attach listeners to all standard inputs
    Object.values(inputs).forEach(input => {
        if (input) {
            const eventType = (input.type === 'text' || input.type === 'date' || input.type === 'color' || input.type === 'range') ? 'input' : 'change';
            input.addEventListener(eventType, updatePreview);
        }
    });

    // Initial Signature Input Setup
    document.querySelectorAll('.signature-entry').forEach(entry => {
        entry.querySelector('.sign-upload-input').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function (reg) {
                    e.target.dataset.preview = reg.target.result;
                    updateSignaturesPreview();
                    saveDesignState();
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
        entry.querySelector('.sign-label-input').addEventListener('input', updateSignaturesPreview);
    });

    addSignBtn.addEventListener('click', addSignatureField);

    // Specific Image Listeners
    inputs.bgUpload.addEventListener('change', () => handleImageUpload(inputs.bgUpload, null, true));
    inputs.sealUpload.addEventListener('change', () => handleImageUpload(inputs.sealUpload, preview.seal));

    // Initialize Preview and Restore saved data
    restoreDesignState();

    // --- Sharing Listeners ---
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const canvas = preview.canvas;
            try {
                const result = await html2canvas(canvas, {
                    useCORS: true,
                    scale: 2 // High quality
                });
                const link = document.createElement('a');
                link.download = `certificate-${Date.now()}.png`;
                link.href = result.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error("Download failed:", err);
                alert("Could not generate image. Please try again.");
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const link = resLink.href;
            navigator.clipboard.writeText(link).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => copyBtn.innerHTML = originalText, 2000);
            });
        });
    }

    // --- Issuance Logic ---
    issueBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Issuance started...");

        // UI Feedback
        resultModal.style.display = 'flex';
        resTitle.textContent = "Processing...";
        resMsg.textContent = "Hashing data and securing on blockchain...";
        resDetails.style.display = 'none';
        resLink.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (copyBtn) copyBtn.style.display = 'none';

        // Collect Signatures Labels for Metadata
        const signatureLabels = Array.from(signaturesContainer.querySelectorAll('.sign-label-input')).map(i => i.value);

        // Construct Payload
        const issuerName = localStorage.getItem('user_name') || 'Institution';
        const payload = {
            student_name: inputs.name.value,
            course: inputs.course.value,
            student_email: document.getElementById('studentEmail').value,
            date: inputs.date.value,
            issuer: issuerName,
            signatures: signatureLabels
        };

        console.log("Payload:", payload);

        try {
            const response = await fetch(`${API_URL}/certificate/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                // Success UI
                resTitle.textContent = "Certificate Secured!";
                resTitle.style.color = "var(--success)";
                resMsg.textContent = "Successfully mined on the blockchain ledger.";

                resDetails.style.display = 'block';
                resId.textContent = data.certificate_id;
                resTx.textContent = data.transaction_hash;

                // Generate Verification Link (Dynamic Host for Mobile Access)
                const currentHost = window.location.host;
                const verifyLink = `http://${currentHost}/verify.html?id=${data.certificate_id}`;
                console.log("Verify Link:", verifyLink);

                resLink.href = verifyLink;
                resLink.style.display = 'inline-block';
                if (downloadBtn) downloadBtn.style.display = 'block';
                if (copyBtn) copyBtn.style.display = 'inline-block';

                // Generate QR Code in the Preview
                if (inputs.qrPosition.value !== 'hide') {
                    preview.qr.innerHTML = "";
                    new QRCode(preview.qr, {
                        text: verifyLink,
                        width: 100,
                        height: 100,
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }

                // ALSO Generate QR Code in the Modal (Sticky for user)
                const modalQR = document.getElementById('modalQR');
                if (modalQR) {
                    modalQR.innerHTML = "";
                    new QRCode(modalQR, {
                        text: verifyLink,
                        width: 180,
                        height: 180,
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    console.log("Modal QR Code rendered.");
                }

                // Persist for reloads (Important for Live Server)
                const resultState = {
                    title: "Certificate Secured!",
                    msg: "Successfully mined on the blockchain ledger.",
                    id: data.certificate_id,
                    tx: data.transaction_hash,
                    link: verifyLink
                };
                sessionStorage.setItem('pending_issue_result', JSON.stringify(resultState));

            } else {
                console.error("Issuance failed:", data.detail);
                throw new Error(data.detail || "Submission failed");
            }
        } catch (err) {
            console.error(err);
            resTitle.textContent = "Error";
            resTitle.style.color = "var(--error)";
            resMsg.textContent = "Failed to issue certificate: " + err.message;
        }
    });

    // --- Restore Issuance Result on Reload ---
    const savedResult = sessionStorage.getItem('pending_issue_result');
    if (savedResult) {
        try {
            console.log("Restoring issuance result from session.");
            const data = JSON.parse(savedResult);

            resultModal.style.display = 'flex';
            resTitle.textContent = data.title;
            resTitle.style.color = "var(--success)";
            resMsg.textContent = data.msg;
            resDetails.style.display = 'block';
            resId.textContent = data.id;
            resTx.textContent = data.tx;
            resLink.href = data.link;
            resLink.style.display = 'inline-block';
            if (downloadBtn) downloadBtn.style.display = 'block';
            if (copyBtn) copyBtn.style.display = 'inline-block';

            const modalQR = document.getElementById('modalQR');
            if (modalQR) {
                modalQR.innerHTML = "";
                new QRCode(modalQR, {
                    text: data.link,
                    width: 180,
                    height: 180,
                    correctLevel: QRCode.CorrectLevel.H
                });
            }

            // ALSO Regenerate QR Code on the Certificate Preview itself
            if (inputs.qrPosition.value !== 'hide' && preview.qr) {
                preview.qr.innerHTML = "";
                new QRCode(preview.qr, {
                    text: data.link,
                    width: 100,
                    height: 100,
                    correctLevel: QRCode.CorrectLevel.H
                });
                console.log("Certificate Preview QR restored.");
            }
        } catch (e) {
            console.error("Failed to restore result modal:", e);
        }
    }

    function clearResultState() {
        sessionStorage.removeItem('pending_issue_result');
        const modal = document.getElementById('resultModal');
        if (modal) modal.style.display = 'none';
    }

    function saveDesignState() {
        const state = {
            fields: {},
            signatures: []
        };

        // Save standard text/color fields
        Object.keys(inputs).forEach(key => {
            if (inputs[key] && inputs[key].type !== 'file') {
                state.fields[key] = inputs[key].value;
            }
        });

        // Save dynamic signatures
        const entries = signaturesContainer.querySelectorAll('.signature-entry');
        entries.forEach(entry => {
            const labelInput = entry.querySelector('.sign-label-input');
            const fileInput = entry.querySelector('.sign-upload-input');
            state.signatures.push({
                label: labelInput.value,
                imageBase64: fileInput.dataset.preview || ""
            });
        });

        sessionStorage.setItem('cert_design_state', JSON.stringify(state));
    }

    function restoreDesignState() {
        const saved = sessionStorage.getItem('cert_design_state');
        isRestoring = true;

        // Restore non-file inputs first
        if (saved) {
            try {
                const state = JSON.parse(saved);
                Object.keys(state.fields).forEach(key => {
                    if (inputs[key]) {
                        inputs[key].value = state.fields[key];
                    }
                });

                // Re-create signatures
                if (state.signatures && state.signatures.length > 0) {
                    signaturesContainer.innerHTML = ""; // Clear existing
                    state.signatures.forEach(sig => {
                        addSignatureField();
                        const entries = signaturesContainer.querySelectorAll('.signature-entry');
                        const lastEntry = entries[entries.length - 1];
                        lastEntry.querySelector('.sign-label-input').value = sig.label;
                        if (sig.imageBase64) {
                            lastEntry.querySelector('.sign-upload-input').dataset.preview = sig.imageBase64;
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to restore design state:", e);
            }
        }

        // Restore static images (BG, Seal)
        const savedBG = sessionStorage.getItem('cert_bg_base64');
        if (savedBG) {
            preview.canvas.style.backgroundImage = `url(${savedBG})`;
        }
        const savedSeal = sessionStorage.getItem('cert_seal_base64');
        if (savedSeal) {
            preview.seal.src = savedSeal;
            preview.seal.style.display = 'block';
        }

        updatePreview();
        isRestoring = false;
    }

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Expose globally for HTML onclick handlers
    window.clearResultState = clearResultState;
});
