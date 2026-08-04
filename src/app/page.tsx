import Link from 'next/link';

export default function Home() {
  return <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-16 px-6 py-16 lg:grid-cols-[1.15fr_.85fr]">
    <section><p className="mb-5 text-sm font-semibold tracking-[.2em] text-[#8b5e34]">INTERACTIVE CURRICULUM</p>
      <h1 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight lg:text-7xl">看见知识之间的<br/><span className="text-[#326b68]">连接。</span></h1>
      <p className="mt-7 max-w-xl text-lg leading-8 text-[#667085]">一张从纯数学、计算机科学通往人工智能的交互式学习地图。理解前置关系，规划属于你的学习路径。</p>
      <Link href="/map" className="mt-9 inline-flex rounded-full bg-[#172033] px-7 py-4 font-semibold text-white transition hover:-translate-y-0.5">进入知识地图 <span className="ml-3">→</span></Link>
    </section>
    <section className="relative min-h-96 rounded-[2rem] border border-[#d7d5cd] bg-[#eeece4] p-8" aria-label="领域预览">
      <div className="absolute left-10 top-10 rounded-xl border-2 border-[#8b5e34] bg-white p-5 shadow-sm"><b>△ 纯数学</b><p className="mt-1 text-sm text-[#667085]">严谨 · 抽象 · 基础</p></div>
      <div className="absolute right-8 top-40 rounded-xl border-2 border-[#326b68] bg-white p-5 shadow-sm"><b>▣ 计算机科学</b><p className="mt-1 text-sm text-[#667085]">算法 · 系统 · 工程</p></div>
      <div className="absolute bottom-9 left-16 rounded-xl border-2 border-[#76558c] bg-white p-5 shadow-sm"><b>✦ 人工智能</b><p className="mt-1 text-sm text-[#667085]">学习 · 推理 · 创造</p></div>
      <svg className="absolute inset-0 -z-0 h-full w-full opacity-30" aria-hidden><path d="M130 110 C250 100 250 210 350 215 M350 215 C280 280 220 300 150 330" fill="none" stroke="#667085" strokeWidth="2" strokeDasharray="5 5"/></svg>
    </section>
  </main>;
}
