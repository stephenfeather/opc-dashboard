import { createDashboardClient, type ApiClientOptions } from "./client";
import { getApiBaseUrl } from "../lib/config";
import { getApiToken } from "../lib/token-store";

function getRuntimeOptions(): ApiClientOptions {
  return {
    baseUrl: getApiBaseUrl(),
    token: getApiToken(),
  };
}

export const runtimeClient = createDashboardClient(getRuntimeOptions);
