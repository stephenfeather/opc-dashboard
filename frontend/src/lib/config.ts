const DEFAULT_API_BASE = "http://127.0.0.1:8000";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const envValue = import.meta.env.VITE_API_BASE?.trim();
  return trimTrailingSlash(envValue && envValue.length > 0 ? envValue : DEFAULT_API_BASE);
}

export function getEnvApiToken(): string {
  return import.meta.env.VITE_API_TOKEN?.trim() ?? "";
}
