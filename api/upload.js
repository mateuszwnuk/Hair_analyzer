import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false, // Musimy wyłączyć domyślny parser dla FormData
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel automatycznie parsuje multipart/form-data
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type musi być multipart/form-data' });
    }

    // W Vercel Functions req.body będzie zawierać pliki
    const files = req.body?.files || [];
    
    if (!Array.isArray(files)) {
      return res.status(400).json({ error: 'Nieprawidłowy format danych' });
    }

    if (files.length === 0 || files.length > 4) {
      return res.status(400).json({ error: 'Wymagane 1-4 pliki' });
    }

    const uploadedUrls = [];
    const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;
    
    for (const file of files) {
      // Generuj unikalną nazwę z sessionId
      const timestamp = Date.now();
      const fileName = `${sessionId}/${timestamp}_${file.name}`;
      
      const blob = await put(fileName, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      
      uploadedUrls.push({
        filename: file.name,
        url: blob.url,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      files: uploadedUrls,
      sessionId: sessionId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Błąd podczas przesyłania',
      details: error.message 
    });
  }
}
