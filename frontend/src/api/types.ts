export interface HealthLiveResponse {
  status: string;
}

export interface SchemaStatus {
  expected_version: string;
  actual_version: string | null;
  version_match: boolean;
  tables_present: string[];
  tables_missing: string[];
}

export interface HealthReadyResponse {
  status: string;
  schema: SchemaStatus;
}

export interface MemoryBreakdownRow {
  learning_type: string;
  n: number;
}

export interface MemoryStatsResponse {
  memories_total: number;
  memories_by_type: MemoryBreakdownRow[];
  kg: {
    entities?: number;
    edges?: number;
    mentions?: number;
  };
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  mentions: number;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number | null;
}

export interface KnowledgeGraphResponse {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface EntityRecord {
  id: string;
  display_name: string;
  entity_type: string;
  mention_count: number;
  metadata: Record<string, unknown> | null;
}

export interface EntityDetailResponse {
  entity: EntityRecord;
  memories: string[];
}

export interface SearchRequest {
  query: string;
  memory_types?: string[];
  limit?: number;
}

export interface SearchHit {
  id: string;
  type: string | null;
  content: string;
  created_at: string | null;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
}
