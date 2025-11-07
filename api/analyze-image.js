import OpenAI from 'openai';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Sprawdź czy API key jest ustawiony
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('BLOB')));
    return res.status(500).json({ 
      error: 'Konfiguracja AI nie jest dostępna. Skontaktuj się z administratorem.',
      hint: 'Ustaw OPENAI_API_KEY w Environment Variables'
    });
  }

  console.log('OpenAI API Key configured:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');

  try {
    const { imageUrl, imageUrls, metadata, isMultiImage } = req.body;

    // Obsługa zarówno pojedynczego jak i wielu zdjęć
    const urlsToAnalyze = isMultiImage && imageUrls ? imageUrls : (imageUrl ? [imageUrl] : []);
    
    if (urlsToAnalyze.length === 0) {
      return res.status(400).json({ error: 'Brak URL obrazu' });
    }

    console.log(`Analyzing ${urlsToAnalyze.length} image(s)`);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Przygotuj kontekst z metadanych jeśli dostępne
    let contextInfo = '';
    if (metadata) {
      contextInfo = '\n\nInformacje o pacjencie:';
      if (metadata.age) contextInfo += `\n- Wiek: ${metadata.age} lat`;
      if (metadata.gender) {
        const genderMap = { female: 'Kobieta', male: 'Mężczyzna', other: 'Inna' };
        contextInfo += `\n- Płeć: ${genderMap[metadata.gender] || metadata.gender}`;
      }
      if (metadata.problem) contextInfo += `\n- Zgłoszony problem: ${metadata.problem}`;
    }

    // Przygotuj wiadomość - dla wielu zdjęć dodaj wszystkie
    const content = [
      {
        type: "text",
        text: `Jesteś ekspertem trychologiem i dermatologiem specjalizującym się w problemach skóry głowy i włosów. 
        
${urlsToAnalyze.length > 1 ? `Przeanalizuj dokładnie te ${urlsToAnalyze.length} zdjęcia skóry głowy i włosów z różnych kątów.` : 'Przeanalizuj dokładnie to zdjęcie skóry głowy i włosów.'}
${urlsToAnalyze.length > 1 ? 'Zdjęcia pokazują tę samą osobę z różnych perspektyw - wykorzystaj wszystkie dostępne informacje do kompleksowej analizy.' : ''}${contextInfo}

WAŻNE: Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`json):

{
  "problem": "nazwa głównego problemu po polsku",
  "problemCategory": "jedna z: lysienie/łupież/łojotok/zapalenie/inne",
  "severity": "jedna z: lekki/średni/zaawansowany",
  "confidence": liczba od 0 do 100,
  "symptoms": ["objaw 1", "objaw 2", "objaw 3"],
  "recommendations": ["rekomendacja 1", "rekomendacja 2", "rekomendacja 3"],
  "detailedAnalysis": "szczegółowy opis tego co widać na zdjęci${urlsToAnalyze.length > 1 ? 'ach' : 'u'}",
  "possibleCauses": ["możliwa przyczyna 1", "możliwa przyczyna 2"],
  "nextSteps": ["następny krok 1", "następny krok 2"]
}

Bądź precyzyjny, konkretny i profesjonalny. Jeśli nie jesteś pewien, wskaż to w polu confidence.`
      }
    ];

    // Dodaj wszystkie zdjęcia do contentu
    urlsToAnalyze.forEach((url, index) => {
      content.push({
        type: "image_url",
        image_url: {
          url: url,
          detail: "high"
        }
      });
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: content
      }],
      max_tokens: 1000,
      temperature: 0.3 // Niższa temperatura dla bardziej konsystentnych wyników
    });

    const analysisText = response.choices[0].message.content.trim();
    console.log('Raw AI response:', analysisText);

    // Parsuj JSON z odpowiedzi
    let analysis;
    try {
      // Usuń ewentualne markdown code blocks
      const cleanedText = analysisText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response text:', analysisText);
      return res.status(500).json({ 
        error: 'Nie udało się przetworzyć odpowiedzi AI',
        details: analysisText
      });
    }

    // Dodaj timestamp i metadata
    const result = {
      ...analysis,
      analyzedAt: new Date().toISOString(),
      imageUrl: imageUrl,
      metadata: metadata || null,
      tokensUsed: response.usage?.total_tokens || 0
    };

    console.log('Analysis completed successfully');

    return res.status(200).json({
      success: true,
      analysis: result
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Specjalne traktowanie błędów OpenAI
    if (error.status === 401) {
      return res.status(500).json({
        error: 'Nieprawidłowy klucz API OpenAI',
        details: 'Skontaktuj się z administratorem'
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Przekroczono limit zapytań API',
        details: 'Spróbuj ponownie za chwilę'
      });
    }

    return res.status(500).json({
      error: 'Błąd podczas analizy obrazu',
      details: error.message
    });
  }
}
