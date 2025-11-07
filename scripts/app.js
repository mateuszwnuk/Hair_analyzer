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

const renderCaseGallery = (cases) => {
  const gallery = document.getElementById("session-gallery");
  const statusLabel = document.getElementById("dashboard-status");
  
  if (!gallery) return;
  
  gallery.innerHTML = "";
  gallery.setAttribute("aria-busy", "false");
  
  console.log('Rendering case gallery:', cases);
  
  cases.forEach((caseItem) => {
    const caseCard = document.createElement('div');
    caseCard.className = 'case-card';
    
    // Nagłówek case'a z metadanymi
    const caseHeader = document.createElement('div');
    caseHeader.className = 'case-header';
    
    let headerHtml = `<h3>Case ${formatDate(caseItem.uploaded_at)}</h3>`;
    if (caseItem.metadata) {
      const metadata = caseItem.metadata;
      const metaParts = [];
      if (metadata.age) metaParts.push(`${metadata.age} lat`);
      if (metadata.gender) {
        const genderMap = { female: 'Kobieta', male: 'Mężczyzna', other: 'Inna' };
        metaParts.push(genderMap[metadata.gender] || metadata.gender);
      }
      if (metadata.problem) metaParts.push(metadata.problem);
      if (metaParts.length > 0) {
        headerHtml += `<p class="case-metadata">${metaParts.join(' • ')}</p>`;
      }
    }
    caseHeader.innerHTML = headerHtml;
    
    // Siatka zdjęć
    const imagesGrid = document.createElement('div');
    imagesGrid.className = 'case-images-grid';
    
    caseItem.images.forEach((image, index) => {
      const imageCard = document.createElement('div');
      imageCard.className = 'case-image-item';
      
      const img = document.createElement('img');
      img.src = image.public_url;
      img.alt = `Zdjęcie ${index + 1}`;
      img.loading = 'lazy';
      
      const caption = document.createElement('p');
      caption.className = 'image-caption';
      caption.textContent = `Zdjęcie ${index + 1}`;
      
      imageCard.appendChild(img);
      imageCard.appendChild(caption);
      imagesGrid.appendChild(imageCard);
    });
    
    // Przycisk analizy AI
    const analyzeButton = document.createElement('button');
    analyzeButton.className = 'analyze-ai-button';
    analyzeButton.innerHTML = `
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      Analizuj AI (${caseItem.images.length} ${caseItem.images.length === 1 ? 'zdjęcie' : 'zdjęcia'})
    `;
    
    analyzeButton.addEventListener('click', () => {
      analyzeCaseImages(caseItem);
    });
    
    caseCard.appendChild(caseHeader);
    caseCard.appendChild(imagesGrid);
    caseCard.appendChild(analyzeButton);
    gallery.appendChild(caseCard);
  });
};

const renderGallery = (files) => {
  const gallery = document.getElementById("session-gallery");
  const galleryTemplate = document.getElementById("gallery-item-template");
  const statusLabel = document.getElementById("dashboard-status");
  
  if (!gallery || !galleryTemplate) return;
  
  gallery.innerHTML = "";
  gallery.setAttribute("aria-busy", "false");

  console.log('Rendering gallery with files:', files); // Debug log

  files.forEach((file) => {
    console.log('Processing file:', file.file_name, 'with metadata:', file.metadata); // Debug log
    
    const clone = galleryTemplate.content.cloneNode(true);
    const image = clone.querySelector("img");
    const name = clone.querySelector(".file-name");
    const meta = clone.querySelector(".meta");
    const patientInfo = clone.querySelector(".patient-info");
    const analyzeButton = clone.querySelector(".analyze-ai-button");
    const aiResultDiv = clone.querySelector(".ai-result");

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
        patientHtml += `<div class="info-item"><span class="info-label">Problem:</span> <span class="info-value">${metadata.problem}</span></div>`;
      }
      
      patientInfo.innerHTML = patientHtml;
      console.log('Patient info HTML:', patientHtml); // Debug log
    } else {
      console.log('No metadata found for file:', file.file_name); // Debug log
      if (patientInfo) {
        patientInfo.innerHTML = '<div class="info-item"><span class="info-label">Brak metadanych</span></div>';
      }
    }
    
    // Obsługa przycisku analizy AI
    if (analyzeButton) {
      const fileId = file.id || file.public_url;
      
      // Sprawdź czy już istnieje analiza
      const existingAnalysis = getAnalysisFromStorage(fileId);
      if (existingAnalysis && aiResultDiv) {
        aiResultDiv.style.display = 'block';
        aiResultDiv.className = 'ai-result success';
        aiResultDiv.innerHTML = `
          <div class="ai-result-title">✅ ${existingAnalysis.problem}</div>
          <div class="ai-result-text">Stopień: ${existingAnalysis.severity} | Pewność: ${existingAnalysis.confidence}%</div>
        `;
        analyzeButton.innerHTML = `
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          Zobacz analizę
        `;
      }
      
      analyzeButton.addEventListener('click', () => {
        if (existingAnalysis) {
          // Pokaż istniejącą analizę
          openAIModal();
          showAnalysisResults(existingAnalysis);
        } else {
          // Wykonaj nową analizę
          analyzeButton.disabled = true;
          analyzeButton.textContent = 'Analizuję...';
          
          analyzeImage(file.public_url, file.metadata, fileId)
            .finally(() => {
              analyzeButton.disabled = false;
            });
        }
      });
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

    let cases = [];
    let files = [];

    if (response.ok && payload) {
      // Sprawdź czy API zwraca nowy format z case'ami
      if (Array.isArray(payload?.cases)) {
        cases = payload.cases;
      }
      // Fallback do starszego formatu
      if (Array.isArray(payload?.files)) {
        files = payload.files;
      }
    } else {
      console.warn('API not available, using localStorage fallback');
      const localFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      files = localFiles.filter(file => file.session_id === sessionId);
    }

    // Jeśli mamy case'y, renderuj je
    if (cases.length > 0) {
      if (statusLabel) statusLabel.textContent = "";
      renderCaseGallery(cases);
      return;
    }

    // Fallback do starszej wersji
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
  
  // Inicjalizacja modala AI
  initAIModal();
});

// ====== FUNKCJE ANALIZY AI ======

function initAIModal() {
  const modal = document.getElementById('ai-modal');
  if (!modal) return;
  
  const closeBtn = modal.querySelector('.modal-close');
  const overlay = modal.querySelector('.modal-overlay');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeAIModal());
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => closeAIModal());
  }
  
  // ESC key zamyka modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      closeAIModal();
    }
  });
}

function openAIModal() {
  const modal = document.getElementById('ai-modal');
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
}

function closeAIModal() {
  const modal = document.getElementById('ai-modal');
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
}

function showLoadingState() {
  const modal = document.getElementById('ai-modal');
  if (!modal) return;
  
  const loadingState = modal.querySelector('.loading-state');
  const resultsDiv = modal.querySelector('.analysis-results');
  
  if (loadingState) loadingState.style.display = 'flex';
  if (resultsDiv) {
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
  }
}

function showAnalysisResults(analysis) {
  const modal = document.getElementById('ai-modal');
  if (!modal) return;
  
  const loadingState = modal.querySelector('.loading-state');
  const resultsDiv = modal.querySelector('.analysis-results');
  
  if (loadingState) loadingState.style.display = 'none';
  if (!resultsDiv) return;
  
  resultsDiv.style.display = 'block';
  
  // Generuj HTML wyników
  const html = `
    <div class="analysis-card">
      <h3>
        📋 Diagnoza
        <span class="severity-badge severity-${analysis.severity}">${analysis.severity}</span>
      </h3>
      <div class="analysis-problem">
        <strong>${analysis.problem}</strong> (${analysis.problemCategory})
      </div>
      <div style="margin-top: 0.5rem;">
        <small style="color: var(--muted-color);">Pewność: ${analysis.confidence}%</small>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${analysis.confidence}%"></div>
        </div>
      </div>
    </div>

    <div class="analysis-card">
      <h3>🔍 Szczegółowa analiza</h3>
      <p class="detailed-text">${analysis.detailedAnalysis}</p>
    </div>

    ${analysis.symptoms && analysis.symptoms.length > 0 ? `
    <div class="analysis-card">
      <h3>⚠️ Zaobserwowane objawy</h3>
      <ul class="analysis-list">
        ${analysis.symptoms.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${analysis.possibleCauses && analysis.possibleCauses.length > 0 ? `
    <div class="analysis-card">
      <h3>🧬 Możliwe przyczyny</h3>
      <ul class="analysis-list">
        ${analysis.possibleCauses.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${analysis.recommendations && analysis.recommendations.length > 0 ? `
    <div class="analysis-card">
      <h3>💡 Rekomendacje</h3>
      <ul class="analysis-list">
        ${analysis.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${analysis.nextSteps && analysis.nextSteps.length > 0 ? `
    <div class="analysis-card">
      <h3>👣 Następne kroki</h3>
      <ul class="analysis-list">
        ${analysis.nextSteps.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="disclaimer">
      <strong>⚕️ Ważna informacja:</strong> Ta analiza jest narzędziem pomocniczym i nie zastępuje profesjonalnej konsultacji medycznej. 
      W przypadku problemów ze skórą głowy zalecamy wizytę u dermatologa lub trycholog.
    </div>
  `;
  
  resultsDiv.innerHTML = html;
}

// Funkcje AI
async function analyzeCaseImages(caseItem) {
  console.log('Starting AI analysis for case:', caseItem.case_id);
  
  try {
    openAIModal();
    showLoadingState();
    
    // Przygotuj tablicę URLi zdjęć
    const imageUrls = caseItem.images.map(img => img.public_url);
    
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrls: imageUrls, // Tablica URLi zamiast pojedynczego
        metadata: caseItem.metadata,
        isMultiImage: true
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Błąd podczas analizy');
    }

    if (!result.success || !result.analysis) {
      throw new Error('Nieprawidłowa odpowiedź serwera');
    }

    console.log('Analysis completed:', result.analysis);
    
    // Pokaż wyniki
    showAnalysisResults(result.analysis);
    
    // Zapisz analizę dla całego case'a
    saveAnalysisToStorage(caseItem.case_id, result.analysis);
    
    return result.analysis;
    
  } catch (error) {
    console.error('Analysis error:', error);
    
    const modal = document.getElementById('ai-modal');
    if (modal) {
      const content = modal.querySelector('.modal-content');
      if (content) {
        content.innerHTML = `
          <div class="analysis-error">
            <h2>❌ Błąd analizy</h2>
            <p>${error.message}</p>
            <button class="close-modal-button" onclick="closeAIModal()">Zamknij</button>
          </div>
        `;
      }
    }
    
    throw error;
  }
}

async function analyzeImage(imageUrl, metadata, fileId) {
  console.log('Starting AI analysis for:', imageUrl);
  
  try {
    openAIModal();
    showLoadingState();
    
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        metadata: metadata
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Błąd podczas analizy');
    }

    if (!result.success || !result.analysis) {
      throw new Error('Nieprawidłowa odpowiedź serwera');
    }

    console.log('Analysis completed:', result.analysis);
    
    // Pokaż wyniki
    showAnalysisResults(result.analysis);
    
    // Zapisz analizę
    saveAnalysisToStorage(fileId, result.analysis);
    
    // Zaktualizuj UI w galerii
    updateGalleryItemWithAnalysis(fileId, result.analysis);
    
    return result.analysis;
    
  } catch (error) {
    console.error('Analysis error:', error);
    
    const modal = document.getElementById('ai-modal');
    if (modal) {
      const loadingState = modal.querySelector('.loading-state');
      const resultsDiv = modal.querySelector('.analysis-results');
      
      if (loadingState) loadingState.style.display = 'none';
      if (resultsDiv) {
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
          <div class="analysis-card" style="background: #fef2f2; border-left: 3px solid var(--error-color);">
            <h3 style="color: var(--error-color);">❌ Błąd analizy</h3>
            <p>${error.message}</p>
            <p style="font-size: 0.85rem; color: var(--muted-color); margin-top: 0.5rem;">
              Spróbuj ponownie za chwilę. Jeśli problem się powtarza, skontaktuj się z administratorem.
            </p>
          </div>
        `;
      }
    }
    
    return null;
  }
}

function saveAnalysisToStorage(fileId, analysis) {
  try {
    const analyses = JSON.parse(localStorage.getItem('aiAnalyses') || '{}');
    analyses[fileId] = {
      ...analysis,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('aiAnalyses', JSON.stringify(analyses));
    console.log('Analysis saved to localStorage');
  } catch (error) {
    console.error('Failed to save analysis:', error);
  }
}

function getAnalysisFromStorage(fileId) {
  try {
    const analyses = JSON.parse(localStorage.getItem('aiAnalyses') || '{}');
    return analyses[fileId] || null;
  } catch (error) {
    console.error('Failed to get analysis:', error);
    return null;
  }
}

function updateGalleryItemWithAnalysis(fileId, analysis) {
  // Znajdź element w galerii i zaktualizuj
  const galleryItems = document.querySelectorAll('.gallery-item');
  galleryItems.forEach(item => {
    const img = item.querySelector('img');
    if (img && img.src.includes(fileId)) {
      const resultDiv = item.querySelector('.ai-result');
      const button = item.querySelector('.analyze-ai-button');
      
      if (resultDiv && button) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'ai-result success';
        resultDiv.innerHTML = `
          <div class="ai-result-title">✅ ${analysis.problem}</div>
          <div class="ai-result-text">Stopień: ${analysis.severity} | Pewność: ${analysis.confidence}%</div>
        `;
        
        button.textContent = '👁️ Zobacz analizę';
      }
    }
  });
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

  updatePreview();
  updateSubmitButton();
}

function updatePreview() {
  const previewContainer = document.getElementById('preview-container');
  const previewGrid = document.getElementById('preview-grid');
  const previewCount = document.getElementById('preview-count');
  const metadataForm = document.getElementById('metadata-form');
  
  if (!previewContainer || !previewGrid || !previewCount) return;
  
  previewGrid.innerHTML = '';
  previewCount.textContent = selectedFiles.length;
  
  if (selectedFiles.length === 0) {
    previewContainer.style.display = 'none';
    if (metadataForm) metadataForm.style.display = 'none';
    return;
  }
  
  previewContainer.style.display = 'block';
  if (metadataForm) metadataForm.style.display = 'block';
  
  selectedFiles.forEach((file, index) => {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    
    const img = document.createElement('img');
    img.alt = file.name;
    
    // Wczytaj podgląd
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Usuń zdjęcie';
    removeBtn.addEventListener('click', () => removeFile(index));
    
    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    previewGrid.appendChild(previewItem);
  });
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
  const problemInput = document.getElementById('patient-problem');
  
  if (ageInput) ageInput.value = '';
  if (genderSelect) genderSelect.value = '';
  if (problemInput) problemInput.value = '';
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updatePreview();
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
