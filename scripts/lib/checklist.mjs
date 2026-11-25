// 内容检查清单：docs/CONTENT_CHECKLIST.md 中每一条自动检查的实现。
// 对 schemaVersion 2 的知识页逐条判定；任何一条不通过即视为不达标。

import fs from "node:fs";
import path from "node:path";

export const TEMPLATE_SUMMARY = /的课程级知识模块，关注核心概念、典型方法、前置依赖与后续研究方向/;
const VAGUE = /了解|熟悉|掌握(?!检查)/;
const chars = (s) => [...String(s || "")].length;

export const CHECKS = [
  ["C01", "摘要", "不是模板句，30–220 字"],
  ["C02", "直觉", "用不依赖公式的语言讲清“为什么是这样”，至少 100 字"],
  ["C03", "正式定义", "至少 2 条，每条有术语、精确陈述和出处"],
  ["C04", "完整推导", "命题、至少 4 步、结论和出处齐全，步骤之间可逐行核对"],
  ["C05", "例子", "有题目、至少 3 个求解步骤、答案、自检方式和出处"],
  ["C06", "常见误区", "至少 3 条，每条同时给出错误说法和纠正"],
  ["C07", "练习", "至少 8 题，统一编号前缀，每题含“题目／解析／掌握检查”三段"],
  ["C08", "一手来源", "至少 3 个已核验来源，均有 id、https 链接和核验日期；所有出处都指向已核验来源"],
  ["C09", "完成标准", "三级门槛都引用题号，且不使用“了解／熟悉／掌握”等无法检验的措辞"],
  ["C10", "图谱一致", "页面标题与图谱节点一致，图谱中的节点摘要不是模板句"],
  ["C11", "审核记录", "docs/content-research/pages/<slug>.md 存在，列出全部已核验来源链接，并有“## 复核”记录"],
];

export function checkPage(page, { root = ".", node = null } = {}) {
  const results = [];
  const put = (id, ok, detail = "") => results.push({ id, ok: !!ok, detail });
  const L = page.lesson || {};
  const sources = page.sources || [];
  const verified = new Map(sources.filter((s) => s.verification === "已核验" && s.id).map((s) => [s.id, s]));
  const citeOk = (c) => c && verified.has(c.source) && chars(c.at) >= 2;

  // C01
  const sum = page.summary || "";
  put("C01", !TEMPLATE_SUMMARY.test(sum) && chars(sum) >= 30 && chars(sum) <= 220, `摘要 ${chars(sum)} 字`);

  // C02
  put("C02", chars(L.intuition) >= 100, `直觉 ${chars(L.intuition)} 字`);

  // C03
  const defs = L.definitions || [];
  const badDefs = defs.filter((d) => !d.term || chars(d.statement) < 10 || !citeOk(d.cite)).map((d) => d.term || "(无术语)");
  put("C03", defs.length >= 2 && !badDefs.length, `${defs.length} 条${badDefs.length ? `；不合格：${badDefs.join("、")}` : ""}`);

  // C04
  const der = L.derivation || {};
  put("C04", der.claim && (der.steps || []).length >= 4 && der.conclusion && citeOk(der.cite), `${(der.steps || []).length} 步${citeOk(der.cite) ? "" : "；出处无效"}`);

  // C05
  const ex = L.example || {};
  put("C05", ex.problem && (ex.steps || []).length >= 3 && ex.answer && ex.check && citeOk(ex.cite), `${(ex.steps || []).length} 步${citeOk(ex.cite) ? "" : "；出处无效"}`);

  // C06
  const mis = L.misconceptions || [];
  const badMis = mis.filter((m) => chars(m.wrong) < 6 || chars(m.right) < 10 || (m.cite && !citeOk(m.cite))).length;
  put("C06", mis.length >= 3 && !badMis, `${mis.length} 条${badMis ? `；${badMis} 条不合格` : ""}`);

  // C07
  const exercises = page.exercises || [];
  const ids = [];
  let malformed = 0;
  for (const e of exercises) {
    const m = /^([A-Z][A-Z0-9]*-E\d{2})｜题目：[\s\S]+\n解析：[\s\S]+\n掌握检查：[\s\S]+$/.exec(e.description || "");
    if (!m) { malformed += 1; continue; }
    ids.push(m[1]);
  }
  const prefixes = new Set(ids.map((x) => x.replace(/-E\d{2}$/, "")));
  const dup = ids.length - new Set(ids).size;
  put("C07", exercises.length >= 8 && !malformed && prefixes.size === 1 && !dup, `${exercises.length} 题${malformed ? `；${malformed} 题格式不符` : ""}${prefixes.size > 1 ? "；编号前缀不统一" : ""}${dup ? "；编号重复" : ""}`);

  // C08
  const badSources = sources.filter((s) => s.verification === "已核验" && (!s.id || !/^https:\/\//.test(s.url || "") || !/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt || ""))).length;
  const cites = [...defs.map((d) => d.cite), der.cite, ex.cite, ...mis.map((m) => m.cite).filter(Boolean)];
  const dangling = [...new Set(cites.filter((c) => c && !verified.has(c.source)).map((c) => c.source))];
  put("C08", verified.size >= 3 && !badSources && !dangling.length, `已核验 ${verified.size} 个${badSources ? `；${badSources} 个缺 id/https/日期` : ""}${dangling.length ? `；出处指向未核验来源：${dangling.join("、")}` : ""}`);

  // C09
  const comp = page.completion || {};
  const tiers = ["basic", "proficient", "researchReady"];
  const noIds = tiers.filter((t) => !ids.some((id) => (comp[t] || "").includes(id.replace(/^.*-E/, "E")) || (comp[t] || "").includes(id)));
  const vague = tiers.filter((t) => VAGUE.test(comp[t] || ""));
  put("C09", !noIds.length && !vague.length, `${noIds.length ? `未引用题号：${noIds.join("、")}` : ""}${vague.length ? ` 含空话：${vague.join("、")}` : ""}`.trim());

  // C10
  put("C10", node && node.title === page.title && !TEMPLATE_SUMMARY.test(node.summary || ""), node ? (node.title !== page.title ? `标题不一致：${node.title}` : TEMPLATE_SUMMARY.test(node.summary || "") ? "图谱摘要仍是模板句" : "") : "图谱中找不到对应节点");

  // C11
  const auditPath = path.join(root, "docs/content-research/pages", `${page.slug}.md`);
  let auditOk = false, auditDetail = "缺少审核记录";
  if (fs.existsSync(auditPath)) {
    const audit = fs.readFileSync(auditPath, "utf8");
    const missing = [...verified.values()].filter((s) => !audit.includes(s.url)).map((s) => s.id);
    auditOk = /^## 复核/m.test(audit) && !missing.length;
    auditDetail = missing.length ? `审核记录缺少来源：${missing.join("、")}` : /^## 复核/m.test(audit) ? "" : "缺少“## 复核”一节";
  }
  put("C11", auditOk, auditDetail);

  return results;
}

export function formatReport(slug, results) {
  const names = Object.fromEntries(CHECKS.map(([id, name]) => [id, name]));
  const lines = results.map((r) => `  ${r.ok ? "✓" : "✗"} ${r.id} ${names[r.id]}${r.detail ? `：${r.detail}` : ""}`);
  const passed = results.filter((r) => r.ok).length;
  return `${slug}  ${passed}/${results.length}\n${lines.join("\n")}`;
}
