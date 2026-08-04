import Link from 'next/link';
import { notFound } from 'next/navigation';
import { courseContent } from '@/content/courses';
import { domainLabels, knowledgeNodes, nodeBySlug } from '@/data/knowledge';

export function generateStaticParams() { return knowledgeNodes.map(({ slug }) => ({ slug })); }
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const node = nodeBySlug(slug); if (!node) notFound(); const Content = courseContent[slug];
  return <main className="mx-auto max-w-5xl px-6 py-12"><Link href="/map" className="text-sm text-[#667085]">← 返回知识地图</Link><div className="mt-8 grid gap-12 lg:grid-cols-[1fr_220px]"><article className="prose">{Content ? <Content /> : <><h1>{node.title}</h1><p>{node.summary}</p><h2>课程内容正在建设</h2><p>知识地图已收录本课程及其依赖关系，完整课程指南将在后续阶段补充。</p></>}</article><aside className="order-first lg:order-last"><div className="sticky top-8 rounded-xl border border-[#d7d5cd] bg-white p-5"><p className="text-xs font-bold tracking-widest text-[#667085]">课程信息</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-[#667085]">领域</dt><dd>{domainLabels[node.domain]}</dd></div><div><dt className="text-[#667085]">级别</dt><dd>{node.level}</dd></div></dl><div className="mt-5 flex flex-wrap gap-1">{node.tags.map(tag => <span key={tag} className="rounded bg-[#eeece4] px-2 py-1 text-xs">{tag}</span>)}</div></div></aside></div></main>;
}
