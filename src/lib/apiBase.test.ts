import { describe, expect, it, vi } from "vitest";
import { getApiBase, getApiUrl } from "./apiBase";

describe("apiBase helpers", () => {
  it("prefers VITE_API_BASE over VITE_API_URL", () => {
    vi.stubEnv("VITE_API_BASE", "https://api.example.com/api/");
    vi.stubEnv("VITE_API_URL", "https://legacy.example.com/api");

    expect(getApiBase()).toBe("https://api.example.com/api");
    expect(getApiUrl("/auth/me")).toBe("https://api.example.com/api/auth/me");

    vi.unstubAllEnvs();
  });

  it("falls back to VITE_API_URL when VITE_API_BASE is unset", () => {
    vi.stubEnv("VITE_API_BASE", "");
    vi.stubEnv("VITE_API_URL", "https://legacy.example.com/api/");

    expect(getApiBase()).toBe("https://legacy.example.com/api");
    expect(getApiUrl("upload")).toBe("https://legacy.example.com/api/upload");

    vi.unstubAllEnvs();
  });

  it("uses same-origin /api when no frontend env is provided", () => {
    vi.stubEnv("VITE_API_BASE", "");
    vi.stubEnv("VITE_API_URL", "");

    expect(getApiBase()).toBe("/api");
    expect(getApiUrl("/auth/signin")).toBe("/api/auth/signin");

    vi.unstubAllEnvs();
  });
});
