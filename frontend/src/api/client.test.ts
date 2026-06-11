import {
  ApiError,
  fetchEntityDetail,
  fetchHealthLive,
  fetchHealthReady,
  fetchKnowledgeGraph,
  fetchMemoryStats,
  searchMemories,
  type ApiClientOptions,
} from "./client";

const baseOptions: ApiClientOptions = {
  baseUrl: "http://127.0.0.1:8000",
  token: "secret-token",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("api client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads /api/health/live successfully", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok" }));

    const data = await fetchHealthLive(baseOptions);

    expect(data).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/health/live", "http://127.0.0.1:8000/"),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );

    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? new Headers()) as Headers;
    expect(headers.get("Authorization")).toBe(null);
  });

  it("surfaces 401 errors for /api/health/live", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Invalid token" }, 401));

    await expect(fetchHealthLive(baseOptions)).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
  });

  it("surfaces network errors for /api/health/live", async () => {
    fetchMock.mockRejectedValue(new Error("socket hang up"));

    await expect(fetchHealthLive(baseOptions)).rejects.toMatchObject({
      code: "network",
      message: "socket hang up",
    });
  });

  it("loads /api/health/ready successfully", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: "ok",
        schema: {
          expected_version: "1",
          actual_version: "1",
          version_match: true,
          tables_present: ["archival_memory"],
          tables_missing: [],
        },
      }),
    );

    const data = await fetchHealthReady(baseOptions);

    expect(data.schema.version_match).toBe(true);
  });

  it("surfaces 401 errors for /api/health/ready", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Invalid token" }, 401));

    await expect(fetchHealthReady(baseOptions)).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
  });

  it("surfaces network errors for /api/health/ready", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(fetchHealthReady(baseOptions)).rejects.toMatchObject({
      code: "network",
      message: "offline",
    });
  });

  it("loads /api/stats/memory successfully", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        memories_total: 12,
        memories_by_type: [{ learning_type: "fact", n: 9 }],
        kg: { entities: 2, edges: 3, mentions: 4 },
      }),
    );

    const data = await fetchMemoryStats(baseOptions);

    expect(data.memories_total).toBe(12);
    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? new Headers()) as Headers;
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
  });

  it("surfaces 401 errors for /api/stats/memory", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Missing token" }, 401));

    await expect(fetchMemoryStats(baseOptions)).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("surfaces network errors for /api/stats/memory", async () => {
    fetchMock.mockRejectedValue(new Error("gateway timeout"));

    await expect(fetchMemoryStats(baseOptions)).rejects.toMatchObject({
      code: "network",
      message: "gateway timeout",
    });
  });

  it("loads /api/kg/graph successfully", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ nodes: [], edges: [] }));

    await fetchKnowledgeGraph(baseOptions, { entityType: "person", limit: 40 });

    const url = fetchMock.mock.calls[0]?.[0];
    expect(String(url)).toContain("entity_type=person");
    expect(String(url)).toContain("limit=40");
  });

  it("surfaces 401 errors for /api/kg/graph", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Invalid token" }, 401));

    await expect(fetchKnowledgeGraph(baseOptions)).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("surfaces network errors for /api/kg/graph", async () => {
    fetchMock.mockRejectedValue(new Error("connection reset"));

    await expect(fetchKnowledgeGraph(baseOptions)).rejects.toMatchObject({
      code: "network",
      message: "connection reset",
    });
  });

  it("loads /api/kg/entities/{uuid} successfully", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        entity: {
          id: "abc",
          display_name: "Ada",
          entity_type: "person",
          mention_count: 3,
          metadata: { role: "researcher" },
        },
        memories: ["m-1"],
      }),
    );

    const data = await fetchEntityDetail(baseOptions, "abc-123");

    expect(data.entity.display_name).toBe("Ada");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/kg/entities/abc-123");
  });

  it("surfaces 401 errors for /api/kg/entities/{uuid}", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Invalid token" }, 401));

    await expect(fetchEntityDetail(baseOptions, "abc")).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("surfaces network errors for /api/kg/entities/{uuid}", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(fetchEntityDetail(baseOptions, "abc")).rejects.toMatchObject({
      code: "network",
    });
  });

  it("loads POST /api/search successfully", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ query: "ada", hits: [] }));

    await searchMemories(baseOptions, {
      query: "ada",
      memory_types: ["fact"],
      limit: 5,
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"query":"ada","memory_types":["fact"],"limit":5}');
  });

  it("surfaces 401 errors for POST /api/search", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Invalid token" }, 401));

    await expect(searchMemories(baseOptions, { query: "ada" })).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("surfaces network errors for POST /api/search", async () => {
    fetchMock.mockRejectedValue(new Error("refused"));

    await expect(searchMemories(baseOptions, { query: "ada" })).rejects.toMatchObject({
      code: "network",
      message: "refused",
    });
  });

  it("keeps ApiError identity for callers that need branching", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Invalid token" }, 401));

    await expect(fetchMemoryStats(baseOptions)).rejects.toBeInstanceOf(ApiError);
  });
});
