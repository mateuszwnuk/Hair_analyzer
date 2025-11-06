const REQUIRED_ENV_VARS = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];

REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[api/uploads] Missing environment variable: ${key}`);
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const headers = (extra = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  ...extra,
});

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error:
        "Brak konfiguracji Supabase. Upewnij się, że zmienne środowiskowe są ustawione na Vercel.",
    });
  }

  const { sessionId } = req.query || {};

  if (!sessionId) {
    return res.status(400).json({ error: "Brak identyfikatora sesji." });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/photos`);
    url.searchParams.set("session_id", `eq.${sessionId}`);
    url.searchParams.set("order", "uploaded_at.desc");
    url.searchParams.set(
      "select",
      "id,session_id,file_name,public_url,uploaded_at,mime_type,size_bytes"
    );

    const response = await fetch(url, {
      headers: headers({
        Accept: "application/json",
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(
        errorPayload?.message ||
          "Nie udało się pobrać listy przesłanych plików z bazy danych."
      );
    }

    const files = await response.json();

    return res.status(200).json({
      sessionId,
      files,
    });
  } catch (error) {
    console.error("[api/uploads]", error);
    return res.status(500).json({
      error:
        error?.message || "Wystąpił nieoczekiwany błąd podczas pobierania plików.",
    });
  }
};
