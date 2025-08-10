// Utility: detect likely URL
function isProbablyUrl(text) {
  const str = (text || "").trim();
  try {
    const u = new URL(str);
    return !!u.protocol && !!u.hostname;
  } catch {
    // Match http(s)://... or www.example.com
    return /^(https?:\/\/|www\.)/i.test(str);
  }
}

// Utility: classify content type for nicer UI
function classifyContent(text) {
  const t = (text || "").trim();

  // Wi-Fi (WIFI:T:WPA;S:MySSID;P:mypassword;;)
  if (/^WIFI:/i.test(t)) return { label: "Wi‑Fi config", key: "wifi" };
  // vCard/MeCard
  if (/^(BEGIN:VCARD|MECARD:)/i.test(t)) return { label: "Contact", key: "contact" };
  // URL
  if (isProbablyUrl(t)) return { label: "URL", key: "url" };
  // Email (basic)
  if (/^mailto:/i.test(t) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(t)) return { label: "Email", key: "email" };
  // Phone
  if (/^tel:/i.test(t) || /^\+?[0-9\s\-().]{7,}$/i.test(t)) return { label: "Phone", key: "phone" };
  // Geo
  if (/^geo:/i.test(t)) return { label: "Location", key: "geo" };
  // Calendar
  if (/^BEGIN:VEVENT/i.test(t)) return { label: "Event", key: "event" };

  return { label: "Text", key: "text" };
}

// UI references
const fileInput = document.getElementById('qr-input-file');
const clearBtn = document.getElementById('clear-btn');
const previewImg = document.getElementById('preview');
const statusEl = document.getElementById('status');
const resultBox = document.getElementById('result-box');
const decodedTextEl = document.getElementById('decoded-text');
const openBtn = document.getElementById('action-open');
const copyBtn = document.getElementById('action-copy');
const customBtn = document.getElementById('action-custom');
const actionBar = document.getElementById('action-bar');
const fileNameBadge = document.getElementById('file-name');
const contentTypeBadge = document.getElementById('content-type');

// Initialize html5-qrcode instance
const html5QrCode = new Html5Qrcode("reader");

let lastDecoded = "";

// Handle file selection
fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) {
    statusEl.textContent = "No file selected.";
    fileNameBadge.classList.add('hidden');
    return;
  }

  const imageFile = files[0];
  fileNameBadge.textContent = imageFile.name;
  fileNameBadge.classList.remove('hidden');

  // Show preview
  const objectUrl = URL.createObjectURL(imageFile);
  previewImg.src = objectUrl;
  previewImg.classList.remove('hidden');

  statusEl.textContent = "Scanning image for QR code...";

  try {
    const decoded = await html5QrCode.scanFile(imageFile, true);
    lastDecoded = decoded;
    decodedTextEl.textContent = decoded;
    resultBox.classList.remove('hidden');
    actionBar.classList.remove('hidden');

    const type = classifyContent(decoded);
    contentTypeBadge.textContent = `Type: ${type.label}`;
    contentTypeBadge.classList.remove('hidden');

    statusEl.textContent = "QR code found and decoded.";
  } catch (err) {
    resultBox.classList.add('hidden');
    actionBar.classList.add('hidden');
    decodedTextEl.textContent = "";
    contentTypeBadge.classList.add('hidden');
    statusEl.textContent = "No QR code found in the image, or decoding failed.";
    console.error(err);
  } finally {
    // Optional: revoke object URL after image loads to free memory
    previewImg.onload = () => URL.revokeObjectURL(objectUrl);
  }
});

// Actions
openBtn.addEventListener('click', () => {
  if (!lastDecoded) return;
  const text = lastDecoded.trim();
  if (isProbablyUrl(text)) {
    const url = text.startsWith('http') ? text : `https://${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    alert("Decoded content is not a URL.");
  }
});

copyBtn.addEventListener('click', async () => {
  if (!lastDecoded) return;
  try {
    await navigator.clipboard.writeText(lastDecoded);
    statusEl.textContent = "Copied decoded text to clipboard.";
  } catch {
    statusEl.textContent = "Unable to copy to clipboard.";
  }
});

// Example: custom action based on content pattern
customBtn.addEventListener('click', () => {
  if (!lastDecoded) return;

  const text = lastDecoded.trim();
  // Example rules
  if (isProbablyUrl(text) && /\/redeem\/[A-Za-z0-9\-_]+/.test(text)) {
    alert("Custom action: handle redeem flow for URL: " + text);
    return;
  }
  if (/^CODE-/.test(text)) {
    alert("Custom action: validate code " + text);
    return;
  }

  // You can branch based on classifyContent(text).key
  const typeKey = classifyContent(text).key;
  alert("No custom rule matched. Type: " + typeKey + ". Decoded content shown above.");
});

// Clear UI
clearBtn.addEventListener('click', () => {
  fileInput.value = "";
  previewImg.src = "";
  previewImg.classList.add('hidden');
  resultBox.classList.add('hidden');
  actionBar.classList.add('hidden');
  decodedTextEl.textContent = "";
  lastDecoded = "";
  fileNameBadge.classList.add('hidden');
  contentTypeBadge.classList.add('hidden');
  statusEl.textContent = "Select an image with a QR code.";
});

// Accessibility: keyboard focus visible for buttons
document.querySelectorAll('button, .file-pill').forEach(el => {
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && el.querySelector('input[type=file]')) {
      el.querySelector('input[type=file]').click();
    }
  });
});
