import { useSyncExternalStore } from "react";
import { getEnvApiToken } from "./config";

const TOKEN_STORAGE_KEY = "opc-dashboard.api-token";
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readInitialToken(): string {
  if (isBrowser()) {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken !== null) {
      return storedToken;
    }
  }

  return getEnvApiToken();
}

let apiToken = readInitialToken();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function getApiToken(): string {
  return apiToken;
}

export function setApiToken(nextToken: string) {
  apiToken = nextToken.trim();

  if (isBrowser()) {
    if (apiToken.length > 0) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, apiToken);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApiToken(): string {
  return useSyncExternalStore(subscribe, getApiToken, getEnvApiToken);
}

export function resetTokenStoreForTests() {
  apiToken = getEnvApiToken();
  emitChange();
}
