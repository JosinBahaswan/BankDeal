function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function boolEnv(key, defaultValue = false) {
  const raw = asText(import.meta.env[key]).toLowerCase();
  if (!raw) return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes";
}

export function isCapacitorRuntime() {
  if (typeof window === "undefined") return false;
  const capacitor = window.Capacitor;
  if (!capacitor || typeof capacitor.isNativePlatform !== "function") return false;
  return Boolean(capacitor.isNativePlatform());
}

export function isCapacitorEnabled() {
  return boolEnv("VITE_CAPACITOR_ENABLED", false);
}

function cameraExtension(formatHint) {
  const normalized = asText(formatHint).toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("heic")) return "heic";
  if (normalized.includes("webp")) return "webp";
  return "jpeg";
}

export async function capturePhotoBlob(options = {}) {
  if (!isCapacitorEnabled() || !isCapacitorRuntime()) {
    return null;
  }

  const cameraEnabled = boolEnv("VITE_CAPACITOR_CAMERA_ENABLED", true);
  if (!cameraEnabled) {
    return null;
  }

  const cameraPlugin = await import("@capacitor/camera");
  const Camera = cameraPlugin?.Camera;
  const CameraResultType = cameraPlugin?.CameraResultType;
  const CameraSource = cameraPlugin?.CameraSource;

  if (!Camera || !CameraResultType || !CameraSource) {
    throw new Error("Capacitor Camera plugin is unavailable");
  }

  const quality = Number(options.quality || 82);
  const result = await Camera.getPhoto({
    quality: Number.isFinite(quality) ? quality : 82,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    allowEditing: false,
  });

  if (!result?.webPath) {
    throw new Error("Camera did not return a file path");
  }

  const response = await fetch(result.webPath);
  if (!response.ok) {
    throw new Error("Unable to read captured photo");
  }

  const blob = await response.blob();
  return {
    blob,
    webPath: result.webPath,
    extension: cameraExtension(result.format),
    contentType: blob.type || "image/jpeg",
  };
}

export async function bootstrapMobileRuntime(input = {}) {
  const onPushToken = typeof input.onPushToken === "function" ? input.onPushToken : null;
  const onError = typeof input.onError === "function" ? input.onError : null;

  if (!isCapacitorEnabled() || !isCapacitorRuntime()) {
    return () => {};
  }

  if (!boolEnv("VITE_CAPACITOR_PUSH_ENABLED", false)) {
    return () => {};
  }

  const handles = [];

  try {
    const pushModule = await import("@capacitor/push-notifications");
    const PushNotifications = pushModule?.PushNotifications;
    if (!PushNotifications) {
      throw new Error("Capacitor PushNotifications plugin is unavailable");
    }

    const permission = await PushNotifications.requestPermissions();
    if (permission?.receive !== "granted") {
      return () => {};
    }

    const registrationHandle = await PushNotifications.addListener("registration", (token) => {
      if (!token?.value || !onPushToken) return;
      onPushToken(token.value);
    });

    const errorHandle = await PushNotifications.addListener("registrationError", (error) => {
      if (!onError) return;
      onError(new Error(asText(error?.error, "Push registration failed")));
    });

    handles.push(registrationHandle, errorHandle);
    await PushNotifications.register();
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error : new Error("Mobile runtime bootstrap failed"));
    }
  }

  return () => {
    handles.forEach((handle) => {
      if (handle && typeof handle.remove === "function") {
        handle.remove().catch(() => {
          // no-op
        });
      }
    });
  };
}
