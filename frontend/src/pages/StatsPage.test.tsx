import { render, screen } from "@testing-library/react";
import type { DashboardClient } from "../api/client";
import { StatsPage } from "./StatsPage";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("StatsPage", () => {
  it("renders a loading state", () => {
    const request = deferred<Awaited<ReturnType<DashboardClient["getMemoryStats"]>>>();
    const client = {
      getMemoryStats: vi.fn().mockReturnValue(request.promise),
    } as Pick<DashboardClient, "getMemoryStats">;

    render(<StatsPage client={client} />);

    expect(screen.getByText("Loading stats")).toBeInTheDocument();
  });

  it("renders an error state", async () => {
    const client = {
      getMemoryStats: vi.fn().mockRejectedValue(new Error("Token rejected")),
    } as Pick<DashboardClient, "getMemoryStats">;

    render(<StatsPage client={client} />);

    expect(await screen.findByText("Stats unavailable")).toBeInTheDocument();
    expect(screen.getByText("Token rejected")).toBeInTheDocument();
  });

  it("renders totals and breakdown rows on success", async () => {
    const client = {
      getMemoryStats: vi.fn().mockResolvedValue({
        memories_total: 21,
        memories_by_type: [
          { learning_type: "fact", n: 15 },
          { learning_type: "decision", n: 6 },
        ],
        kg: { entities: 7, edges: 9, mentions: 11 },
      }),
    } as Pick<DashboardClient, "getMemoryStats">;

    render(<StatsPage client={client} />);

    expect(await screen.findByText("21")).toBeInTheDocument();
    expect(screen.getByText("fact")).toBeInTheDocument();
    expect(screen.getByText("decision")).toBeInTheDocument();
  });
});
