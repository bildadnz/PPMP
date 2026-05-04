
export type SlotType = 'task' | 'decision' | 'operation';
export type ConnectionType = 'dependency' | 'data-flow' | 'resource-flow' | 'informational';

export interface ProcessSlot {
  id: string;
  label: string;
  type: SlotType;
}

export interface ProcessNode {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  slots: ProcessSlot[];
  layer: number; // For horizontal positioning
  status: 'idle' | 'running' | 'success' | 'failed';
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  sourceSlotId: string;
  targetNodeId: string;
  targetSlotId: string;
  biDirectional: boolean;
  type: ConnectionType;
  label?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  cost: number;
  available: boolean;
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface NodeInsights {
  nodeId: string;
  requirements: string[];
  resources: Resource[];
  summary: string;
  executionStyle: string;
  links?: GroundingLink[];
  comparison_weight?: number;
}

export interface StoredFile {
  name: string;
  type: string;
  size: number;
  data: string; // Base64 string
}

export interface NodeDraft {
  inputText: string;
  files: StoredFile[];
  links: string[];
}

export type PageView = 'editor' | 'insights' | 'report' | 'simulation';
