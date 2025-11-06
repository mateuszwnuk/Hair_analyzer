# Hair Analyzer

Prototypowa aplikacja webowa, która umożliwia przesyłanie zdjęć skóry głowy jako pierwszy krok w analizie trychologicznej.

## Funkcje
- Przesyłanie maksymalnie czterech obrazów w formatach JPG lub PNG.
- Walidacja limitu rozmiaru pliku do 5 MB.
- Obsługa przeciągnij-i-upuść oraz standardowego wyboru plików.
- Lista dodanych plików z możliwością usunięcia przed wysłaniem.
- Informacja zwrotna w formie komunikatów i powiadomienia toast.
- Automatyczne zapisywanie zdjęć na Supabase Storage poprzez funkcję serwerową Vercel.
- Zapisywanie metadanych przesłanych plików (w tym identyfikatora sesji) w tabeli `photos` na Supabase.
- Dashboard pozwalający podejrzeć wszystkie zdjęcia z bieżącej sesji użytkownika.

## Architektura
Projekt jest gotowy do wdrożenia na platformie Vercel. Korzysta z dwóch funkcji serwerowych:

- `api/upload.js` – przyjmuje zweryfikowane pliki z front-endu, wysyła je do Supabase Storage oraz zapisuje metadane w bazie.
- `api/uploads.js` – zwraca listę plików zapisanych w Supabase dla konkretnego identyfikatora sesji.

Front-end zapisuje identyfikator sesji w `localStorage`, aby móc powiązać wszystkie przesłane pliki z jednym użytkownikiem.

## Konfiguracja środowiska
Na platformie Vercel należy dodać zmienne środowiskowe wskazane w pliku `.env.example`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (zalecane) lub `SUPABASE_ANON_KEY`
- `SUPABASE_DB_PASSWORD` (opcjonalnie, jeżeli wykorzystywana jest zewnętrzna integracja)
- `SUPABASE_STORAGE_BUCKET` (nazwa istniejącego koszyka w Supabase Storage, domyślnie `uploads`)

> **Uwaga:** Klucz serwisowy (`service_role`) ma pełne uprawnienia do projektu Supabase. Przechowuj go wyłącznie po stronie serwerowej (np. w Vercel Environment Variables). Front-end korzysta wyłącznie z funkcji serwerowych, dzięki czemu wrażliwe dane nie są ujawniane użytkownikom.

Tabela `photos` w Supabase powinna zawierać co najmniej następujące kolumny:

| Kolumna        | Typ                | Uwagi                                       |
| -------------- | ------------------ | ------------------------------------------- |
| `id`           | `uuid`             | Klucz główny z domyślnym `gen_random_uuid()` |
| `session_id`   | `text`             | Identyfikator sesji użytkownika             |
| `file_name`    | `text`             | Oryginalna nazwa pliku                      |
| `storage_path` | `text`             | Ścieżka pliku w Supabase Storage            |
| `public_url`   | `text`             | Publiczny adres URL do podglądu             |
| `mime_type`    | `text`             | Typ MIME (opcjonalnie)                      |
| `size_bytes`   | `bigint`           | Rozmiar pliku w bajtach (opcjonalnie)       |
| `uploaded_at`  | `timestamp`        | Domyślnie `now()`                           |

Dla koszyka w Supabase Storage należy włączyć publiczny dostęp lub przygotować odpowiednie polityki RLS tak, aby funkcja serwerowa mogła zapisywać pliki przy użyciu przekazanego klucza.

## Uruchomienie lokalne
Projekt nie wymaga build step – można go uruchomić lokalnie za pomocą prostego serwera HTTP, np.:

```bash
python -m http.server 8000
```

Następnie przejdź do `http://localhost:8000` i otwórz stronę `index.html`. Aby sprawdzić działanie pełnego procesu (upload do Supabase i dashboard), należy uruchomić projekt poprzez Vercel CLI z poprawnie ustawionymi zmiennymi środowiskowymi.
