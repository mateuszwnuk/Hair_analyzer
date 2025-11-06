# Hair Analyzer

Prototypowa aplikacja webowa, która umożliwia przesyłanie zdjęć skóry głowy jako pierwszy krok w analizie trychologicznej.

## Funkcje
- Przesyłanie maksymalnie czterech obrazów w formatach JPG lub PNG.
- Walidacja limitu rozmiaru pliku do 5 MB.
- Obsługa przeciągnij-i-upuść oraz standardowego wyboru plików.
- Lista dodanych plików z możliwością usunięcia przed wysłaniem.
- Informacja zwrotna w formie komunikatów i powiadomienia toast.

## Uruchomienie lokalne
Jest to statyczny front-end. Aby go uruchomić, wystarczy otworzyć plik `index.html` w przeglądarce lub uruchomić prosty serwer HTTP, np.:

```bash
python -m http.server 8000
```

Następnie przejdź do `http://localhost:8000` i otwórz stronę `index.html`.
