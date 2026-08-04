import type { Domain, EdgeType, KnowledgeEdge, KnowledgeNode, Level, NodeKind } from '@/types/knowledge';

const domainX: Record<Domain, number> = { math: 0, cs: 430, ai: 860 };
type Seed = [slug: string, title: string, domain: Domain, level: Level];
const seeds: Seed[] = [
  ['proof-logic','证明与逻辑','math','introductory'], ['calculus','微积分','math','introductory'], ['linear-algebra','线性代数','math','introductory'], ['discrete-math','离散数学','math','introductory'], ['mathematical-analysis','数学分析','math','intermediate'], ['real-analysis','实分析','math','advanced'], ['abstract-algebra','抽象代数','math','advanced'], ['topology','拓扑学','math','advanced'], ['probability','概率论','math','intermediate'], ['mathematical-statistics','数理统计','math','intermediate'], ['ode','常微分方程','math','intermediate'], ['pde','偏微分方程','math','advanced'], ['numerical-analysis','数值分析','math','intermediate'], ['optimization','最优化','math','intermediate'], ['stochastic-processes','随机过程','math','advanced'],
  ['python','Python','cs','introductory'], ['cpp','C++','cs','introductory'], ['data-structures','数据结构','cs','introductory'], ['algorithm-design','算法设计','cs','intermediate'], ['computer-organization','计算机组成','cs','intermediate'], ['operating-systems','操作系统','cs','intermediate'], ['computer-networks','计算机网络','cs','intermediate'], ['databases','数据库','cs','intermediate'], ['software-engineering','软件工程','cs','intermediate'], ['programming-languages','编程语言','cs','advanced'], ['compilers','编译原理','cs','advanced'], ['distributed-systems','分布式系统','cs','advanced'], ['computational-complexity','计算复杂性','cs','advanced'],
  ['machine-learning','机器学习','ai','intermediate'], ['deep-learning','深度学习','ai','intermediate'], ['computer-vision','计算机视觉','ai','advanced'], ['nlp','自然语言处理','ai','advanced'], ['reinforcement-learning','强化学习','ai','advanced'], ['generative-models','生成模型','ai','advanced'], ['transformer','Transformer','ai','advanced'], ['large-language-models','大语言模型','ai','advanced'], ['ai-agent','AI Agent','ai','advanced'], ['ai-systems','AI系统','ai','advanced'], ['world-models','世界模型','ai','advanced']
];
const descriptions: Partial<Record<string,string>> = {
  'linear-algebra':'研究向量、矩阵与线性变换，是现代计算与机器学习的共同语言。', 'mathematical-analysis':'用极限与严谨证明重新理解微积分，为高等分析奠定基础。',
  'data-structures':'学习组织数据的经典结构，并分析操作的时间与空间代价。', 'machine-learning':'从数据中学习规律，掌握监督学习、泛化与模型评估。', 'deep-learning':'用多层神经网络学习表示，连接理论、训练方法与实际任务。'
};
const counts: Record<Domain, number> = { math: 0, cs: 0, ai: 0 };
export const knowledgeNodes: KnowledgeNode[] = seeds.map(([slug,title,domain,level], index) => {
  const row = counts[domain]++;
  const kind: NodeKind = level === 'introductory' ? 'foundation' : level === 'intermediate' ? 'core' : 'advanced';
  return { id: String(index + 1), slug, title, domain, level, kind, summary: descriptions[slug] ?? `${title}的核心概念、方法与跨领域联系。`, tags: [title, domain], position: { x: domainX[domain] + (row % 2) * 190, y: 50 + Math.floor(row / 2) * 145 } };
});
const bySlug = Object.fromEntries(knowledgeNodes.map((node) => [node.slug, node.id]));
const links: Array<[string,string,EdgeType?]> = [
 ['proof-logic','mathematical-analysis'],['calculus','mathematical-analysis'],['mathematical-analysis','real-analysis'],['proof-logic','abstract-algebra'],['real-analysis','topology','recommended'],['calculus','ode'],['ode','pde'],['linear-algebra','numerical-analysis'],['calculus','numerical-analysis'],['calculus','optimization'],['linear-algebra','optimization'],['probability','mathematical-statistics'],['probability','stochastic-processes'],
 ['python','data-structures'],['cpp','data-structures','recommended'],['discrete-math','data-structures','recommended'],['data-structures','algorithm-design'],['algorithm-design','computational-complexity'],['computer-organization','operating-systems'],['data-structures','operating-systems','recommended'],['operating-systems','distributed-systems'],['computer-networks','distributed-systems'],['programming-languages','compilers'],['computer-organization','compilers','recommended'],
 ['linear-algebra','machine-learning'],['probability','machine-learning'],['optimization','machine-learning'],['python','machine-learning','recommended'],['machine-learning','deep-learning'],['deep-learning','computer-vision','application'],['deep-learning','nlp','application'],['deep-learning','generative-models'],['deep-learning','transformer'],['transformer','large-language-models'],['large-language-models','ai-agent','application'],['reinforcement-learning','ai-agent','recommended'],['distributed-systems','ai-systems','recommended'],['deep-learning','world-models','recommended'],['reinforcement-learning','world-models','related']
];
export const knowledgeEdges: KnowledgeEdge[] = links.map(([source,target,type = 'prerequisite'], i) => ({ id: `e${i}`, source: bySlug[source], target: bySlug[target], type }));
export const nodeBySlug = (slug: string) => knowledgeNodes.find((node) => node.slug === slug);
export const domainLabels: Record<Domain,string> = { math: '纯数学', cs: '计算机科学', ai: '人工智能' };
