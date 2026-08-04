import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: 'Math · CS · AI', description: '从基础理论到智能系统的交互式知识地图' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><header className="flex h-16 items-center justify-between border-b border-[#ddd9cf] bg-[#faf9f5] px-6 lg:px-10">
    <Link href="/" className="font-bold tracking-tight">MATH · CS · AI</Link>
    <nav className="flex gap-6 text-sm text-[#667085]"><Link href="/map">知识地图</Link><a href="https://github.com" aria-label="项目仓库">关于项目</a></nav>
  </header>{children}</body></html>;
}
