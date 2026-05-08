import { resolveApiBase } from "@/lib/apiBase";

type UploadResponse = {
  urls?: string[];
  error?: string;
  message?: string;
};

function uploadUrl() {
  return `${resolveApiBase()}/upload`;
}

function apiOrigin() {
  return new URL(resolveApiBase(), window.location.origin).origin;
}

function normalizeUploadUrl(url: string) {
  return new URL(url, apiOrigin()).toString();
}

function uploadErrorMessage(payload: UploadResponse | null) {
  return payload?.message || payload?.error || "อัปโหลดรูปไม่สำเร็จ";
}

export async function uploadImages(files: FileList | File[]) {
  const form = new FormData();
  Array.from(files).forEach((file) => {
    form.append("images", file);
  });

  let response: Response;
  try {
    response = await fetch(uploadUrl(), {
      method: "POST",
      body: form,
      credentials: "include",
    });
  } catch {
    throw new Error("เชื่อมต่อ API อัปโหลดไม่ได้");
  }

  let payload: UploadResponse | null = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error("API อัปโหลดไม่ได้ส่ง JSON กลับมา");
  }

  if (!response.ok || !payload) {
    throw new Error(uploadErrorMessage(payload));
  }

  return (payload.urls || []).map(normalizeUploadUrl);
}
