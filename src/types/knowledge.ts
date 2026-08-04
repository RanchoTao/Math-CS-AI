export type Domain = 'math' | 'cs' | 'ai';
export type NodeKind = 'foundation' | 'core' | 'advanced';
export type Level = 'introductory' | 'intermediate' | 'advanced';
export type EdgeType = 'prerequisite' | 'recommended' | 'application' | 'related';
export interface KnowledgeNode { id: string; slug: string; title: string; domain: Domain; kind: NodeKind; level: Level; summary: string; tags: string[]; position: { x: number; y: number } }
export interface KnowledgeEdge { id: string; source: string; target: string; type: EdgeType }
