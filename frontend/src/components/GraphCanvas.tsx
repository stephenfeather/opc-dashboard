import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition, type LayoutOptions } from "cytoscape";
import type { KnowledgeGraphResponse } from "../api/types";

interface GraphCanvasProps {
  graph: KnowledgeGraphResponse;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const GRAPH_STYLESHEET = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      color: "#12313c",
      "font-size": 11,
      "font-weight": 700,
      "text-wrap": "wrap",
      "text-max-width": 140,
      "background-color": "#7bd0b0",
      "border-width": 1.5,
      "border-color": "#1e6254",
      width: "mapData(mentions, 0, 30, 26, 64)",
      height: "mapData(mentions, 0, 30, 26, 64)",
    },
  },
  {
    selector: "node:selected",
    style: {
      "background-color": "#2b6f8a",
      "border-color": "#163847",
      color: "#163847",
    },
  },
  {
    selector: "edge",
    style: {
      "line-color": "#9fb7be",
      "target-arrow-color": "#9fb7be",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      width: "mapData(weight, 0, 5, 1, 5)",
      opacity: 0.82,
    },
  },
  {
    selector: "edge[relation]",
    style: {
      label: "data(relation)",
      "font-size": 9,
      color: "#516470",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.8,
      "text-background-padding": 2,
    },
  }
] as const;

function toElements(graph: KnowledgeGraphResponse, selectedNodeId: string | null): ElementDefinition[] {
  const nodeElements: ElementDefinition[] = graph.nodes.map((node) => ({
    group: "nodes",
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
      mentions: node.mentions,
    },
    selected: node.id === selectedNodeId,
  }));

  const edgeElements: ElementDefinition[] = graph.edges.map((edge) => ({
    group: "edges",
    data: {
      id: `${edge.source}-${edge.target}-${edge.relation}`,
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      weight: edge.weight ?? 1,
    },
  }));

  return [...nodeElements, ...edgeElements];
}

function getLayout(nodeCount: number): LayoutOptions {
  if (nodeCount > 110) {
    return {
      name: "grid",
      fit: true,
      padding: 40,
    };
  }

  return {
    name: "cose",
    animate: false,
    fit: true,
    padding: 50,
  };
}

export function GraphCanvas({ graph, selectedNodeId, onSelectNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const selectNodeRef = useRef(onSelectNode);

  useEffect(() => {
    selectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  useEffect(() => {
    if (containerRef.current === null) {
      return undefined;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: toElements(graph, selectedNodeId),
      style: GRAPH_STYLESHEET,
      layout: getLayout(graph.nodes.length),
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });

    cy.on("tap", "node", (event) => {
      const dataId = event.target.data("id");
      const nextId = typeof dataId === "string" ? dataId : event.target.id();
      if (nextId.length > 0) {
        selectNodeRef.current(nextId);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (cy === null) {
      return;
    }

    cy.elements().remove();
    cy.add(toElements(graph, selectedNodeId));
    cy.layout(getLayout(graph.nodes.length)).run();
    cy.fit(50);
    cy.resize();
  }, [graph, selectedNodeId]);

  return <div ref={containerRef} className="graph-canvas" aria-label="Knowledge graph canvas" />;
}
