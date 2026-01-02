// Check authentication
requireAuth();

// --- Elements ---
const issueBtn = document.getElementById('issueBtn');
const resultModal = document.getElementById('resultModal');
const resTitle = document.getElementById('resTitle');
const resMsg = document.getElementById('resMsg');
const resDetails = document.getElementById('resDetails');
const resLink = document.getElementById('resLink');
const resId = document.getElementById('resId');
const resTx = document.getElementById('resTx');

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
    bgUpload: document.getElementById('bgUpload'),
    borderStyle: document.getElementById('borderStyle'),
    borderColor: document.getElementById('borderColor'),

    // Typography
    titleColor: document.getElementById('titleColor'),
    fontFamily: document.getElementById('fontFamily'),
    textAlign: document.getElementById('textAlign'),

    // Visuals
    signUpload: document.getElementById('signUpload'),
    sealUpload: document.getElementById('sealUpload'),
    qrPosition: document.getElementById('qrPosition')
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
    sign: document.getElementById('pSign'),
    seal: document.getElementById('pSeal'),
    qr: document.getElementById('pQR')
};

// --- Live Preview Logic ---
function updatePreview() {
    // 1. Content Updates
    preview.student.textContent = inputs.name.value || '[Recipient Name]';
    preview.course.textContent = inputs.course.value || '[Course Name]';
    preview.date.textContent = inputs.date.value || '--/--/----';

    preview.title.textContent = inputs.title.value;
    preview.subtitle.textContent = inputs.subtitle.value;
    preview.body.textContent = inputs.body.value;

    // 2. Style Updates
    preview.canvas.style.backgroundColor = inputs.bgColor.value;

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

// --- Image Handlers ---
function handleImageUpload(input, targetImg, isBackground = false) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            if (isBackground) {
                preview.canvas.style.backgroundImage = `url(${e.target.result})`;
            } else {
                targetImg.src = e.target.result;
                targetImg.style.display = 'block';
            }
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// --- Event Listeners ---
// Attach listeners to all text/select inputs
Object.values(inputs).forEach(input => {
    if (input) { // Check if exists
        const eventType = (input.type === 'text' || input.type === 'date' || input.type === 'color') ? 'input' : 'change';
        input.addEventListener(eventType, updatePreview);
    }
});

// Specific Image Listeners
inputs.bgUpload.addEventListener('change', () => handleImageUpload(inputs.bgUpload, null, true));
inputs.signUpload.addEventListener('change', () => handleImageUpload(inputs.signUpload, preview.sign));
inputs.sealUpload.addEventListener('change', () => handleImageUpload(inputs.sealUpload, preview.seal));

// Initialize Preview
updatePreview();

// --- Elements for Sharing ---
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');

// --- Sharing Functions ---
async function downloadCertificate() {
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
}

function copyLink() {
    const link = resLink.href;
    navigator.clipboard.writeText(link).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => copyBtn.innerHTML = originalText, 2000);
    });
}

// Attach Sharing Listeners
if (downloadBtn) downloadBtn.addEventListener('click', downloadCertificate);
if (copyBtn) copyBtn.addEventListener('click', copyLink);

// --- Issuance Logic ---
issueBtn.addEventListener('click', async () => {
    // UI Feedback
    resultModal.style.display = 'flex';
    resTitle.textContent = "Processing...";
    resMsg.textContent = "Hashing data and securing on blockchain...";
    resDetails.style.display = 'none';
    resLink.style.display = 'none';
    downloadBtn.style.display = 'none';
    copyBtn.style.display = 'none';

    // Construct Payload
    const issuerName = localStorage.getItem('user_name') || 'Institution';
    const payload = {
        student_name: inputs.name.value,
        course: inputs.course.value,
        student_email: document.getElementById('studentEmail').value,
        date: inputs.date.value,
        issuer: issuerName
    };

    try {
        const response = await fetch('http://localhost:8000/certificate/issue', {
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

            // Generate Verification Link (Robust absolute path)
            const currentPath = window.location.pathname;
            const dirPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
            const verifyLink = `${window.location.origin}${dirPath}verify.html?id=${data.certificate_id}`;

            resLink.href = verifyLink;
            resLink.style.display = 'inline-block';
            downloadBtn.style.display = 'block';
            copyBtn.style.display = 'inline-block';

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
        } else {
            throw new Error(data.detail || "Submission failed");
        }
    } catch (err) {
        console.error(err);
        resTitle.textContent = "Error";
        resTitle.style.color = "var(--error)";
        resMsg.textContent = "Failed to issue certificate: " + err.message;
    }
});
