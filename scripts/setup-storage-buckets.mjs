import { createClient } from "@supabase/supabase-js";

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function requiredEnv(name) {
  const value = asText(process.env[name]);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isAlreadyExistsError(error) {
  const message = asText(error?.message).toLowerCase();
  return message.includes("already exists") || Number(error?.statusCode) === 409;
}

async function ensureBucket(supabase, bucket) {
  const options = {
    public: bucket.public,
    fileSizeLimit: bucket.fileSizeLimit,
    allowedMimeTypes: bucket.allowedMimeTypes,
  };

  const createResult = await supabase.storage.createBucket(bucket.name, options);
  if (!createResult.error) {
    return { name: bucket.name, action: "created" };
  }

  if (!isAlreadyExistsError(createResult.error)) {
    throw new Error(`createBucket(${bucket.name}) failed: ${createResult.error.message}`);
  }

  const updateResult = await supabase.storage.updateBucket(bucket.name, options);
  if (updateResult.error) {
    throw new Error(`updateBucket(${bucket.name}) failed: ${updateResult.error.message}`);
  }

  return { name: bucket.name, action: "updated" };
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const contractsBucket = asText(process.env.VITE_CONTRACTS_BUCKET, "contracts");
  const contractorPhotosBucket = asText(process.env.VITE_CONTRACTOR_PHOTOS_BUCKET, "contractor-photos");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const bucketSpecs = [
    {
      name: contractsBucket,
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
    },
    {
      name: contractorPhotosBucket,
      public: false,
      fileSizeLimit: 15 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/heic"],
    },
  ];

  const outcomes = [];
  for (const bucket of bucketSpecs) {
    const result = await ensureBucket(supabase, bucket);
    outcomes.push(result);
  }

  outcomes.forEach((row) => {
    console.log(`${row.action.toUpperCase()}: ${row.name}`);
  });

  console.log("Storage bucket setup complete.");
  console.log("Reminder: apply latest SQL migrations to ensure storage object policies are in place.");
}

main().catch((error) => {
  console.error(`Storage bucket setup failed: ${error?.message || error}`);
  process.exitCode = 1;
});
