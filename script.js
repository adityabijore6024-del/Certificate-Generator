

const $ = (id) => document.getElementById(id);

const templateInput = $("templateInput");
const participantsInput = $("participantsInput");
const templateName = $("templateName");
const participantsName = $("participantsName");
const participantSelect = $("participantSelect");

const fontFamily = $("fontFamily");
const fontSize = $("fontSize");
const fontSizeValue = $("fontSizeValue");
const textColor = $("textColor");

const boldBtn = $("boldBtn");
const italicBtn = $("italicBtn");
const centerBtn = $("centerBtn");
const resetBtn = $("resetBtn");

const previousBtn = $("previousBtn");
const nextBtn = $("nextBtn");
const currentParticipant = $("currentParticipant");

const downloadCurrentBtn = $("downloadCurrentBtn");
const downloadCurrentPdfBtn = $("downloadCurrentPdfBtn");
const generateBtn = $("generateBtn");
const downloadZipBtn = $("downloadZipBtn");
const downloadPngZipBtn = $("downloadPngZipBtn");

const progressBar = $("progressBar");
const progressText = $("progressText");
const status = $("status");

const loadingModal = $("loadingModal");
const loadingTitle = $("loadingTitle");
const loadingMessage = $("loadingMessage");
const modalProgressBar = $("modalProgressBar");

const emptyState = $("emptyState");
const canvasWrapper = $("canvasWrapper");
const canvasContainer = $("canvasContainer");

const zoomIn = $("zoomIn");
const zoomOut = $("zoomOut");
const zoomValue = $("zoomValue");

const canvas = new fabric.Canvas("certificateCanvas", {
  preserveObjectStacking: true,
  selection: false,
  stopContextMenu: true
});

let templateImage = null;
let backgroundObject = null;
let nameObject = null;

let participants = [];
let currentIndex = 0;
let canvasZoom = 1;
let dragging = false;
let dragStart = null;
let touchStart = null;
let spaceDown = false;

const defaultSettings = {
  fontFamily: "Arial",
  fontSize: 50,
  fill: "#111111",
  fontWeight: "normal",
  fontStyle: "normal"
};

function setStatus(message) {
  status.textContent = message;
}

function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeFilename(value) {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100) || "certificate";
}

function getSelectedText() {
  return nameObject || null;
}



templateInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select a PNG or JPG image.");
    return;
  }

  templateName.textContent = file.name;

  const url = URL.createObjectURL(file);

  try {
    await loadTemplate(url);
    emptyState.style.display = "none";
    setStatus("Template loaded");
  } catch (error) {
    console.error(error);
    alert("Could not load the certificate template.");
  } finally {
    URL.revokeObjectURL(url);
  }
});

function loadFabricImage(url) {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(url, image => {
      if (image) resolve(image);
      else reject(new Error("Image could not be loaded"));
    }, { crossOrigin: "anonymous" });
  });
}

async function loadTemplate(url) {
  const image = await loadFabricImage(url);

  templateImage = image;

  const maxWidth = 1500;
  const maxHeight = 1000;

  const scale = Math.min(
    maxWidth / image.width,
    maxHeight / image.height,
    1
  );

  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  canvas.clear();

  canvas.setDimensions({
    width,
    height
  });

  backgroundObject = new fabric.Image(image.getElement(), {
    left: 0,
    top: 0,
    scaleX: width / image.width,
    scaleY: height / image.height,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    hoverCursor: "default"
  });

  canvas.add(backgroundObject);
  canvas.sendToBack(backgroundObject);

  if (participants.length) {
    createNameObject(participants[currentIndex]);
  }

  canvas.renderAll();

  await wait(40);
  fitCertificateToWorkspace();
}



participantsInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  participantsName.textContent = file.name;

  try {
    const extension = file.name.split(".").pop().toLowerCase();

    if (extension === "csv") {
      participants = await parseCsv(file);
    } else if (extension === "xlsx" || extension === "xls") {
      participants = await parseExcel(file);
    } else {
      throw new Error("Unsupported file");
    }

    participants = participants
      .map(name => String(name ?? "").trim())
      .filter(Boolean);

    if (!participants.length) {
      throw new Error("No names found");
    }

    currentIndex = 0;
    populateParticipantSelect();
    updateCurrentParticipant();

    setStatus(`${participants.length} participants loaded`);
  } catch (error) {
    console.error(error);
    participants = [];
    participantSelect.innerHTML = "<option>No participants</option>";
    participantSelect.disabled = true;
    alert("No valid participant names were found.");
  }
});

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data || [];
        const names = rows.map(row => Array.isArray(row) ? row[0] : "");
        resolve(names);
      },
      error: reject
    });
  });
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const workbook = XLSX.read(
          new Uint8Array(event.target.result),
          { type: "array" }
        );

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        resolve(rows.map(row => row?.[0] ?? ""));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function populateParticipantSelect() {
  participantSelect.innerHTML = "";

  participants.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${index + 1}. ${name}`;
    participantSelect.appendChild(option);
  });

  participantSelect.disabled = false;
  participantSelect.value = currentIndex;
}

participantSelect.addEventListener("change", () => {
  currentIndex = Number(participantSelect.value);
  updateCurrentParticipant();
});

function updateCurrentParticipant() {
  if (!participants.length) {
    currentParticipant.textContent = "No participant selected";
    updateNavState();
    return;
  }

  const name = participants[currentIndex];

  currentParticipant.textContent = name;
  participantSelect.value = currentIndex;

  if (!templateImage) {
    updateNavState();
    return;
  }

  if (!nameObject) {
    createNameObject(name);
  } else {
    nameObject.set({
      text: String(name),
      scaleX: 1,
      scaleY: 1
    });

    canvas.setActiveObject(nameObject);
    canvas.renderAll();
  }

  syncControls();
  updateNavState();
}

function updateNavState() {
  const disabled = participants.length === 0;
  previousBtn.disabled = disabled;
  nextBtn.disabled = disabled;
}



function createNameObject(name) {
  if (nameObject) {
    canvas.remove(nameObject);
  }

  nameObject = new fabric.IText(String(name), {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",

    fontFamily: defaultSettings.fontFamily,
    fontSize: defaultSettings.fontSize,
    fill: defaultSettings.fill,
    fontWeight: defaultSettings.fontWeight,
    fontStyle: defaultSettings.fontStyle,

    editable: true,
    selectable: true,
    evented: true,

    padding: 8,
    transparentCorners: false,
    cornerStyle: "circle",
    cornerColor: "#5366e8",
    cornerStrokeColor: "#5366e8",
    borderColor: "#5366e8",
    lockRotation: false,

    minScaleLimit: 0.15
  });

  canvas.add(nameObject);
  canvas.bringToFront(nameObject);
  canvas.setActiveObject(nameObject);

  syncControls();
  canvas.renderAll();
}


canvas.on("object:added", event => {
  const object = event.target;

  if (object && object !== nameObject && object !== backgroundObject) {
    object.selectable = false;
    object.evented = false;
  }
});


canvas.on("object:moving", event => {
  const object = event.target;
  if (object !== nameObject) return;

  object.setCoords();

  const rect = object.getBoundingRect();
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  object.left = Math.max(
    halfW,
    Math.min(canvas.getWidth() - halfW, object.left)
  );

  object.top = Math.max(
    halfH,
    Math.min(canvas.getHeight() - halfH, object.top)
  );

  object.setCoords();
});


canvas.on("object:modified", event => {
  const object = event.target;

  if (object !== nameObject) return;

  if (object.scaleX !== 1 || object.scaleY !== 1) {
    const factor = Math.max(
      0.15,
      Math.min(object.scaleX, object.scaleY)
    );

    object.set({
      fontSize: Math.max(10, object.fontSize * factor),
      scaleX: 1,
      scaleY: 1
    });

    object.setCoords();
    syncControls();
  }

  canvas.renderAll();
});

canvas.on("selection:created", syncControls);
canvas.on("selection:updated", syncControls);

function syncControls() {
  if (!nameObject) return;

  fontFamily.value = nameObject.fontFamily || "Arial";

  const size = Math.round(nameObject.fontSize || 50);
  fontSize.value = size;
  fontSizeValue.textContent = size;

  const color = normalizeColor(nameObject.fill);
  textColor.value = color;
  updateColorPalette(color);

  boldBtn.classList.toggle("active", nameObject.fontWeight === "bold");
  italicBtn.classList.toggle("active", nameObject.fontStyle === "italic");
}

function normalizeColor(color) {
  if (!color) return "#111111";

  if (String(color).startsWith("#")) {
    return String(color).slice(0, 7);
  }

  const match = String(color).match(/\d+/g);

  if (match?.length >= 3) {
    return "#" + match.slice(0, 3)
      .map(v => Number(v).toString(16).padStart(2, "0"))
      .join("");
  }

  return "#111111";
}



fontFamily.addEventListener("change", () => {
  if (!nameObject) return;

  nameObject.set("fontFamily", fontFamily.value);
  nameObject.setCoords();
  canvas.renderAll();
});

fontSize.addEventListener("input", () => {
  if (!nameObject) return;

  const value = Number(fontSize.value);

  nameObject.set({
    fontSize: value,
    scaleX: 1,
    scaleY: 1
  });

  fontSizeValue.textContent = value;
  nameObject.setCoords();
  canvas.renderAll();
});

function applyColor(color) {
  if (!nameObject) return;

  nameObject.set("fill", color);
  textColor.value = color;
  updateColorPalette(color);

  canvas.setActiveObject(nameObject);
  canvas.renderAll();
}

textColor.addEventListener("input", () => {
  applyColor(textColor.value);
});

document.querySelectorAll(".color-swatch").forEach(swatch => {
  swatch.addEventListener("click", () => {
    applyColor(swatch.dataset.color);
  });
});

function updateColorPalette(color) {
  const normalized = normalizeColor(color);

  document.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.classList.toggle(
      "active",
      normalizeColor(swatch.dataset.color) === normalized
    );
  });
}

boldBtn.addEventListener("click", () => {
  if (!nameObject) return;

  nameObject.set(
    "fontWeight",
    nameObject.fontWeight === "bold" ? "normal" : "bold"
  );

  syncControls();
  canvas.renderAll();
});

italicBtn.addEventListener("click", () => {
  if (!nameObject) return;

  nameObject.set(
    "fontStyle",
    nameObject.fontStyle === "italic" ? "normal" : "italic"
  );

  syncControls();
  canvas.renderAll();
});

centerBtn.addEventListener("click", () => {
  if (!nameObject) return;

  nameObject.set({
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });

  nameObject.setCoords();
  canvas.setActiveObject(nameObject);
  canvas.renderAll();
});

resetBtn.addEventListener("click", () => {
  if (!nameObject) return;

  nameObject.set({
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    scaleX: 1,
    scaleY: 1,
    fontFamily: "Arial",
    fontSize: 50,
    fill: "#111111",
    fontWeight: "normal",
    fontStyle: "normal"
  });

  syncControls();
  canvas.setActiveObject(nameObject);
  canvas.renderAll();
});



previousBtn.addEventListener("click", () => {
  if (!participants.length) return;

  currentIndex =
    currentIndex <= 0
      ? participants.length - 1
      : currentIndex - 1;

  updateCurrentParticipant();
});

nextBtn.addEventListener("click", () => {
  if (!participants.length) return;

  currentIndex =
    currentIndex >= participants.length - 1
      ? 0
      : currentIndex + 1;

  updateCurrentParticipant();
});



// Fit the certificate when the editor size changes.
function fitCertificateToWorkspace() {
  if (!templateImage) return;

  const availableWidth = Math.max(100, canvasWrapper.clientWidth - 36);
  const availableHeight = Math.max(100, canvasWrapper.clientHeight - 36);
  const width = canvas.getWidth();
  const height = canvas.getHeight();

  if (!width || !height) return;

  const zoom = Math.min(availableWidth / width, availableHeight / height, 1);
  canvasZoom = Math.max(0.1, Math.min(zoom, 1));
  canvas.setViewportTransform([canvasZoom, 0, 0, canvasZoom, 0, 0]);
  updateZoomDisplay();
  canvas.renderAll();
}

function updateZoomDisplay() {
  zoomValue.textContent = `${Math.round(canvasZoom * 100)}%`;
}

function zoomAt(point, amount) {
  if (!templateImage) return;

  const next = Math.max(0.1, Math.min(4, amount));
  canvas.zoomToPoint(point, next);
  canvasZoom = next;
  updateZoomDisplay();
  canvas.renderAll();
}

zoomIn.addEventListener("click", () => {
  zoomAt(new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2), canvasZoom * 1.15);
});

zoomOut.addEventListener("click", () => {
  zoomAt(new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2), canvasZoom / 1.15);
});

canvas.on("mouse:wheel", event => {
  if (!templateImage) return;

  const e = event.e;
  const next = canvasZoom * (e.deltaY > 0 ? 0.9 : 1.1);
  zoomAt(new fabric.Point(e.offsetX, e.offsetY), next);
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener("keydown", event => {
  if (event.code === "Space" && !event.target.matches("input, textarea, select, button")) {
    spaceDown = true;
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => {
  if (event.code === "Space") spaceDown = false;
});

const upperCanvas = canvas.upperCanvasEl;

upperCanvas.addEventListener("mousedown", event => {
  if (!spaceDown || !templateImage) return;

  dragging = true;
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    left: canvas.viewportTransform[4],
    top: canvas.viewportTransform[5]
  };
  upperCanvas.style.cursor = "grabbing";
  event.preventDefault();
});

window.addEventListener("mousemove", event => {
  if (!dragging || !dragStart) return;

  const vpt = canvas.viewportTransform;
  vpt[4] = dragStart.left + event.clientX - dragStart.x;
  vpt[5] = dragStart.top + event.clientY - dragStart.y;
  canvas.setViewportTransform(vpt);
});

window.addEventListener("mouseup", () => {
  dragging = false;
  dragStart = null;
  upperCanvas.style.cursor = spaceDown ? "grab" : "default";
});

upperCanvas.addEventListener("touchstart", event => {
  if (event.touches.length !== 2 || !templateImage) return;

  const a = event.touches[0];
  const b = event.touches[1];
  const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  const rect = upperCanvas.getBoundingClientRect();

  touchStart = {
    distance,
    zoom: canvasZoom,
    centerX: ((a.clientX + b.clientX) / 2) - rect.left,
    centerY: ((a.clientY + b.clientY) / 2) - rect.top,
    left: canvas.viewportTransform[4],
    top: canvas.viewportTransform[5]
  };
  event.preventDefault();
}, { passive: false });

upperCanvas.addEventListener("touchmove", event => {
  if (event.touches.length !== 2 || !touchStart) return;

  const a = event.touches[0];
  const b = event.touches[1];
  const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  const rect = upperCanvas.getBoundingClientRect();
  const centerX = ((a.clientX + b.clientX) / 2) - rect.left;
  const centerY = ((a.clientY + b.clientY) / 2) - rect.top;
  const nextZoom = Math.max(0.1, Math.min(4, touchStart.zoom * distance / touchStart.distance));

  canvas.setZoom(nextZoom);
  const vpt = canvas.viewportTransform;
  vpt[4] = centerX - (touchStart.centerX - touchStart.left) * (nextZoom / touchStart.zoom);
  vpt[5] = centerY - (touchStart.centerY - touchStart.top) * (nextZoom / touchStart.zoom);
  canvas.setViewportTransform(vpt);
  canvasZoom = nextZoom;
  updateZoomDisplay();
  canvas.renderAll();
  event.preventDefault();
}, { passive: false });

upperCanvas.addEventListener("touchend", event => {
  if (event.touches.length < 2) touchStart = null;
}, { passive: true });

let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    fitCertificateToWorkspace();
  }, 120);
});



function validateExport() {
  if (!templateImage) {
    alert("Upload the certificate template first.");
    return false;
  }

  if (!participants.length) {
    alert("Upload the participant CSV/XLSX first.");
    return false;
  }

  if (!nameObject) {
    alert("There is no editable name on the certificate.");
    return false;
  }

  return true;
}


function renderParticipantToDataUrl(name) {
  const oldText = nameObject.text;
  const wasActive = canvas.getActiveObject() === nameObject;

  nameObject.set({
    text: String(name)
  });

  const oldView = canvas.viewportTransform.slice();

  canvas.discardActiveObject();
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    multiplier: 2
  });

  nameObject.set({ text: oldText });
  canvas.setViewportTransform(oldView);

  if (wasActive) canvas.setActiveObject(nameObject);

  canvas.renderAll();

  return dataUrl;
}

function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] || "image/png";

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

function dataUrlToBase64(dataUrl) {
  return dataUrl.split(",")[1];
}

function createPdfBlobFromImage(dataUrl) {
  const { jsPDF } = window.jspdf;

  const landscape = canvas.getWidth() >= canvas.getHeight();

  const pdf = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.getWidth(), canvas.getHeight()],
    compress: true
  });

  pdf.addImage(
    dataUrl,
    "PNG",
    0,
    0,
    canvas.getWidth(),
    canvas.getHeight(),
    undefined,
    "FAST"
  );

  return pdf.output("blob");
}

function downloadBlob(blob, filename) {
  saveAs(blob, filename);
}



downloadCurrentBtn.addEventListener("click", () => {
  if (!validateExport()) return;

  const name = participants[currentIndex];
  const dataUrl = renderParticipantToDataUrl(name);

  downloadDataUrl(
    dataUrl,
    `${safeFilename(name)}-certificate.png`
  );

  setStatus("Current PNG downloaded");
});



downloadCurrentPdfBtn.addEventListener("click", () => {
  if (!validateExport()) return;

  const name = participants[currentIndex];
  const dataUrl = renderParticipantToDataUrl(name);
  const blob = createPdfBlobFromImage(dataUrl);

  downloadBlob(
    blob,
    `${safeFilename(name)}-certificate.pdf`
  );

  setStatus("Current PDF downloaded");
});

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}



function setProgress(current, total) {
  const percent = total
    ? Math.round((current / total) * 100)
    : 0;

  progressBar.style.width = `${percent}%`;
  modalProgressBar.style.width = `${percent}%`;
  progressText.textContent = `${current} / ${total}`;
}



function showModal(title, message) {
  loadingTitle.textContent = title;
  loadingMessage.textContent = message;
  setProgress(0, participants.length);
  loadingModal.classList.remove("hidden");
}

function hideModal() {
  loadingModal.classList.add("hidden");
}





async function buildZip(type) {
  const zip = new JSZip();
  const folder = zip.folder(
    type === "pdf" ? "certificates-pdf" : "certificates-png"
  );

  for (let i = 0; i < participants.length; i++) {
    const name = participants[i];

    loadingMessage.textContent =
      `Preparing ${i + 1} of ${participants.length}: ${name}`;

    setProgress(i, participants.length);

    const dataUrl = renderParticipantToDataUrl(name);

    if (type === "pdf") {
      const pdfBlob = createPdfBlobFromImage(dataUrl);
      folder.file(
        `${safeFilename(name)}-certificate.pdf`,
        pdfBlob
      );
    } else {
      folder.file(
        `${safeFilename(name)}-certificate.png`,
        dataUrlToBase64(dataUrl),
        { base64: true }
      );
    }

    
    if (i % 3 === 0) {
      await wait(0);
    }

    setProgress(i + 1, participants.length);
  }

  loadingMessage.textContent = "Packing files into ZIP...";

  return zip.generateAsync(
    {
      type: "blob",
      compression: "STORE",
      streamFiles: true
    },
    metadata => {
      if (metadata && typeof metadata.percent === "number") {
        modalProgressBar.style.width =
          `${Math.round(metadata.percent)}%`;
      }
    }
  );
}



downloadZipBtn.addEventListener("click", async () => {
  if (!validateExport()) return;

  showModal(
    "Creating individual PDFs",
    "Preparing the certificates..."
  );

  try {
    const blob = await buildZip("pdf");

    saveAs(blob, "certificates-individual-pdfs.zip");

    setStatus("Individual PDF ZIP downloaded");
  } catch (error) {
    console.error(error);
    alert(
      "The batch export failed. Try a smaller batch or check the browser console."
    );
    setStatus("Export failed");
  } finally {
    hideModal();
  }
});



downloadPngZipBtn.addEventListener("click", async () => {
  if (!validateExport()) return;

  showModal(
    "Creating PNG ZIP",
    "Preparing the certificates..."
  );

  try {
    const blob = await buildZip("png");

    saveAs(blob, "certificates-png.zip");

    setStatus("PNG ZIP downloaded");
  } catch (error) {
    console.error(error);
    alert("The PNG batch export failed.");
    setStatus("Export failed");
  } finally {
    hideModal();
  }
});



const combinedPdfBtn = $("combinedPdfBtn");

combinedPdfBtn.addEventListener("click", async () => {
  if (!validateExport()) return;

  showModal(
    "Creating one PDF",
    "Preparing the certificates..."
  );

  try {
    const { jsPDF } = window.jspdf;

    const landscape = canvas.getWidth() >= canvas.getHeight();

    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.getWidth(), canvas.getHeight()],
      compress: true
    });

    for (let i = 0; i < participants.length; i++) {
      const name = participants[i];

      loadingMessage.textContent =
        `Adding ${i + 1} of ${participants.length}: ${name}`;

      const dataUrl = renderParticipantToDataUrl(name);

      if (i > 0) {
        pdf.addPage(
          [canvas.getWidth(), canvas.getHeight()],
          landscape ? "landscape" : "portrait"
        );
      }

      pdf.addImage(
        dataUrl,
        "PNG",
        0,
        0,
        canvas.getWidth(),
        canvas.getHeight(),
        undefined,
        "FAST"
      );

      setProgress(i + 1, participants.length);

      // Keeps the interface responsive during large batches.
      if (i % 3 === 0) {
        await wait(0);
      }
    }

    loadingMessage.textContent = "Saving the combined PDF...";

    const blob = pdf.output("blob");

    saveAs(blob, "all-certificates-single-pdf.pdf");

    setStatus(`${participants.length} certificates saved in one PDF`);
  } catch (error) {
    console.error(error);
    alert(
      "The combined PDF could not be created. Try a smaller batch or check the browser console."
    );
    setStatus("PDF export failed");
  } finally {
    hideModal();
  }
});



updateNavState();
updateZoomDisplay();
