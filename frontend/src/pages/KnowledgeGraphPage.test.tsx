import { fireEvent, render, screen } from "@testing-library/react";
import type { DashboardClient } from "../api/client";
import { KnowledgeGraphPage } from "./KnowledgeGraphPage";

vi.mock("../components/GraphCanvas", () => ({
  GraphCanvas: ({
    graph,
    onSelectNode,
  }: {
    graph: { nodes: Array<{ id: string; label: string }> };
    onSelectNode: (nodeId: string) => void;
  }) => (
    <div>
      <p>Mock canvas</p>
      {graph.nodes.map((node) => (
        <button key={node.id} type="button" onClick={() => onSelectNode(node.id)}>
          {node.label}
        </button>
      ))}
    </div>
  ),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("KnowledgeGraphPage", () => {
  it("renders a loading state", () => {
    const request = deferred<Awaited<ReturnType<DashboardClient["getKnowledgeGraph"]>>>();
    const client = {
      getKnowledgeGraph: vi.fn().mockReturnValue(request.promise),
      getEntityDetail: vi.fn(),
    } as Pick<DashboardClient, "getKnowledgeGraph" | "getEntityDetail">;

    render(<KnowledgeGraphPage client={client} />);

    expect(screen.getByText("Loading graph")).toBeInTheDocument();
  });

  it("renders an error state", async () => {
    const client = {
      getKnowledgeGraph: vi.fn().mockRejectedValue(new Error("Graph exploded")),
      getEntityDetail: vi.fn(),
    } as Pick<DashboardClient, "getKnowledgeGraph" | "getEntityDetail">;

    render(<KnowledgeGraphPage client={client} />);

    expect(await screen.findByText("Graph unavailable")).toBeInTheDocument();
    expect(screen.getByText("Graph exploded")).toBeInTheDocument();
  });

  it("renders graph results and loads entity detail after selecting a node", async () => {
    const client = {
      getKnowledgeGraph: vi.fn().mockResolvedValue({
        nodes: [{ id: "entity-1", label: "Ada", type: "person", mentions: 3 }],
        edges: [],
      }),
      getEntityDetail: vi.fn().mockResolvedValue({
        entity: {
          id: "entity-1",
          display_name: "Ada",
          entity_type: "person",
          mention_count: 3,
          metadata: { role: "researcher" },
        },
        memories: ["memory-1"],
      }),
    } as Pick<DashboardClient, "getKnowledgeGraph" | "getEntityDetail">;

    render(<KnowledgeGraphPage client={client} />);

    expect(await screen.findByText("Mock canvas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ada" }));

    expect(await screen.findByText("researcher")).toBeInTheDocument();
    expect(screen.getByText("memory-1")).toBeInTheDocument();
  });
});
