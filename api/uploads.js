import { list } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Sprawdź czy token Blob jest ustawiony
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not configured');
    return res.status(500).json({ 
      error: 'Konfiguracja serwera jest niepełna.' 
    });
  }

  const { sessionId } = req.query || {};

  if (!sessionId) {
    return res.status(400).json({ error: "Brak identyfikatora sesji." });
  }

  try {
    // Pobierz listę plików z Vercel Blob dla danej sesji
    const { blobs } = await list({
      prefix: `${sessionId}/`,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Przekształć dane do formatu oczekiwanego przez frontend
    const files = blobs.map(blob => {
      const pathParts = blob.pathname.split('/');
      const fullFileName = pathParts[pathParts.length - 1];
      
      // Wyodrębnij caseId i metadane z nazwy pliku
      const caseId = extractCaseIdFromFileName(fullFileName);
      const metadata = parseMetadataFromFileName(fullFileName);
      const originalFileName = extractOriginalFileName(fullFileName);
      
      return {
        id: blob.pathname,
        session_id: sessionId,
        case_id: caseId,
        file_name: originalFileName,
        public_url: blob.url,
        uploaded_at: blob.uploadedAt,
        mime_type: getContentTypeFromUrl(blob.url),
        size_bytes: blob.size,
        metadata: metadata,
      };
    });

    // Grupuj pliki według caseId
    const caseGroups = {};
    files.forEach(file => {
      const caseId = file.case_id || 'unknown';
      if (!caseGroups[caseId]) {
        caseGroups[caseId] = [];
      }
      caseGroups[caseId].push(file);
    });

    // Przekształć na array z obrazkami pogrupowanymi
    const cases = Object.entries(caseGroups).map(([caseId, images]) => {
      // Sortuj obrazy w grupie chronologicznie
      images.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
      
      return {
        case_id: caseId,
        images: images,
        uploaded_at: images[0].uploaded_at, // Data pierwszego zdjęcia
        metadata: images[0].metadata, // Metadane z pierwszego zdjęcia
      };
    });

    // Sortuj case'y od najnowszych
    cases.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

    return res.status(200).json({
      sessionId,
      cases,
      files, // Zachowaj też starą strukturę dla kompatybilności
    });
  } catch (error) {
    console.error("[api/uploads]", error);
    return res.status(500).json({
      error: error?.message || "Wystąpił nieoczekiwany błąd podczas pobierania plików.",
    });
  }
};

// Pomocnicza funkcja do określenia content-type na podstawie rozszerzenia
function getContentTypeFromUrl(url) {
  const extension = url.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

// Funkcja do wyodrębnienia caseId z nazwy pliku
function extractCaseIdFromFileName(fileName) {
  // Format: case_1234567890_timestamp_name...
  const caseMatch = fileName.match(/^(case_\d+)_/);
  return caseMatch ? caseMatch[1] : null;
}

// Funkcja do wyodrębnienia metadanych z nazwy pliku
function parseMetadataFromFileName(fileName) {
  const metadata = {};
  
  // Szukaj wzorca _META_..._ w nazwie pliku
  const metaMatch = fileName.match(/_META_([^.]+)_/);
  if (!metaMatch) return null;
  
  const metaString = metaMatch[1];
  const metaParts = metaString.split('_');
  
  for (const part of metaParts) {
    if (part.startsWith('age')) {
      const age = parseInt(part.substring(3));
      if (!isNaN(age)) metadata.age = age;
    } else if (part.startsWith('gender')) {
      metadata.gender = part.substring(6);
    } else if (part.startsWith('problem')) {
      // Dekoduj problem (przywróć spacje)
      metadata.problem = part.substring(7).replace(/_/g, ' ');
    }
  }
  
  return Object.keys(metadata).length > 0 ? metadata : null;
}

// Funkcja do wyodrębnienia oryginalnej nazwy pliku
function extractOriginalFileName(fileName) {
  // Usuń caseId i timestamp z początku
  let cleaned = fileName.replace(/^case_\d+_/, ''); // usuń caseId
  cleaned = cleaned.replace(/^\d+_/, ''); // usuń timestamp
  
  // Usuń metadane jeśli istnieją
  cleaned = cleaned.replace(/_META_[^.]+_/, '');
  
  return cleaned;
}
