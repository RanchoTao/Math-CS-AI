// 打印一个或多个知识节点的写作简报，供人工或 Agent 撰写知识页时使用。
// 用法：
//   node scripts/node-brief.mjs <node-id> [<node-id> ...]
//   node scripts/node-brief.mjs --next 5          # 按推荐顺序列出接下来 5 个尚无知识页的节点
//   node scripts/node-brief.mjs --queue           # 打印完整写作队列
import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync("data/catalog.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("content/manifest.json", "utf8"));
const byId = new Map(catalog.nodes.map((n) => [n.id, n]));
const clusters = new Map(catalog.clusters.map((c) => [c.id, c]));
const STAGES = ["初等基础", "语言与思维", "本科核心", "基础支柱", "经典分支", "桥梁学科", "高级核心", "统一框架", "研究前沿"];
const DOMAIN = { math: "纯数学", cs: "计算机科学", ai: "人工智能" };
const clean = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
// 标准 v2 起，只有 schemaVersion 2 的页面算“已写完”；v1 页面仍在队列里，等待按 v2 重写。
const written = new Set();
const hasPage = new Set();
for (const p of manifest.pages) {
  let v = 1;
  try { v = JSON.parse(fs.readFileSync(p.path.replace(/^\.\//, ""), "utf8")).schemaVersion; } catch { /* missing file */ }
  for (const t of [p.title, ...(p.aliases || [])]) for (const n of catalog.nodes) if (clean(n.title) === clean(t)) { hasPage.add(n.id); if (v === 2) written.add(n.id); }
}
const children = new Map(catalog.nodes.map((n) => [n.id, []]));
for (const n of catalog.nodes) for (const p of n.prerequisites) children.get(p).push(n.id);

// 写作顺序：
//   0. 标准 v2 学习路径（catalog.paths 中 standard 为 2 的路径）上节点的前置闭包，先补齐路径的必要前置；
//   2. 这条路线的全部前置闭包（按阶段由低到高）；
//   3. 共同核心图层及其前置闭包；
//   4. 其余节点按阶段由低到高。
// 前置不必先写：页面的前置与后续始终从 catalog 动态读取。
function ancestors(id, acc = new Set()) {
  for (const p of byId.get(id).prerequisites) if (!acc.has(p)) { acc.add(p); ancestors(p, acc); }
  return acc;
}
function queue() {
  const order = [];
  const seen = new Set();
  const push = (ids) => { for (const id of ids) if (!seen.has(id)) { seen.add(id); order.push(id); } };
  const byStage = (ids) => [...ids].sort((a, b) => byId.get(a).stage - byId.get(b).stage || a.localeCompare(b));
  for (const route of Object.values(catalog.paths).filter((r) => r.standard === 2)) {
    push(byStage(new Set(route.nodes.flatMap((id) => [...ancestors(id)]))));
  }
  const llm = catalog.paths.llm.nodes;
  push(llm);
  push(byStage(new Set(llm.flatMap((id) => [...ancestors(id)]))));
  const core = catalog.curricula["common-core"].nodes;
  push(byStage(new Set([...core, ...core.flatMap((id) => [...ancestors(id)])])));
  push(byStage(catalog.nodes.map((n) => n.id)));
  return order.filter((id) => !written.has(id));
}

function brief(id) {
  const n = byId.get(id);
  if (!n) return `未知节点：${id}`;
  const name = (x) => `${byId.get(x).title}（${x}，L${byId.get(x).stage}${written.has(x) ? "，已有 v2 知识页" : ""}）`;
  const siblings = catalog.nodes.filter((m) => m.cluster === n.cluster && m.id !== n.id).map((m) => m.title);
  return [
    `# ${n.title}`,
    `- id / 建议 slug：${n.id}`,
    `- 领域：${DOMAIN[n.domain]}；阶段：L${n.stage} ${STAGES[n.stage]}；类型：${n.type}`,
    `- 学科群：${clusters.get(n.cluster)?.title}（同群节点：${siblings.join("、") || "无"}）`,
    `- 图谱中的核心主题提示：${n.topics.join("、")}`,
    `- 必要前置：${n.prerequisites.map(name).join("；") || "无"}`,
    `- 推荐关联：${n.recommended.map(name).join("；") || "无"}`,
    `- 直接后续：${children.get(id).map(name).join("；") || "无"}`,
    `- 已有知识页：${written.has(id) ? "是，标准 v2（不要覆盖 reviewed/published 内容）" : hasPage.has(id) ? "有 v1 旧稿，需按标准 v2 重写" : "否"}`,
  ].join("\n");
}

const args = process.argv.slice(2);
if (args[0] === "--queue") {
  queue().forEach((id, i) => console.log(`${String(i + 1).padStart(3, " ")}. ${id}  ${byId.get(id).title}  L${byId.get(id).stage}`));
} else if (args[0] === "--next") {
  const k = Number(args[1] || 5);
  console.log(queue().slice(0, k).map(brief).join("\n\n"));
} else if (args.length) {
  console.log(args.map(brief).join("\n\n"));
} else {
  console.error("用法：node scripts/node-brief.mjs <node-id> | --next 5 | --queue");
  process.exit(1);
}
