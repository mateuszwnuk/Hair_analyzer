// Globalne zmienne
let selectedFiles = [];
let currentTab = 'upload';
const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  initSessionId();
  initTabs();
  initDropZone();
  initForm();
  initMetadataForm();
  
  // Sprawdź hash URL dla przełączenia na odpowiednią kartę
  if (window.location.hash === '#gallery') {
    switchTab('gallery');
  }
});

function initSessionId() {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('sessionId', sessionId);
  }
  const sessionElement = document.getElementById('session-id');
  if (sessionElement) {
    sessionElement.textContent = sessionId;
  }
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Funkcje obsługi kart
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Aktualizuj przyciski
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Aktualizuj zawartość
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
  
  // Jeśli przełączamy na galerię, załaduj dane
  if (tabName === 'gallery') {
    loadGallery();
  }
  
  // Aktualizuj URL hash
  window.history.replaceState(null, null, tabName === 'upload' ? '#' : `#${tabName}`);
}

// Funkcje galerii (przeniesione z dashboard.js)
function loadGallery() {
  const sessionId = sessionStorage.getItem('sessionId');
  if (sessionId) {
    fetchUploads(sessionId);
  }
}

const formatDate = (value) => {
  if (!value) return "";
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
  if (!bytes && bytes !== 0) return "";
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
  const gallery = document.getElementById("session-gallery");
  const statusLabel = document.getElementById("dashboard-status");
  
  if (gallery) gallery.innerHTML = "";
  if (statusLabel) statusLabel.textContent = message;
  if (gallery) gallery.setAttribute("aria-busy", "false");
};

const renderGallery = (files) => {
  const gallery = document.getElementById("session-gallery");
  const galleryTemplate = document.getElementById("gallery-item-template");
  const statusLabel = document.getElementById("dashboard-status");
  
  if (!gallery || !galleryTemplate) return;
  
  gallery.innerHTML = "";
  gallery.setAttribute("aria-busy", "false");

  files.forEach((file) => {
    const clone = galleryTemplate.content.cloneNode(true);
    const image = clone.querySelector("img");
    const name = clone.querySelector(".file-name");
    const meta = clone.querySelector(".meta");
    const patientInfo = clone.querySelector(".patient-info");

    if (image) image.src = file.public_url;
    if (name) name.textContent = file.file_name;

    // Podstawowe metadane pliku
    const details = [];
    if (file.uploaded_at) details.push(formatDate(file.uploaded_at));
    if (file.size_bytes) details.push(formatSize(file.size_bytes));
    if (file.mime_type) details.push(file.mime_type);
    if (meta) meta.textContent = details.join(" • ");

    // Informacje o pacjencie
    if (patientInfo && file.metadata) {
      const metadata = file.metadata;
      let patientHtml = '';
      
      if (metadata.age) {
        patientHtml += `<div class="info-item"><span class="info-label">Wiek:</span> <span class="info-value">${metadata.age} lat</span></div>`;
      }
      if (metadata.gender) {
        const genderMap = { female: 'Kobieta', male: 'Mężczyzna', other: 'Inna' };
        patientHtml += `<div class="info-item"><span class="info-label">Płeć:</span> <span class="info-value">${genderMap[metadata.gender] || metadata.gender}</span></div>`;
      }
      if (metadata.problem) {
        const problemMap = {
          'hair-loss': 'Wypadanie włosów',
          'dandruff': 'Łupież',
          'seborrhea': 'Łojotok',
          'alopecia': 'Łysienie',
          'scalp-irritation': 'Podrażnienie skóry głowy',
          'other': 'Inny problem'
        };
        patientHtml += `<div class="info-item"><span class="info-label">Problem:</span> <span class="info-value">${problemMap[metadata.problem] || metadata.problem}</span></div>`;
      }
      
      patientInfo.innerHTML = patientHtml;
    }

    gallery.appendChild(clone);
  });
};

const fetchUploads = async (sessionId) => {
  const gallery = document.getElementById("session-gallery");
  const statusLabel = document.getElementById("dashboard-status");
  
  if (gallery) gallery.setAttribute("aria-busy", "true");
  if (statusLabel) statusLabel.textContent = "Ładowanie danych...";

  try {
    const response = await fetch(`/api/uploads?sessionId=${encodeURIComponent(sessionId)}`);
    const payload = await response.json().catch(() => null);

    let files = [];

    if (response.ok && Array.isArray(payload?.files)) {
      files = payload.files;
    } else {
      console.warn('API not available, using localStorage fallback');
      const localFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      files = localFiles.filter(file => file.session_id === sessionId);
    }

    if (files.length === 0) {
      renderEmptyState("Brak przesłanych plików w tej sesji.");
      return;
    }

    if (statusLabel) statusLabel.textContent = "";
    renderGallery(files);
  } catch (error) {
    console.error('Error fetching uploads:', error);
    
    try {
      const localFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      const sessionFiles = localFiles.filter(file => file.session_id === sessionId);
      
      if (sessionFiles.length > 0) {
        if (statusLabel) statusLabel.textContent = "Dane załadowane z pamięci lokalnej.";
        renderGallery(sessionFiles);
      } else {
        renderEmptyState("Brak przesłanych plików w tej sesji.");
      }
    } catch (localError) {
      renderEmptyState(error.message || "Wystąpił błąd podczas ładowania danych.");
    }
  }
};

// Inicjalizacja refresh button dla galerii
document.addEventListener('DOMContentLoaded', () => {
  const refreshButton = document.getElementById('refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      const sessionId = sessionStorage.getItem('sessionId');
      if (sessionId) fetchUploads(sessionId);
    });
  }
});

function initDropZone() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (!dropZone || !fileInput) return;

  // Kliknięcie w drop zone
  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  // Keyboard support
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
}

function handleFiles(files) {
  const fileArray = Array.from(files);
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) errorMessage.textContent = '';

  // Walidacja liczby plików
  if (selectedFiles.length + fileArray.length > MAX_FILES) {
    if (errorMessage) {
      errorMessage.textContent = `Możesz przesłać maksymalnie ${MAX_FILES} pliki.`;
    }
    return;
  }

  // Walidacja każdego pliku
  for (const file of fileArray) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      if (errorMessage) {
        errorMessage.textContent = 'Dozwolone są tylko pliki JPG i PNG.';
      }
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      if (errorMessage) {
        errorMessage.textContent = `Plik "${file.name}" przekracza limit 5 MB.`;
      }
      continue;
    }

    // Dodaj plik jeśli nie istnieje
    if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
      selectedFiles.push(file);
    }
  }

  updateFileList();
  updateSubmitButton();
}

function updateFileList() {
  const fileList = document.getElementById('file-list');
  const template = document.getElementById('file-item-template');
  const metadataForm = document.getElementById('metadata-form');
  
  if (!fileList || !template) return;
  
  fileList.innerHTML = '';

  selectedFiles.forEach((file, index) => {
    const clone = template.content.cloneNode(true);
    
    const fileName = clone.querySelector('.file-name');
    const fileSize = clone.querySelector('.file-size');
    const removeButton = clone.querySelector('.remove-button');
    
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    
    if (removeButton) {
      removeButton.addEventListener('click', () => removeFile(index));
    }
    
    fileList.appendChild(clone);
  });
  
  // Pokaż/ukryj formularz metatagów
  if (metadataForm) {
    metadataForm.style.display = selectedFiles.length > 0 ? 'block' : 'none';
  }
}

function initMetadataForm() {
  // Nie ma specjalnej inicjalizacji - formularz jest już w HTML
}

function getMetadata() {
  const age = document.getElementById('patient-age')?.value;
  const gender = document.getElementById('patient-gender')?.value;
  const problem = document.getElementById('patient-problem')?.value;
  
  const metadata = {};
  if (age) metadata.age = parseInt(age);
  if (gender) metadata.gender = gender;
  if (problem) metadata.problem = problem;
  
  return Object.keys(metadata).length > 0 ? metadata : null;
}

function clearMetadataForm() {
  const ageInput = document.getElementById('patient-age');
  const genderSelect = document.getElementById('patient-gender');
  const problemSelect = document.getElementById('patient-problem');
  
  if (ageInput) ageInput.value = '';
  if (genderSelect) genderSelect.value = '';
  if (problemSelect) problemSelect.value = '';
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
  updateSubmitButton();
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) errorMessage.textContent = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updateSubmitButton() {
  const submitButton = document.querySelector('.submit-button');
  if (submitButton) {
    submitButton.disabled = selectedFiles.length === 0;
  }
}

function initForm() {
  const form = document.getElementById('upload-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  
  if (selectedFiles.length === 0) {
    showToast('Wybierz przynajmniej jeden plik', 'error');
    return;
  }

  const formData = new FormData();
  selectedFiles.forEach(file => {
    formData.append('files', file);
  });

  // Dodaj metadane jako JSON
  const metadata = getMetadata();
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  const submitButton = document.querySelector('.submit-button');
  if (!submitButton) return;
  
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Przesyłanie...';

  try {
    const sessionId = sessionStorage.getItem('sessionId') || generateSessionId();
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
      },
      body: formData,
    });

    let result;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error('Nieprawidłowa odpowiedź serwera');
    }

    if (response.ok && result.success) {
      showToast('Zdjęcia zostały przesłane pomyślnie!', 'success');
      
      // Zapisz pliki do localStorage z session_id i metadanymi
      const existingFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      const filesWithSession = result.files.map(file => ({
        ...file,
        session_id: sessionId,
        metadata: metadata
      }));
      const allFiles = [...existingFiles, ...filesWithSession];
      localStorage.setItem('uploadedFiles', JSON.stringify(allFiles));
      
      // Wyczyść formularz
      selectedFiles = [];
      updateFileList();
      clearMetadataForm();
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
      // Automatycznie przełącz na kartę galerii
      setTimeout(() => {
        switchTab('gallery');
      }, 1000);
    } else {
      throw new Error(result.error || 'Nie udało się przesłać plików');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showToast(error.message || 'Wystąpił błąd podczas przesyłania', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const messageElement = toast?.querySelector('.toast-message');
  
  if (!toast || !messageElement) return;
  
  messageElement.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.hidden = false;
  
  setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}
