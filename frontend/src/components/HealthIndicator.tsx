import { useEffect, useState } from "react";
import type { DashboardClient } from "../api/client";
import type { HealthReadyResponse } from "../api/types";
import { runtimeClient } from "../api/runtime-client";
import { getErrorMessage } from "../lib/errors";

interface HealthIndicatorProps {
  client?: Pick<DashboardClient, "getHealthReady">;
}

type HealthState =
  | { status: "loading" }
  | { status: "ready"; data: HealthReadyResponse }
  | { status: "error"; message: string };

function getBadgeProps(state: HealthState): { className: string; label: string } {
  if (state.status === "loading") {
    return { className: "badge loading", label: "Checking API" };
  }

  if (state.status === "error") {
    return { className: "badge error", label: "API unavailable" };
  }

  const schema = state.data.schema;
  const drifted = !schema.version_match || schema.tables_missing.length > 0;

  if (drifted) {
    const actual = schema.actual_version ?? "unset";
    return {
      className: "badge warn",
      label: `Schema drift ${schema.expected_version} -> ${actual}`,
    };
  }

  return {
    className: "badge ok",
    label: `Ready v${schema.actual_version ?? schema.expected_version}`,
  };
}

export function HealthIndicator({ client = runtimeClient }: HealthIndicatorProps) {
  const [state, setState] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await client.getHealthReady();
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: getErrorMessage(error, "Health check failed"),
          });
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [client]);

  const badgeProps = getBadgeProps(state);
  const description =
    state.status === "error"
      ? state.message
      : state.status === "ready"
        ? `${state.data.schema.tables_present.length} tables present`
        : "Polling /api/health/ready";

  return (
    <div className="token-panel">
      <div className={badgeProps.className} aria-live="polite">
        {badgeProps.label}
      </div>
      <p className="field-hint">{description}</p>
    </div>
  );
}
