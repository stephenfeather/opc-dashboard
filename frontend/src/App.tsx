import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { useApiToken } from "./lib/token-store";
import { KnowledgeGraphPage } from "./pages/KnowledgeGraphPage";
import { SearchPage } from "./pages/SearchPage";
import { StatsPage } from "./pages/StatsPage";

const VIEWS = ["stats", "graph", "search"] as const;

type ViewKey = (typeof VIEWS)[number];

const VIEW_LABELS: Record<ViewKey, string> = {
  stats: "Stats",
  graph: "Knowledge Graph",
  search: "Search",
};

function parseView(hash: string): ViewKey {
  const rawView = hash.replace(/^#/, "");
  return VIEWS.includes(rawView as ViewKey) ? (rawView as ViewKey) : "stats";
}

export default function App() {
  const token = useApiToken();
  const [view, setView] = useState<ViewKey>(() =>
    typeof window === "undefined" ? "stats" : parseView(window.location.hash),
  );

  useEffect(() => {
    const handleHashChange = () => {
      setView(parseView(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleViewChange = (nextView: ViewKey) => {
    window.location.hash = nextView;
  };

  return (
    <div className="app-shell">
      <div className="app-background" />
      <Header
        activeView={view}
        onViewChange={handleViewChange}
        token={token}
        viewLabels={VIEW_LABELS}
      />
      <main className="page-shell">
        {view === "stats" ? <StatsPage /> : null}
        {view === "graph" ? <KnowledgeGraphPage /> : null}
        {view === "search" ? <SearchPage /> : null}
      </main>
    </div>
  );
}
