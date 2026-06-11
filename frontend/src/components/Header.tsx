import { HealthIndicator } from "./HealthIndicator";
import { setApiToken } from "../lib/token-store";

interface HeaderProps<TView extends string> {
  activeView: TView;
  onViewChange: (view: TView) => void;
  token: string;
  viewLabels: Record<TView, string>;
}

export function Header<TView extends string>({
  activeView,
  onViewChange,
  token,
  viewLabels,
}: HeaderProps<TView>) {
  return (
    <header className="hero-panel panel">
      <div className="panel-content">
        <div className="hero-copy">
          <span className="eyebrow">Operational Context Platform</span>
          <h1 className="hero-title">Memory, graph, and search in one cockpit.</h1>
          <p className="hero-subtitle">
            Watch readiness drift, inspect entity topology, and pull archival memory slices
            without bouncing between curl commands.
          </p>
          <nav className="nav-cluster" aria-label="Dashboard views">
            {Object.entries(viewLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`nav-button ${key === activeView ? "active" : ""}`}
                aria-current={key === activeView ? "page" : undefined}
                onClick={() => onViewChange(key as TView)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="token-panel">
          <HealthIndicator />
          <div className="token-label">
            <label htmlFor="token-input">API token</label>
            <p>{token.length > 0 ? "Persisted in localStorage" : "Falls back to VITE_API_TOKEN"}</p>
          </div>
          <div className="token-row">
            <div className="field grow">
              <input
                id="token-input"
                type="password"
                value={token}
                placeholder="Paste bearer token"
                onChange={(event) => setApiToken(event.target.value)}
                autoComplete="off"
              />
            </div>
            <button type="button" className="secondary-button" onClick={() => setApiToken("")}>
              Clear
            </button>
          </div>
          <p className="field-hint">
            Auth failures from protected routes include a direct prompt to update this field.
          </p>
        </div>
      </div>
    </header>
  );
}
