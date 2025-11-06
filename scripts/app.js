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
  const sessionElement = document.getElementById('session-id');
  if (sessionElement) {
    sessionElement.textContent = sessionId;
  }
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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
      
      // Zapisz URLs do localStorage
      const existingFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      const allFiles = [...existingFiles, ...result.files];
      localStorage.setItem('uploadedFiles', JSON.stringify(allFiles));
      
      // Wyczyść formularz
      selectedFiles = [];
      updateFileList();
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
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
