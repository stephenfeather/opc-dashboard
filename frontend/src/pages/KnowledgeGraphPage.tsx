import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { DashboardClient } from "../api/client";
import type { EntityDetailResponse, KnowledgeGraphResponse } from "../api/types";
import { runtimeClient } from "../api/runtime-client";
import { GraphCanvas } from "../components/GraphCanvas";
import { PanelMessage } from "../components/PanelMessage";
import { getErrorMessage } from "../lib/errors";
import { formatNumber } from "../lib/format";

interface KnowledgeGraphPageProps {
  client?: Pick<DashboardClient, "getKnowledgeGraph" | "getEntityDetail">;
}

type GraphState =
  | { status: "loading" }
  | { status: "success"; data: KnowledgeGraphResponse }
  | { status: "error"; message: string };

type DetailState =
  | { status: "idle" }
  | { status: "loading"; entityId: string }
  | { status: "success"; data: EntityDetailResponse }
  | { status: "error"; message: string };

const DEFAULT_LIMIT = 200;

export function KnowledgeGraphPage({ client = runtimeClient }: KnowledgeGraphPageProps) {
  const [entityType, setEntityType] = useState("");
  const [limitInput, setLimitInput] = useState(String(DEFAULT_LIMIT));
  const [request, setRequest] = useState({ entityType: "", limit: DEFAULT_LIMIT });
  const [graphState, setGraphState] = useState<GraphState>({ status: "loading" });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setGraphState({ status: "loading" });

      try {
        const data = await client.getKnowledgeGraph(request);
        if (!cancelled) {
          setGraphState({ status: "success", data });

          if (selectedNodeId && !data.nodes.some((node) => node.id === selectedNodeId)) {
            setSelectedNodeId(null);
            setDetailState({ status: "idle" });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setGraphState({
            status: "error",
            message: getErrorMessage(error, "Could not load graph data"),
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [client, request, selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId === null) {
      setDetailState({ status: "idle" });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setDetailState({ status: "loading", entityId: selectedNodeId });

      try {
        const data = await client.getEntityDetail(selectedNodeId);
        if (!cancelled) {
          setDetailState({ status: "success", data });
        }
      } catch (error) {
        if (!cancelled) {
          setDetailState({
            status: "error",
            message: getErrorMessage(error, "Could not load entity detail"),
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [client, selectedNodeId]);

  const availableTypes = useMemo(() => {
    if (graphState.status !== "success") {
      return [];
    }

    return Array.from(new Set(graphState.data.nodes.map((node) => node.type))).sort();
  }, [graphState]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedLimit = Number(limitInput);
    setRequest({
      entityType: entityType.trim(),
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT,
    });
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Knowledge Graph</h2>
          <p className="page-description">
            Render `/api/kg/graph`, filter by entity type, and tap a node to inspect metadata and
            memory mentions.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-content">
          <form className="control-row" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="entity-type-select">Entity type</label>
              <select
                id="entity-type-select"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
              >
                <option value="">All types</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="graph-limit-input">Node limit</label>
              <input
                id="graph-limit-input"
                type="number"
                min={1}
                max={2000}
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
              />
            </div>
            <button type="submit" className="primary-button">
              Refresh graph
            </button>
          </form>
        </div>
      </div>

      <div className="layout-grid graph-layout" style={{ marginTop: "1rem" }}>
        <div className="panel">
          <div className="panel-content">
            {graphState.status === "loading" ? (
              <PanelMessage
                title="Loading graph"
                description="Requesting graph nodes and edges from `/api/kg/graph`."
              />
            ) : null}

            {graphState.status === "error" ? (
              <PanelMessage title="Graph unavailable" description={graphState.message} tone="error" />
            ) : null}

            {graphState.status === "success" ? (
              <>
                <div className="graph-summary">
                  <span className="pill">{formatNumber(graphState.data.nodes.length)} nodes</span>
                  <span className="pill">{formatNumber(graphState.data.edges.length)} edges</span>
                  <span className="pill">
                    Filter {request.entityType.length > 0 ? request.entityType : "all"}
                  </span>
                </div>
                {graphState.data.nodes.length > 0 ? (
                  <GraphCanvas
                    graph={graphState.data}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                  />
                ) : (
                  <PanelMessage
                    title="No graph data"
                    description="The selected filter returned zero nodes. Try a higher limit or clear the entity type filter."
                  />
                )}
              </>
            ) : null}
          </div>
        </div>

        <aside className="panel">
          <div className="panel-content">
            {detailState.status === "idle" ? (
              <PanelMessage
                title="Select a node"
                description="Choose a graph node to fetch `/api/kg/entities/{uuid}` and inspect its linked memory IDs."
              />
            ) : null}

            {detailState.status === "loading" ? (
              <PanelMessage
                title="Loading entity"
                description={`Fetching detail for ${detailState.entityId}.`}
              />
            ) : null}

            {detailState.status === "error" ? (
              <PanelMessage
                title="Entity unavailable"
                description={detailState.message}
                tone="error"
              />
            ) : null}

            {detailState.status === "success" ? (
              <div className="detail-list">
                <div className="detail-card">
                  <h3>{detailState.data.entity.display_name}</h3>
                  <div className="result-meta">
                    <span>{detailState.data.entity.entity_type}</span>
                    <span>{formatNumber(detailState.data.entity.mention_count)} mentions</span>
                  </div>
                </div>
                <div className="detail-card">
                  <h3>Metadata</h3>
                  {detailState.data.entity.metadata &&
                  Object.keys(detailState.data.entity.metadata).length > 0 ? (
                    <dl className="metadata-list">
                      {Object.entries(detailState.data.entity.metadata).map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="muted-copy">No metadata returned for this entity.</p>
                  )}
                </div>
                <div className="detail-card">
                  <h3>Mentioning memories</h3>
                  {detailState.data.memories.length > 0 ? (
                    <ol className="memory-list">
                      {detailState.data.memories.map((memoryId) => (
                        <li key={memoryId}>{memoryId}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted-copy">No memory IDs were returned.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
