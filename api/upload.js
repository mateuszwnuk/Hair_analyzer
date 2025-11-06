const { randomUUID } = require("crypto");

const REQUIRED_ENV_VARS = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];

REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[api/upload] Missing environment variable: ${key}`);
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "uploads").trim();
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let bucketInitializationPromise = null;

const MAX_FILES = 4;

const headers = (extra = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  ...extra,
});

const encodePath = (input) =>
  input
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const publicUrlFor = (bucket, path) =>
  `${SUPABASE_URL}/storage/v1/object/public/${encodePath(bucket)}/${encodePath(
    path
  )}`;

const toBuffer = (base64) => Buffer.from(base64, "base64");

const ensureBucketExists = async () => {
  if (bucketInitializationPromise) {
    return bucketInitializationPromise;
  }

  bucketInitializationPromise = (async () => {
    if (!SUPABASE_BUCKET) {
      throw new Error(
        "Nie skonfigurowano nazwy koszyka Supabase. Ustaw zmienną SUPABASE_STORAGE_BUCKET."
      );
    }

    const detailsResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/bucket/${encodePath(SUPABASE_BUCKET)}`,
      {
        headers: headers(),
      }
    );

    if (detailsResponse.ok) {
      return true;
    }

    if (detailsResponse.status === 404) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error(
          `Koszyk '${SUPABASE_BUCKET}' nie istnieje. Utwórz go w panelu Supabase Storage lub podaj istniejącą nazwę w SUPABASE_STORAGE_BUCKET.`
        );
      }

      const createResponse = await fetch(
        `${SUPABASE_URL}/storage/v1/bucket`,
        {
          method: "POST",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            id: SUPABASE_BUCKET,
            name: SUPABASE_BUCKET,
            public: true,
          }),
        }
      );

      if (createResponse.ok || createResponse.status === 409) {
        return true;
      }

      const createError = await createResponse.json().catch(() => null);
      throw new Error(
        createError?.message ||
          `Nie udało się utworzyć koszyka '${SUPABASE_BUCKET}' w Supabase Storage.`
      );
    }

    if (detailsResponse.status === 403) {
      throw new Error(
        `Brak uprawnień do koszyka '${SUPABASE_BUCKET}'. Użyj klucza service_role lub zapewnij odpowiednie polityki dostępu.`
      );
    }

    const detailsError = await detailsResponse.json().catch(() => null);
    throw new Error(
      detailsError?.message ||
        "Nie udało się zweryfikować koszyka Supabase Storage."
    );
  })();

  try {
    return await bucketInitializationPromise;
  } catch (error) {
    bucketInitializationPromise = null;
    throw error;
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error:
        "Brak konfiguracji Supabase. Upewnij się, że zmienne środowiskowe są ustawione na Vercel.",
    });
  }

  const { sessionId, files } = req.body || {};

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Brak identyfikatora sesji." });
  }

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Brak plików do przesłania." });
  }

  if (files.length > MAX_FILES) {
    return res.status(400).json({
      error: `Można przesłać maksymalnie ${MAX_FILES} pliki jednocześnie.`,
    });
  }

  try {
    await ensureBucketExists();
  } catch (error) {
    console.error("[api/upload] bucket validation", error);
    return res.status(500).json({
      error: error?.message ||
        "Nie udało się zweryfikować koszyka Supabase Storage.",
    });
  }

  const uploads = [];

  try {
    for (const file of files) {
      if (!file?.data || !file?.name) {
        throw new Error("Nieprawidłowa struktura przesłanych plików.");
      }

      const fileBuffer = toBuffer(file.data);
      const fileExtension = (file.name.split(".").pop() || "").toLowerCase();
      const fileName = `${randomUUID()}${fileExtension ? `.${fileExtension}` : ""}`;
      const storagePath = `${sessionId}/${fileName}`;
      const pathSegment = `${encodePath(SUPABASE_BUCKET)}/${encodePath(
        storagePath
      )}`;

      const uploadResponse = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${pathSegment}`,
        {
          method: "POST",
          headers: headers({
            "Content-Type": file.type || "application/octet-stream",
            "x-upsert": "true",
          }),
          body: fileBuffer,
        }
      );

      if (!uploadResponse.ok) {
        const errorPayload = await uploadResponse.json().catch(() => null);
        throw new Error(
          errorPayload?.message ||
            `Nie udało się przesłać pliku ${file.name} do magazynu.`
        );
      }

      const publicUrl = publicUrlFor(SUPABASE_BUCKET, storagePath);

      const metadata = {
        session_id: sessionId,
        file_name: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: file.type || null,
        size_bytes: file.size || fileBuffer.length,
      };

      const metadataResponse = await fetch(`${SUPABASE_URL}/rest/v1/photos`, {
        method: "POST",
        headers: headers({
          "Content-Type": "application/json",
          Prefer: "return=representation",
        }),
        body: JSON.stringify(metadata),
      });

      if (!metadataResponse.ok) {
        const errorPayload = await metadataResponse.json().catch(() => null);
        throw new Error(
          errorPayload?.message ||
            `Nie udało się zapisać metadanych pliku ${file.name}.`
        );
      }

      const payload = await metadataResponse.json();
      uploads.push({
        id: payload?.[0]?.id || null,
        fileName: file.name,
        publicUrl,
        storagePath,
      });
    }

    return res.status(200).json({
      sessionId,
      files: uploads,
    });
  } catch (error) {
    console.error("[api/upload]", error);
    return res.status(500).json({
      error:
        error?.message || "Wystąpił nieoczekiwany błąd podczas zapisywania plików.",
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "32mb",
    },
  },
};
