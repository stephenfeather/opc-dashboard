import { render, screen } from "@testing-library/react";
import { HealthIndicator } from "./HealthIndicator";

describe("HealthIndicator", () => {
  it("shows degraded status when schema versions drift", async () => {
    const client = {
      getHealthReady: vi.fn().mockResolvedValue({
        status: "ok",
        schema: {
          expected_version: "2",
          actual_version: "1",
          version_match: false,
          tables_present: ["archival_memory"],
          tables_missing: [],
        },
      }),
    } as const;

    render(<HealthIndicator client={client} />);

    expect(await screen.findByText("Schema drift 2 -> 1")).toBeInTheDocument();
  });
});
