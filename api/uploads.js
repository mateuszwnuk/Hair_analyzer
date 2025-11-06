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
    const files = blobs.map(blob => ({
      id: blob.pathname,
      session_id: sessionId,
      file_name: blob.pathname.split('/').pop().replace(/^\d+_/, ''), // usuń timestamp
      public_url: blob.url,
      uploaded_at: blob.uploadedAt,
      mime_type: getContentTypeFromUrl(blob.url),
      size_bytes: blob.size,
    }));

    // Sortuj od najnowszych
    files.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

    return res.status(200).json({
      sessionId,
      files,
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
