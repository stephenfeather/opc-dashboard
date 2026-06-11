import { useEffect, useState } from "react";
import type { DashboardClient } from "../api/client";
import type { MemoryStatsResponse } from "../api/types";
import { runtimeClient } from "../api/runtime-client";
import { PanelMessage } from "../components/PanelMessage";
import { getErrorMessage } from "../lib/errors";
import { formatNumber } from "../lib/format";

interface StatsPageProps {
  client?: Pick<DashboardClient, "getMemoryStats">;
}

type StatsState =
  | { status: "loading" }
  | { status: "success"; data: MemoryStatsResponse }
  | { status: "error"; message: string };

export function StatsPage({ client = runtimeClient }: StatsPageProps) {
  const [state, setState] = useState<StatsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ status: "loading" });

      try {
        const data = await client.getMemoryStats();
        if (!cancelled) {
          setState({ status: "success", data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: getErrorMessage(error, "Could not load memory statistics"),
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Memory Stats</h2>
          <p className="page-description">
            Totals reflect `archival_memory` plus the current knowledge graph table counts returned
            by the backend.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-content">
          {state.status === "loading" ? (
            <PanelMessage
              title="Loading stats"
              description="Requesting `/api/stats/memory` from the dashboard backend."
            />
          ) : null}

          {state.status === "error" ? (
            <PanelMessage title="Stats unavailable" description={state.message} tone="error" />
          ) : null}

          {state.status === "success" ? (
            <>
              <div className="card-grid">
                <article className="stat-card">
                  <h3>Total memories</h3>
                  <strong>{formatNumber(state.data.memories_total)}</strong>
                </article>
                <article className="stat-card">
                  <h3>KG entities</h3>
                  <strong>{formatNumber(state.data.kg.entities)}</strong>
                </article>
                <article className="stat-card">
                  <h3>KG edges</h3>
                  <strong>{formatNumber(state.data.kg.edges)}</strong>
                </article>
                <article className="stat-card">
                  <h3>Entity mentions</h3>
                  <strong>{formatNumber(state.data.kg.mentions)}</strong>
                </article>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Learning type</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.memories_by_type.map((row) => (
                      <tr key={row.learning_type}>
                        <td>{row.learning_type}</td>
                        <td>{formatNumber(row.n)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
