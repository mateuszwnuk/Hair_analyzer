// Globalne zmienne
let selectedFiles = [];
const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  initSessionId();
  initDropZone();
  initForm();
});

function initSessionId() {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('sessionId', sessionId);
  }
  document.getElementById('session-id').textContent = sessionId;
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function initDropZone() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

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
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
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
  errorMessage.textContent = '';

  // Walidacja liczby plików
  if (selectedFiles.length + fileArray.length > MAX_FILES) {
    errorMessage.textContent = `Możesz przesłać maksymalnie ${MAX_FILES} pliki.`;
    return;
  }

  // Walidacja każdego pliku
  for (const file of fileArray) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errorMessage.textContent = 'Dozwolone są tylko pliki JPG i PNG.';
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      errorMessage.textContent = `Plik "${file.name}" przekracza limit 5 MB.`;
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
  fileList.innerHTML = '';

  selectedFiles.forEach((file, index) => {
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.file-name').textContent = file.name;
    clone.querySelector('.file-size').textContent = formatFileSize(file.size);
    
    const removeButton = clone.querySelector('.remove-button');
    removeButton.addEventListener('click', () => removeFile(index));
    
    fileList.appendChild(clone);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
  updateSubmitButton();
  document.getElementById('error-message').textContent = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updateSubmitButton() {
  const submitButton = document.querySelector('.submit-button');
  submitButton.disabled = selectedFiles.length === 0;
}

function initForm() {
  const form = document.getElementById('upload-form');
  form.addEventListener('submit', handleFormSubmit);
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

  const submitButton = document.querySelector('.submit-button');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Przesyłanie...';

  try {
    const sessionId = sessionStorage.getItem('sessionId');
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
      },
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      showToast('Zdjęcia zostały przesłane pomyślnie!', 'success');
      
      // Zapisz URLs do localStorage
      const existingFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      const allFiles = [...existingFiles, ...result.files];
      localStorage.setItem('uploadedFiles', JSON.stringify(allFiles));
      
      // Wyczyść formularz
      selectedFiles = [];
      updateFileList();
      document.getElementById('file-input').value = '';
      
      // Przekieruj do dashboardu po 1.5s
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      showToast(result.error || 'Błąd podczas przesyłania', 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showToast('Błąd połączenia z serwerem', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = toast.querySelector('.toast-message');
  
  toastMessage.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.hidden = false;

  setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}
