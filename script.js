const fileInput = document.querySelector("#source-image");
const downloadButton = document.querySelector("#download-button");
const resetButton = document.querySelector("#reset-button");
const statusText = document.querySelector("#status-text");
const emptyState = document.querySelector("#empty-state");
const canvas = document.querySelector("#preview-canvas");
const dropzone = document.querySelector(".dropzone");

const context = canvas.getContext("2d");

const state = {
  overlayImage: null,
  sourceImage: null,
  sourceObjectUrl: null,
  sourceFileName: "",
};

initialize();

async function initialize() {
  bindEvents();

  try {
    state.overlayImage = await loadImage("deactivated-account.png");
    setStatus("No image selected.");
  } catch (error) {
    console.error(error);
    setStatus("Overlay image could not be loaded.");
  }
}

function bindEvents() {
  fileInput.addEventListener("change", onFileChange);
  downloadButton.addEventListener("click", downloadComposite);
  resetButton.addEventListener("click", resetWorkspace);

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer?.files ?? [];

    if (file) {
      void loadSourceFile(file);
    }
  });
}

async function onFileChange(event) {
  const [file] = event.target.files ?? [];

  if (!file) {
    return;
  }

  await loadSourceFile(file);
}

async function loadSourceFile(file) {
  if (!file.type.startsWith("image/")) {
    setStatus("Choose an image file.");
    return;
  }

  if (!state.overlayImage) {
    setStatus("Overlay image is not ready.");
    return;
  }

  if (state.sourceObjectUrl) {
    URL.revokeObjectURL(state.sourceObjectUrl);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const sourceImage = await loadImage(objectUrl);
    state.sourceImage = sourceImage;
    state.sourceObjectUrl = objectUrl;
    state.sourceFileName = file.name.replace(/\.[^.]+$/, "") || "image";
    renderComposite();
    setStatus(file.name);
    emptyState.hidden = true;
    canvas.hidden = false;
    downloadButton.disabled = false;
    resetButton.disabled = false;
  } catch (error) {
    console.error(error);
    URL.revokeObjectURL(objectUrl);
    state.sourceObjectUrl = null;
    setStatus("Could not read image.");
  }
}

function renderComposite() {
  if (!state.sourceImage || !state.overlayImage) {
    return;
  }

  const { width, height } = state.sourceImage;
  canvas.width = width;
  canvas.height = height;

  context.clearRect(0, 0, width, height);
  context.drawImage(state.sourceImage, 0, 0, width, height);
  applyGrayscale(width, height);

  const overlayWidth = width;
  const overlayScale = overlayWidth / state.overlayImage.width;
  const overlayHeight = Math.round(state.overlayImage.height * overlayScale);
  const overlayX = 0;
  const overlayY = height - overlayHeight;

  context.drawImage(
    state.overlayImage,
    overlayX,
    overlayY,
    overlayWidth,
    overlayHeight
  );
}

function downloadComposite() {
  if (!state.sourceImage) {
    return;
  }

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        setStatus("Export failed.");
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${state.sourceFileName || "image"}-deactivated.png`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
      setStatus("Downloaded.");
    },
    "image/png",
    1
  );
}

function resetWorkspace() {
  if (state.sourceObjectUrl) {
    URL.revokeObjectURL(state.sourceObjectUrl);
  }

  state.sourceImage = null;
  state.sourceObjectUrl = null;
  state.sourceFileName = "";
  fileInput.value = "";
  context.clearRect(0, 0, canvas.width, canvas.height);
  canvas.hidden = true;
  emptyState.hidden = false;
  downloadButton.disabled = true;
  resetButton.disabled = true;
  setStatus("No image selected.");
}

function setStatus(message) {
  statusText.textContent = message;
}

function applyGrayscale(width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const grayscale = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);

    data[index] = grayscale;
    data[index + 1] = grayscale;
    data[index + 2] = grayscale;
  }

  context.putImageData(imageData, 0, 0);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${source}`));
    image.src = source;
  });
}