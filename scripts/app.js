const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

const form = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const fileList = document.getElementById("file-list");
const errorMessage = document.getElementById("error-message");
const submitButton = document.querySelector(".submit-button");
const toast = document.getElementById("toast");
const toastMessage = toast.querySelector(".toast-message");
const fileItemTemplate = document.getElementById("file-item-template");

let files = [];

const formatBytes = (bytes) => {
  const units = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const showError = (message) => {
  errorMessage.textContent = message;
};

const clearError = () => {
  errorMessage.textContent = "";
};

const updateSubmitState = () => {
  submitButton.disabled = files.length === 0;
};

const renderFiles = () => {
  fileList.innerHTML = "";

  files.forEach((file, index) => {
    const clone = fileItemTemplate.content.cloneNode(true);
    clone.querySelector(".file-name").textContent = file.name;
    clone.querySelector(".file-size").textContent = formatBytes(file.size);

    const removeButton = clone.querySelector(".remove-button");
    removeButton.addEventListener("click", () => {
      files.splice(index, 1);
      renderFiles();
      updateSubmitState();
    });

    fileList.appendChild(clone);
  });
};

const validateFile = (file) => {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Dozwolone są tylko pliki JPG i PNG.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return `Plik ${file.name} przekracza limit 5 MB.`;
  }

  return null;
};

const addFiles = (newFiles) => {
  const availableSlots = MAX_FILES - files.length;

  if (availableSlots <= 0) {
    showError(`Możesz przesłać maksymalnie ${MAX_FILES} pliki.`);
    return;
  }

  const filesToAdd = Array.from(newFiles).slice(0, availableSlots);
  const errors = [];

  filesToAdd.forEach((file) => {
    const validationError = validateFile(file);
    if (validationError) {
      errors.push(validationError);
      return;
    }

    files.push(file);
  });

  if (errors.length > 0) {
    showError(errors[0]);
  } else {
    clearError();
  }

  renderFiles();
  updateSubmitState();
};

const handleDrop = (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");

  if (event.dataTransfer?.files) {
    addFiles(event.dataTransfer.files);
  }
};

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", handleDrop);

dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  fileInput.value = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (files.length === 0) {
    showError("Dodaj przynajmniej jeden plik.");
    return;
  }

  clearError();
  showToast(`${files.length} plik(i) gotowe do przesłania.`);
});

const showToast = (message) => {
  toastMessage.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.hidden = true;
      toastMessage.textContent = "";
    }, 300);
  }, 2500);
};
