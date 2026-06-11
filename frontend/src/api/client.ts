import type {
  EntityDetailResponse,
  HealthLiveResponse,
  HealthReadyResponse,
  KnowledgeGraphResponse,
  MemoryStatsResponse,
  SearchRequest,
  SearchResponse,
} from "./types";

export type ApiErrorCode = "http" | "network" | "unauthorized";

export interface ApiClientOptions {
  baseUrl: string;
  token?: string | null;
  fetcher?: typeof fetch;
}

export interface GraphRequestOptions {
  entityType?: string;
  limit?: number;
}

export interface DashboardClient {
  getHealthLive(): Promise<HealthLiveResponse>;
  getHealthReady(): Promise<HealthReadyResponse>;
  getMemoryStats(): Promise<MemoryStatsResponse>;
  getKnowledgeGraph(options?: GraphRequestOptions): Promise<KnowledgeGraphResponse>;
  getEntityDetail(entityId: string): Promise<EntityDetailResponse>;
  search(request: SearchRequest): Promise<SearchResponse>;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;

  constructor(message: string, code: ApiErrorCode, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveUrl(pathname: string, options: ApiClientOptions, query?: Record<string, string | number>) {
  const url = new URL(pathname, `${trimTrailingSlash(options.baseUrl)}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function parseErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { detail?: unknown };

    if (typeof payload.detail === "string" && payload.detail.length > 0) {
      return payload.detail;
    }

    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
        .join(", ");
    }
  } else {
    const text = (await response.text()).trim();

    if (text.length > 0) {
      return text;
    }
  }

  return response.statusText || "Request failed";
}

async function requestJson<T>(
  pathname: string,
  options: ApiClientOptions,
  init?: RequestInit,
  query?: Record<string, string | number>,
  auth = false,
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const token = options.token?.trim();
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetcher(resolveUrl(pathname, options, query), requestInit);

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      if (response.status === 401) {
        throw new ApiError(
          `Authentication required. Update the API token in the header. ${message}`.trim(),
          "unauthorized",
          response.status,
        );
      }

      throw new ApiError(message, "http", response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      "network",
    );
  }
}

export async function fetchHealthLive(options: ApiClientOptions): Promise<HealthLiveResponse> {
  return requestJson<HealthLiveResponse>("/api/health/live", options);
}

export async function fetchHealthReady(options: ApiClientOptions): Promise<HealthReadyResponse> {
  return requestJson<HealthReadyResponse>("/api/health/ready", options);
}

export async function fetchMemoryStats(options: ApiClientOptions): Promise<MemoryStatsResponse> {
  return requestJson<MemoryStatsResponse>("/api/stats/memory", options, undefined, undefined, true);
}

export async function fetchKnowledgeGraph(
  options: ApiClientOptions,
  request: GraphRequestOptions = {},
): Promise<KnowledgeGraphResponse> {
  const query: Record<string, string | number> = {};

  if (request.entityType && request.entityType.length > 0) {
    query.entity_type = request.entityType;
  }

  if (request.limit) {
    query.limit = request.limit;
  }

  return requestJson<KnowledgeGraphResponse>(
    "/api/kg/graph",
    options,
    undefined,
    query,
    true,
  );
}

export async function fetchEntityDetail(
  options: ApiClientOptions,
  entityId: string,
): Promise<EntityDetailResponse> {
  return requestJson<EntityDetailResponse>(
    `/api/kg/entities/${encodeURIComponent(entityId)}`,
    options,
    undefined,
    undefined,
    true,
  );
}

export async function searchMemories(
  options: ApiClientOptions,
  request: SearchRequest,
): Promise<SearchResponse> {
  return requestJson<SearchResponse>(
    "/api/search",
    options,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: request.query,
        memory_types: request.memory_types,
        limit: request.limit ?? 20,
      }),
    },
    undefined,
    true,
  );
}

export function createDashboardClient(getOptions: () => ApiClientOptions): DashboardClient {
  return {
    getHealthLive: () => fetchHealthLive(getOptions()),
    getHealthReady: () => fetchHealthReady(getOptions()),
    getMemoryStats: () => fetchMemoryStats(getOptions()),
    getKnowledgeGraph: (options) => fetchKnowledgeGraph(getOptions(), options),
    getEntityDetail: (entityId) => fetchEntityDetail(getOptions(), entityId),
    search: (request) => searchMemories(getOptions(), request),
  };
}
