# Hair Analyzer 🔬

Prototypowa aplikacja webowa do przesyłania i analizy zdjęć skóry głowy w ramach analizy trychologicznej z wykorzystaniem AI.

## ✨ Funkcje

- 📸 Upload do 4 zdjęć (JPG/PNG, max 5MB)
- 📝 Formularz metadanych pacjenta (wiek, płeć, problem)
- 🗂️ Galeria przesłanych zdjęć
- 🤖 **NOWOŚĆ:** Analiza AI z wykorzystaniem GPT-4 Vision
- 💾 Przechowywanie w Vercel Blob Storage
- 🔄 Automatyczne wykrywanie problemów trychologicznych
- 📊 Szczegółowe raporty analizy AI

## 🚀 Szybki start

### 1. Wymagane klucze API

#### OpenAI API Key
1. Zarejestruj się na: https://platform.openai.com/
2. Przejdź do: https://platform.openai.com/api-keys
3. Kliknij "Create new secret key"
4. Skopiuj klucz (zaczyna się od `sk-proj-...`)
5. **Koszt:** ~$5 na start (wystarczy na ~150-200 analiz)

#### Vercel Blob Token
1. W Vercel Dashboard → Storage → Create Database → Blob
2. Skopiuj `BLOB_READ_WRITE_TOKEN`

### 2. Konfiguracja

Stwórz plik `.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_...
OPENAI_API_KEY=sk-proj-...
```

### 3. Instalacja i uruchomienie

```bash
# Zainstaluj zależności
npm install

# Deploy na Vercel
vercel --prod
```

### 4. Konfiguracja Environment Variables na Vercel

W Vercel Dashboard → Settings → Environment Variables dodaj:
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY`

## 📖 Jak działa analiza AI?

1. **Użytkownik przesyła zdjęcie** skóry głowy/włosów
2. **Zdjęcie zapisuje się w Vercel Blob Storage**
3. **Kliknięcie "Analizuj AI"** wysyła zdjęcie do GPT-4 Vision
4. **AI analizuje obraz** pod kątem:
   - Rodzaju problemu (łysienie, łupież, łojotok, etc.)
   - Stopnia zaawansowania (lekki/średni/zaawansowany)
   - Widocznych objawów
   - Możliwych przyczyn
   - Rekomendacji działań
5. **Użytkownik otrzymuje szczegółowy raport**

## 🧠 Przykładowa analiza AI

```json
{
  "problem": "Łysienie androgenowe",
  "problemCategory": "lysienie",
  "severity": "średni",
  "confidence": 85,
  "symptoms": [
    "Przerzedzenie włosów w okolicy czołowej",
    "Widoczna miniaturyzacja mieszków włosowych"
  ],
  "recommendations": [
    "Konsultacja z dermatologiem",
    "Rozważ badania hormonalne"
  ]
}
```

## 💰 Koszty

### OpenAI API (GPT-4o-mini with Vision)
- **Średni koszt jednej analizy: ~$0.02-0.04**
- Dla 100 analiz miesięcznie: ~**$2-4/miesiąc**

### Vercel Blob Storage
- Free tier: 500MB (~100-200 zdjęć)

## 🏗️ Struktura projektu

```
hair_analyzer/
├── index.html              # Główna aplikacja
├── styles.css              # Style CSS
├── package.json            # Zależności
├── api/
│   ├── upload.js           # Upload do Blob
│   ├── uploads.js          # Lista plików
│   └── analyze-image.js    # ⭐ Analiza AI
└── scripts/
    └── app.js              # Główna logika + AI
```

## 🔐 Bezpieczeństwo

- ⚠️ Nigdy nie commituj kluczy API
- Używaj zmiennych środowiskowych
- Klucze dostępne tylko na backendzie

## ⚕️ Disclaimer

**UWAGA:** Ta aplikacja NIE zastępuje konsultacji medycznej. Analiza AI ma charakter informacyjny.

## 📚 Technologie

- Frontend: Vanilla JavaScript, HTML5, CSS3
- Backend: Vercel Serverless Functions
- Storage: Vercel Blob Storage
- AI: OpenAI GPT-4o-mini Vision
- Deployment: Vercel

## 📄 Licencja

ISC
