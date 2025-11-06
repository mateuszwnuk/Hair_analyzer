import { put } from '@vercel/blob';
import { IncomingForm } from 'formidable';
import { readFileSync, unlinkSync } from 'fs';

export const config = {
  api: {
    bodyParser: false, // Wyłącz domyślny parser
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Sprawdź czy token Blob jest ustawiony
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not configured');
    return res.status(500).json({ 
      error: 'Konfiguracja serwera jest niepełna. Skontaktuj się z administratorem.' 
    });
  }

  try {
    // Parse form data using formidable
    const form = new IncomingForm({
      maxFileSize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 4,
      allowEmptyFiles: false,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileArray = files.files || [];
    const filesArray = Array.isArray(fileArray) ? fileArray : [fileArray];

    if (filesArray.length === 0) {
      return res.status(400).json({ error: 'Nie przesłano żadnych plików' });
    }

    if (filesArray.length > 4) {
      return res.status(400).json({ error: 'Maksymalnie 4 pliki' });
    }

    const uploadedUrls = [];
    const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;

    for (const file of filesArray) {
      if (!file || !file.filepath) continue;

      // Walidacja typu pliku
      if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
        return res.status(400).json({ 
          error: `Nieprawidłowy typ pliku: ${file.originalFilename}. Tylko JPG i PNG.` 
        });
      }

      // Wczytaj plik jako Buffer
      const fileBuffer = readFileSync(file.filepath);

      // Generuj unikalną nazwę
      const timestamp = Date.now();
      const fileName = `${sessionId}/${timestamp}_${file.originalFilename}`;

      // Upload do Vercel Blob
      console.log(`Uploading file: ${fileName}, size: ${file.size}, type: ${file.mimetype}`);
      
      const blob = await put(fileName, fileBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.mimetype,
      });

      console.log(`Successfully uploaded: ${blob.url}`);

      uploadedUrls.push({
        file_name: file.originalFilename,
        public_url: blob.url,
        size_bytes: file.size,
        uploaded_at: new Date().toISOString(),
        mime_type: file.mimetype,
        session_id: sessionId,
      });

      // Usuń tymczasowy plik
      unlinkSync(file.filepath);
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
      details: error.message,
    });
  }
}
