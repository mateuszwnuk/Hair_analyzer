const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
const SESSION_STORAGE_KEY = "hair-analyzer-session-id";

const form = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const fileList = document.getElementById("file-list");
const errorMessage = document.getElementById("error-message");
const submitButton = document.querySelector(".submit-button");
const toast = document.getElementById("toast");
const toastMessage = toast.querySelector(".toast-message");
const fileItemTemplate = document.getElementById("file-item-template");
const sessionLabel = document.getElementById("session-id");

let files = [];

const getSessionId = () => {
  const existingSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existingSession) {
    return existingSession;
  }

  const fallback = () =>
    `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  const newSession = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : fallback();

  window.localStorage.setItem(SESSION_STORAGE_KEY, newSession);
  return newSession;
};

const sessionId = getSessionId();

if (sessionLabel) {
  sessionLabel.textContent = sessionId;
}

const formatBytes = (bytes) => {
  const units = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
};

const showError = (message) => {
  errorMessage.textContent = message;
};

const clearError = () => {
  errorMessage.textContent = "";
};

const updateSubmitState = () => {
  submitButton.disabled = files.length === 0 || submitButton.dataset.loading;
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

const fileToPayload = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Nie udało się odczytać pliku."));
        return;
      }
      const base64 = result.split(",")[1];
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
      });
    };
    reader.onerror = () => reject(reader.error || new Error("Błąd odczytu."));
    reader.readAsDataURL(file);
  });

const toggleLoading = (isLoading) => {
  if (isLoading) {
    submitButton.dataset.loading = "true";
    submitButton.disabled = true;
    submitButton.textContent = "Przesyłanie...";
  } else {
    delete submitButton.dataset.loading;
    submitButton.textContent = "Prześlij";
    updateSubmitState();
  }
};

const uploadFiles = async () => {
  toggleLoading(true);
  clearError();

  try {
    const payloadFiles = await Promise.all(files.map(fileToPayload));
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, files: payloadFiles }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || "Nie udało się przesłać plików.");
    }

    files = [];
    renderFiles();
    updateSubmitState();
    showToast(
      `Przesłano ${payload?.files?.length || 0} plik(i). Możesz sprawdzić je w dashboardzie.`
    );
  } catch (error) {
    showError(error.message || "Wystąpił nieoczekiwany błąd.");
  } finally {
    toggleLoading(false);
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

  uploadFiles();
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
