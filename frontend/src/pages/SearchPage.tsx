import { useEffect, useState, type FormEvent } from "react";
import type { DashboardClient } from "../api/client";
import type { SearchResponse } from "../api/types";
import { runtimeClient } from "../api/runtime-client";
import { PanelMessage } from "../components/PanelMessage";
import { getErrorMessage } from "../lib/errors";
import { formatDateTime } from "../lib/format";

interface SearchPageProps {
  client?: Pick<DashboardClient, "getMemoryStats" | "search">;
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: SearchResponse }
  | { status: "error"; message: string };

export function SearchPage({ client = runtimeClient }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("20");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    const loadTypes = async () => {
      try {
        const stats = await client.getMemoryStats();
        if (!cancelled) {
          setAvailableTypes(stats.memories_by_type.map((row) => row.learning_type));
        }
      } catch {
        if (!cancelled) {
          setAvailableTypes([]);
        }
      }
    };

    void loadTypes();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const toggleType = (nextType: string) => {
    setSelectedTypes((current) =>
      current.includes(nextType)
        ? current.filter((value) => value !== nextType)
        : [...current, nextType],
    );
  };

  const runSearch = async () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      setSearchState({
        status: "error",
        message: "Enter a query before submitting search.",
      });
      return;
    }

    const parsedLimit = Number(limit);
    setSearchState({ status: "loading" });

    try {
      const data = await client.search({
        query: trimmedQuery,
        memory_types: selectedTypes.length > 0 ? selectedTypes : undefined,
        limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20,
      });
      setSearchState({ status: "success", data });
    } catch (error) {
      setSearchState({
        status: "error",
        message: getErrorMessage(error, "Search failed"),
      });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch();
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Search</h2>
          <p className="page-description">
            Query `archival_memory` content and optionally restrict results by learning type.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-content">
          <form className="layout-grid" onSubmit={handleSubmit}>
            <div className="control-row">
              <div className="field grow">
                <label htmlFor="search-query-input">Search query</label>
                <input
                  id="search-query-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search archival memory content"
                />
              </div>
              <div className="field">
                <label htmlFor="search-limit-input">Limit</label>
                <input
                  id="search-limit-input"
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                />
              </div>
              <button type="button" className="primary-button" onClick={() => void runSearch()}>
                Run search
              </button>
            </div>
            {availableTypes.length > 0 ? (
              <div className="field">
                <span>Learning types</span>
                <div className="checkbox-grid">
                  {availableTypes.map((type) => (
                    <label key={type} className="checkbox-chip">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleType(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="field-hint">Learning-type filters will appear once stats are available.</p>
            )}
          </form>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-content">
          {searchState.status === "idle" ? (
            <PanelMessage
              title="No search yet"
              description="Submit a query to run `POST /api/search` against archival memory."
            />
          ) : null}

          {searchState.status === "loading" ? (
            <PanelMessage title="Searching" description="Executing the current search request." />
          ) : null}

          {searchState.status === "error" ? (
            <PanelMessage title="Search unavailable" description={searchState.message} tone="error" />
          ) : null}

          {searchState.status === "success" ? (
            searchState.data.hits.length > 0 ? (
              <div className="search-results">
                {searchState.data.hits.map((hit) => (
                  <article key={hit.id} className="result-card">
                    <h3>{hit.type ?? "unknown"}</h3>
                    <div className="result-meta">
                      <span>{hit.id}</span>
                      <span>{formatDateTime(hit.created_at)}</span>
                    </div>
                    <p className="result-snippet">{hit.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <PanelMessage
                title="No matches"
                description="The backend returned zero hits for the current query and learning-type filters."
              />
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}
