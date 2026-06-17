import { Edge, Node } from "reactflow";

export type AgentStatus = "draft" | "active" | "paused";

export interface AgentFlowPayload {
  nodes: Node[];
  edges: Edge[];
}

export interface Agent {
  id: string; // ag_xxx
  name: string;
  description?: string;
  status: AgentStatus;
  flow: AgentFlowPayload;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}