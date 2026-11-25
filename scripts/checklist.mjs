// 对知识页逐条运行内容检查清单（docs/CONTENT_CHECKLIST.md）。
// 用法：
//   node scripts/checklist.mjs <slug> [<slug> ...]
//   node scripts/checklist.mjs --path ml-foundations
import fs from "node:fs";
import { checkPage, formatReport } from "./lib/checklist.mjs";

const catalog = JSON.parse(fs.readFileSync("data/catalog.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("content/manifest.json", "utf8"));
const clean = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
const args = process.argv.slice(2);

let targets = args;
if (args[0] === "--path") {
  const route = catalog.paths[args[1]];
  if (!route) { console.error(`没有路径 ${args[1]}`); process.exit(2); }
  targets = route.nodes;
}
if (!targets.length) { console.error("用法：node scripts/checklist.mjs <slug|node-id> … | --path <path-id>"); process.exit(2); }

let failed = 0;
for (const target of targets) {
  const node = catalog.nodes.find((n) => n.id === target) || null;
  const entry = manifest.pages.find((p) => p.slug === target || (node && [p.title, ...(p.aliases || [])].some((t) => clean(t) === clean(node.title))));
  if (!entry) { console.log(`${target}  0/11\n  ✗ 还没有知识页`); failed += 1; continue; }
  const page = JSON.parse(fs.readFileSync(entry.path.replace(/^\.\//, ""), "utf8"));
  const n = node || catalog.nodes.find((x) => clean(x.title) === clean(page.title)) || null;
  if (page.schemaVersion !== 2) { console.log(`${page.slug}  —\n  ✗ 仍是 schemaVersion ${page.schemaVersion}，需按标准 v2 升级`); failed += 1; continue; }
  const results = checkPage(page, { root: ".", node: n });
  if (results.some((r) => !r.ok)) failed += 1;
  console.log(formatReport(page.slug, results));
}
process.exit(failed ? 1 : 0);
