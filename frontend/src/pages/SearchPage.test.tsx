import { fireEvent, render, screen } from "@testing-library/react";
import type { DashboardClient } from "../api/client";
import { SearchPage } from "./SearchPage";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("SearchPage", () => {
  it("renders a loading state after submit", async () => {
    const request = deferred<Awaited<ReturnType<DashboardClient["search"]>>>();
    const client = {
      getMemoryStats: vi.fn().mockResolvedValue({
        memories_total: 1,
        memories_by_type: [{ learning_type: "fact", n: 1 }],
        kg: {},
      }),
      search: vi.fn().mockReturnValue(request.promise),
    } as Pick<DashboardClient, "getMemoryStats" | "search">;

    render(<SearchPage client={client} />);
    await screen.findByText("fact");

    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run search" }));

    expect(screen.getByText("Searching")).toBeInTheDocument();
  });

  it("renders an error state", async () => {
    const client = {
      getMemoryStats: vi.fn().mockResolvedValue({
        memories_total: 1,
        memories_by_type: [{ learning_type: "fact", n: 1 }],
        kg: {},
      }),
      search: vi.fn().mockRejectedValue(new Error("Search failed hard")),
    } as Pick<DashboardClient, "getMemoryStats" | "search">;

    render(<SearchPage client={client} />);
    await screen.findByText("fact");

    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run search" }));

    expect(await screen.findByText("Search unavailable")).toBeInTheDocument();
    expect(screen.getByText("Search failed hard")).toBeInTheDocument();
  });

  it("renders search results on success", async () => {
    const client = {
      getMemoryStats: vi.fn().mockResolvedValue({
        memories_total: 2,
        memories_by_type: [{ learning_type: "fact", n: 2 }],
        kg: {},
      }),
      search: vi.fn().mockResolvedValue({
        query: "ada",
        hits: [
          {
            id: "memory-1",
            type: "fact",
            content: "Ada wrote down the design notes.",
            created_at: "2026-06-10T12:00:00Z",
          },
        ],
      }),
    } as Pick<DashboardClient, "getMemoryStats" | "search">;

    render(<SearchPage client={client} />);
    await screen.findByText("fact");

    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run search" }));

    expect(await screen.findByText("Ada wrote down the design notes.")).toBeInTheDocument();
    expect(screen.getByText("memory-1")).toBeInTheDocument();
  });
});
