# Plan Implementacji AI dla Hair Analyzer

## 🎯 Cel
System automatycznej analizy zdjęć skóry głowy z wykorzystaniem AI do klasyfikacji problemów trychologicznych i porównywania z bazą istniejących przypadków.

## 🏗️ Architektura Rozwiązania

### Wariant A: OpenAI Vision API (GPT-4 Vision) - **REKOMENDOWANY START**

#### Komponenty:
1. **API Endpoint: `/api/analyze-image`**
   - Pobiera zdjęcie z Vercel Blob
   - Wysyła do OpenAI Vision API
   - Zwraca analizę problemu

2. **API Endpoint: `/api/compare-images`**
   - Generuje embeddingi obrazów (OpenAI)
   - Porównuje z bazą za pomocą podobieństwa wektorowego
   - Zwraca najbardziej podobne przypadki

3. **Baza wiedzy (localStorage/Vercel KV)**
   - Przechowywanie analizowanych przypadków
   - Embeddingi obrazów + problemy
   - Historia diagnoz

#### Koszty:
- GPT-4 Vision: ~$0.01-0.03 za obraz
- Embeddings: ~$0.0001 za obraz
- Miesięcznie dla 100 zdjęć: ~$2-4

#### Implementacja krok po kroku:

```javascript
// 1. api/analyze-image.js
import OpenAI from 'openai';

export default async function handler(req, res) {
  const { imageUrl } = req.body;
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Jesteś ekspertem trychologiem. Przeanalizuj to zdjęcie skóry głowy i określ:
          1. Typ problemu (łysienie, łupież, łojotok, zapalenie, itp.)
          2. Stopień zaawansowania (lekki/średni/zaawansowany)
          3. Widoczne objawy
          4. Rekomendacje wstępne
          
          Odpowiedz w formacie JSON.`
        },
        {
          type: "image_url",
          image_url: { url: imageUrl }
        }
      ]
    }],
    max_tokens: 500
  });

  return res.json({
    analysis: JSON.parse(response.choices[0].message.content)
  });
}
```

```javascript
// 2. api/compare-images.js
// Porównanie z bazą używając embeddings
import OpenAI from 'openai';
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const { imageUrl, sessionId } = req.body;
  
  // Generuj embedding dla nowego zdjęcia
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // TODO: OpenAI nie ma jeszcze image embeddings
  // Alternatywa: użyć CLIP embeddings lub porównać tekstowe opisy
  
  // Pobierz wszystkie zdjęcia z bazy
  const { blobs } = await list({
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  
  // Porównaj przypadki...
}
```

---

### Wariant B: Replicate (Stable Diffusion + CLIP) - BARDZIEJ ZAAWANSOWANE

#### Komponenty:
1. **CLIP Model** dla embeddings obrazów
2. **Vector Database** (Pinecone/Qdrant) dla przechowywania
3. **Stable Diffusion** opcjonalnie dla generowania podobnych przypadków

#### Zalety:
- Lepsze embeddingi obrazów
- Szybsze porównania
- Niższe koszty w dłuższej perspektywie

#### Koszty:
- Replicate CLIP: ~$0.0005 za obraz
- Pinecone: Free tier do 1M wektorów
- Miesięcznie dla 100 zdjęć: ~$0.5-1

#### Implementacja:
```javascript
// api/analyze-with-clip.js
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  const { imageUrl } = req.body;
  
  // Generuj embedding używając CLIP
  const output = await replicate.run(
    "openai/clip-vit-large-patch14:...",
    {
      input: { image: imageUrl }
    }
  );
  
  // Porównaj z bazą w Pinecone
  // ...
}
```

---

### Wariant C: Google Cloud Vision API

#### Zalety:
- Specjalizacja w analizie medycznej
- Dobre wykrywanie cech obrazu
- Integracja z Google Cloud Healthcare

#### Wady:
- Bardziej skomplikowana konfiguracja
- Wyższe koszty
- Nie ma bezpośrednio analizy trychologicznej

---

## 🎨 UI/UX Flow

### 1. Przycisk "Analizuj AI" w galerii
```html
<button class="analyze-ai-button" data-image-url="...">
  🤖 Analizuj AI
</button>
```

### 2. Modal z wynikami analizy
```
┌─────────────────────────────────┐
│  Analiza AI                     │
├─────────────────────────────────┤
│  📊 Wykryty problem:            │
│     Łysienie androgenowe        │
│                                 │
│  📈 Stopień: Średni             │
│                                 │
│  🔍 Objawy:                     │
│  • Przerzedzenie włosów         │
│  • Widoczna skóra głowy         │
│  • Miniaturyzacja mieszków      │
│                                 │
│  💡 Podobne przypadki (3):      │
│  [Miniaturki podobnych zdjęć]   │
│                                 │
│  ⚕️ Rekomendacje:               │
│  • Konsultacja z dermatologiem  │
│  • Możliwy minoksydyl           │
└─────────────────────────────────┘
```

### 3. Karta "Porównaj z bazą"
- Wyświetla najbardziej podobne przypadki
- Pokazuje ich diagnozy i wyniki leczenia
- Umożliwia filtrowanie po problemie/wieku/płci

---

## 📦 Potrzebne zależności

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "replicate": "^0.25.0",
    "@pinecone-database/pinecone": "^1.1.0",
    "@vercel/kv": "^1.0.0"
  }
}
```

## 🔐 Zmienne środowiskowe

```bash
# OpenAI (Wariant A)
OPENAI_API_KEY=sk-...

# Replicate (Wariant B)
REPLICATE_API_TOKEN=r8_...

# Pinecone (dla vector search)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=hair-analysis

# Vercel KV (dla cache i bazy)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

---

## 📊 Struktura danych dla analizy

```typescript
interface HairAnalysis {
  imageUrl: string;
  sessionId: string;
  timestamp: string;
  analysis: {
    problem: string;           // "androgenetic alopecia"
    problemPL: string;         // "łysienie androgenowe"
    severity: "mild" | "moderate" | "severe";
    confidence: number;        // 0-1
    symptoms: string[];
    recommendations: string[];
  };
  embedding?: number[];        // Vector dla porównań
  similarCases?: string[];     // IDs podobnych przypadków
  metadata: {
    age?: number;
    gender?: string;
    userProblem?: string;
  };
}
```

---

## 🚀 Plan wdrożenia (Fazy)

### Faza 1: MVP (1-2 tygodnie)
- [ ] Dodać OpenAI Vision API
- [ ] Endpoint `/api/analyze-image`
- [ ] Przycisk "Analizuj AI" w galerii
- [ ] Modal z wynikami analizy
- [ ] Zapisywanie analiz do localStorage

### Faza 2: Porównywanie (2-3 tygodnie)
- [ ] Implementacja embeddings (CLIP lub OpenAI)
- [ ] Vector database (Pinecone lub Vercel KV)
- [ ] Endpoint `/api/find-similar`
- [ ] UI dla podobnych przypadków
- [ ] Filtrowanie wyników

### Faza 3: Rozbudowa (4-6 tygodni)
- [ ] Historia analiz użytkownika
- [ ] Śledzenie postępów w czasie
- [ ] Exportowanie raportów
- [ ] Statystyki i insights
- [ ] Integracja z kalendarzem wizyt

### Faza 4: Zaawansowane (2-3 miesiące)
- [ ] Fine-tuning modelu na własnych danych
- [ ] Segmentacja obrazu (wykrywanie obszarów)
- [ ] Automatyczne pomiary (gęstość włosów)
- [ ] Predykcja postępu problemu
- [ ] System rekomendacji leczenia

---

## 💰 Szacunkowe koszty

| Wariant | Setup | 100 zdjęć/m | 1000 zdjęć/m |
|---------|-------|-------------|--------------|
| OpenAI Vision | $0 | $2-4 | $20-40 |
| Replicate + Pinecone | $0 | $1-2 | $10-15 |
| Google Vision | $0 | $5-8 | $50-80 |

---

## ⚠️ Uwagi prawne i medyczne

**WAŻNE:**
- System nie zastępuje konsultacji medycznej
- Dodać disclaimer: "To narzędzie pomocnicze, nie diagnoza"
- GDPR: zgoda na przetwarzanie zdjęć medycznych
- Przechowywanie danych zgodnie z przepisami
- Możliwe konieczność certyfikacji medycznej (CE)

---

## 🎯 Rekomendacja

**START: Wariant A (OpenAI Vision)**
1. Najszybszy do implementacji (2-3 dni)
2. Dobre wyniki bez treningu
3. Niskie koszty na start
4. Łatwa iteracja i testowanie

**Później: Migracja do Wariant B**
- Gdy baza urośnie (>1000 zdjęć)
- Dla lepszych porównań
- Gdy koszty OpenAI staną się znaczące

---

## 📚 Dodatkowe zasoby

- OpenAI Vision: https://platform.openai.com/docs/guides/vision
- Replicate CLIP: https://replicate.com/openai/clip
- Pinecone: https://www.pinecone.io/
- Vercel KV: https://vercel.com/docs/storage/vercel-kv

---

## 🔧 Proof of Concept - Prosty test

Możemy zacząć od prostego testu bez pisania kodu:
1. Wrzuć zdjęcie do ChatGPT z Vision
2. Zapytaj o analizę trychologiczną
3. Zobacz jakość odpowiedzi
4. Jeśli satysfakcjonująca → implementuj API

