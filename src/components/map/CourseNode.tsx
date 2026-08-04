import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { KnowledgeNode } from '@/types/knowledge';

export type CourseFlowNode = KnowledgeNode & { dimmed?: boolean; emphasized?: boolean };
const domainMeta = { math: ['△','数学','border-[#a66a3f]'], cs: ['▣','计算机','border-[#287873]'], ai: ['✦','AI','border-[#76558c]'] } as const;
export function CourseNode({ data, selected }: NodeProps) {
  const course = data as unknown as CourseFlowNode;
  const [icon,label,border] = domainMeta[course.domain];
  return <div className={`w-44 rounded-xl border-l-4 bg-white px-4 py-3 shadow-sm transition ${border} ${course.dimmed ? 'opacity-25' : ''} ${selected || course.emphasized ? 'ring-2 ring-[#172033] ring-offset-2' : ''}`}>
    <Handle type="target" position={Position.Top} className="!invisible"/><div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#667085]">{icon} {label} · {course.level === 'introductory' ? '入门' : course.level === 'intermediate' ? '进阶' : '高级'}</div><div className="font-semibold">{course.title}</div><Handle type="source" position={Position.Bottom} className="!invisible"/>
  </div>;
}
