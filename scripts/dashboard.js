const SESSION_STORAGE_KEY = "hair-analyzer-session-id";

const gallery = document.getElementById("session-gallery");
const statusLabel = document.getElementById("dashboard-status");
const sessionLabel = document.getElementById("session-id");
const refreshButton = document.getElementById("refresh-button");
const galleryTemplate = document.getElementById("gallery-item-template");

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const renderEmptyState = (message) => {
  gallery.innerHTML = "";
  statusLabel.textContent = message;
  gallery.setAttribute("aria-busy", "false");
};

const renderGallery = (files) => {
  gallery.innerHTML = "";
  gallery.setAttribute("aria-busy", "false");

  files.forEach((file) => {
    const clone = galleryTemplate.content.cloneNode(true);
    const image = clone.querySelector("img");
    const name = clone.querySelector(".file-name");
    const meta = clone.querySelector(".meta");

    image.src = file.public_url;
    name.textContent = file.file_name;

    const details = [];
    if (file.uploaded_at) {
      details.push(formatDate(file.uploaded_at));
    }
    if (file.size_bytes) {
      details.push(formatSize(file.size_bytes));
    }
    if (file.mime_type) {
      details.push(file.mime_type);
    }

    meta.textContent = details.join(" • ");

    gallery.appendChild(clone);
  });
};

const fetchUploads = async (sessionId) => {
  gallery.setAttribute("aria-busy", "true");
  statusLabel.textContent = "Ładowanie danych...";

  try {
    const response = await fetch(`/api/uploads?sessionId=${encodeURIComponent(sessionId)}`);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || "Nie udało się pobrać plików.");
    }

    if (!Array.isArray(payload?.files) || payload.files.length === 0) {
      renderEmptyState("Brak przesłanych plików w tej sesji.");
      return;
    }

    statusLabel.textContent = "";
    renderGallery(payload.files);
  } catch (error) {
    renderEmptyState(error.message || "Wystąpił błąd podczas ładowania danych.");
  }
};

const sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

if (!sessionId) {
  renderEmptyState(
    "Nie znaleziono aktywnej sesji. Wróć do formularza przesyłania, aby rozpocząć nową sesję."
  );
  refreshButton.disabled = true;
} else {
  sessionLabel.textContent = sessionId;
  fetchUploads(sessionId);
  refreshButton.addEventListener("click", () => fetchUploads(sessionId));
}
