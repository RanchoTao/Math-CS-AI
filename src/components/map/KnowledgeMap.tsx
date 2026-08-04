'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { domainLabels, knowledgeEdges, knowledgeNodes } from '@/data/knowledge';
import type { Domain } from '@/types/knowledge';
import { CourseNode, type CourseFlowNode } from './CourseNode';

const nodeTypes = { course: CourseNode };
const edgeColors = { prerequisite: '#344054', recommended: '#a66a3f', application: '#287873', related: '#8b8d91' };
const edgeLabels = { prerequisite: '严格前置', recommended: '建议先学', application: '应用于', related: '相关' };

export function KnowledgeMap() {
  const [query, setQuery] = useState(''); const [domain, setDomain] = useState<Domain | 'all'>('all'); const [selectedId, setSelectedId] = useState<string>();
  const selected = knowledgeNodes.find((node) => node.id === selectedId);
  const neighbors = useMemo(() => new Set(knowledgeEdges.flatMap((edge) => edge.source === selectedId ? [edge.target] : edge.target === selectedId ? [edge.source] : [])), [selectedId]);
  const visible = useMemo(() => new Set(knowledgeNodes.filter((node) => (domain === 'all' || node.domain === domain) && (`${node.title}${node.tags.join('')}`).toLowerCase().includes(query.toLowerCase())).map((node) => node.id)), [domain, query]);
  const nodes: Node[] = knowledgeNodes.map((node) => ({ id: node.id, type: 'course', position: node.position, draggable: false, selectable: true, hidden: !visible.has(node.id), data: { ...node, dimmed: Boolean(selectedId && node.id !== selectedId && !neighbors.has(node.id)), emphasized: neighbors.has(node.id) } satisfies CourseFlowNode }));
  const edges: Edge[] = knowledgeEdges.map((edge) => ({ ...edge, hidden: !visible.has(edge.source) || !visible.has(edge.target), animated: edge.type === 'application', style: { stroke: edgeColors[edge.type], strokeWidth: selectedId && (edge.source === selectedId || edge.target === selectedId) ? 3 : 1.5, opacity: selectedId && edge.source !== selectedId && edge.target !== selectedId ? .12 : .8 }, markerEnd: { type: MarkerType.ArrowClosed, color: edgeColors[edge.type] } }));
  return <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#f4f2eb]">
    <div className="flex flex-wrap items-center gap-3 border-b border-[#d7d5cd] bg-[#faf9f5] px-5 py-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索课程…" aria-label="搜索课程" className="w-64 rounded-lg border border-[#d0cec7] bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#326b68]"/>
      <div className="flex gap-1" aria-label="领域筛选">{(['all','math','cs','ai'] as const).map((item) => <button key={item} onClick={() => setDomain(item)} className={`rounded-full px-4 py-2 text-sm ${domain === item ? 'bg-[#172033] text-white' : 'bg-white text-[#667085]'}`}>{item === 'all' ? '全部领域' : domainLabels[item]}</button>)}</div>
      <div className="ml-auto hidden gap-4 text-xs text-[#667085] xl:flex">{Object.entries(edgeLabels).map(([key,label]) => <span key={key}><i className="mr-1 inline-block h-0.5 w-5 align-middle" style={{background: edgeColors[key as keyof typeof edgeColors]}}/> {label}</span>)}</div>
    </div>
    <div className="hidden min-h-0 flex-1 md:flex"><div className="min-w-0 flex-1"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} fitView fitViewOptions={{ padding: .12 }} minZoom={.25} onNodeClick={(_,node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(undefined)}><Background color="#d5d2c8" gap={24}/><Controls showInteractive={false}/><MiniMap pannable zoomable nodeColor={(node) => { const d = node.data as unknown as CourseFlowNode; return d.domain === 'math' ? '#a66a3f' : d.domain === 'cs' ? '#287873' : '#76558c'; }}/></ReactFlow></div>
      {selected && <aside className="w-80 overflow-y-auto border-l border-[#d7d5cd] bg-[#faf9f5] p-6"><button onClick={() => setSelectedId(undefined)} className="float-right text-xl text-[#667085]" aria-label="关闭详情">×</button><p className="text-xs font-bold tracking-widest text-[#667085]">{domainLabels[selected.domain]} · {selected.kind.toUpperCase()}</p><h2 className="mt-3 text-2xl font-bold">{selected.title}</h2><p className="mt-4 leading-7 text-[#667085]">{selected.summary}</p><div className="mt-5 flex flex-wrap gap-2">{selected.tags.map(tag => <span key={tag} className="rounded bg-[#eeece4] px-2 py-1 text-xs">{tag}</span>)}</div><h3 className="mt-8 font-semibold">直接知识连接</h3><ul className="mt-3 space-y-2 text-sm text-[#667085]">{knowledgeNodes.filter(n => neighbors.has(n.id)).map(n => <li key={n.id}>→ {n.title}</li>)}</ul><Link href={`/course/${selected.slug}`} className="mt-8 block rounded-lg bg-[#172033] px-5 py-3 text-center font-semibold text-white">进入课程 →</Link></aside>}
    </div>
    <div className="flex-1 overflow-y-auto p-4 md:hidden"><p className="mb-4 text-sm text-[#667085]">移动端以课程列表呈现；请使用桌面设备探索完整关系图。</p><div className="space-y-3">{knowledgeNodes.filter(n => visible.has(n.id)).map(n => <Link key={n.id} href={`/course/${n.slug}`} className="block rounded-xl border border-[#d7d5cd] bg-white p-4"><span className="text-xs text-[#667085]">{domainLabels[n.domain]}</span><h2 className="font-semibold">{n.title}</h2><p className="mt-1 text-sm text-[#667085]">{n.summary}</p></Link>)}</div></div>
  </div>;
}
