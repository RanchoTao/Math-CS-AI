import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkPage } from "../scripts/lib/checklist.mjs";
import { validateSchema } from "../scripts/lib/schema.mjs";

const schema = JSON.parse(fs.readFileSync("schemas/knowledge-page.schema.json", "utf8"));
const src = (id) => ({ id, sourceType: "教材", title: `[${id}] 来源 ${id}`, url: `https://example.org/${id}`, verification: "已核验", checkedAt: "2026-11-25" });
const cite = { source: "S1", at: "第 1.2 节" };
const ex = (n) => ({ type: "基础题", description: `TT-E${String(n).padStart(2, "0")}｜题目：计算一个量。\n解析：按定义代入得到结果。\n掌握检查：能说明每一步的依据。` });

function goodPage() {
  return {
    schemaVersion: 2, slug: "toy", title: "玩具节点", aliases: [], tier: "标准页", status: "draft", kind: "course",
    summary: "这是一个用于测试检查清单的示例节点，摘要长度足够并且不是模板句。",
    why: "测试用。",
    lesson: {
      intuition: "直觉".repeat(60),
      definitions: [
        { term: "对象", english: "object", statement: "满足条件甲和条件乙的集合元素。", cite },
        { term: "映射", english: "map", statement: "把每个对象送到唯一一个对象的规则。", cite: { source: "S2", at: "定义 2.1" } },
      ],
      derivation: { title: "一个推导", claim: "结论成立。", assumptions: ["条件甲"], steps: ["第一步", "第二步", "第三步", "第四步"], conclusion: "所以结论成立。", cite },
      example: { title: "例子", problem: "求某个值。", steps: ["代入", "化简", "得到"], answer: "42", check: "代回原式验证。", cite },
      misconceptions: [
        { wrong: "以为条件甲多余", right: "去掉条件甲时有反例，结论不成立。" },
        { wrong: "把映射当成关系", right: "映射要求每个元素恰好对应一个像。" },
        { wrong: "认为例子能代替证明", right: "例子只能说明特例，一般结论需要推导。", cite },
      ],
    },
    learningObjectives: ["计算一个量"], coreTopics: ["对象"],
    resources: [{ type: "主教材", title: "[S1] 教材", url: "https://example.org/S1", verification: "已核验" }],
    exercises: Array.from({ length: 8 }, (_, i) => ex(i + 1)),
    completion: { basic: "完成 TT-E01–E06。", proficient: "完成 TT-E01–E08。", researchReady: "复写 TT-E08 的推导后进入后续节点。" },
    sources: [src("S1"), src("S2"), src("S3")],
  };
}

function withAudit(page, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "checklist-"));
  fs.mkdirSync(path.join(root, "docs/content-research/pages"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/content-research/pages", `${page.slug}.md`), body ?? `# 审核\n${page.sources.map((s) => `- ${s.url}`).join("\n")}\n\n## 复核\n- 全部手算复核。\n`);
  return root;
}
const node = { id: "toy", title: "玩具节点", summary: "真实摘要。" };
const failing = (page, root) => checkPage(page, { root, node }).filter((r) => !r.ok).map((r) => r.id);

test("a complete v2 page passes every automatic check and the schema", () => {
  const page = goodPage();
  assert.deepEqual(validateSchema(schema, page), []);
  assert.deepEqual(failing(page, withAudit(page)), []);
});

test("each missing part is reported by its own check", () => {
  const cases = [
    ["C01", (p) => { p.summary = "线性代数的课程级知识模块，关注核心概念、典型方法、前置依赖与后续研究方向。"; }],
    ["C02", (p) => { p.lesson.intuition = "太短"; }],
    ["C03", (p) => { p.lesson.definitions.pop(); }],
    ["C04", (p) => { p.lesson.derivation.steps = ["只有一步"]; }],
    ["C05", (p) => { p.lesson.example.check = ""; }],
    ["C06", (p) => { p.lesson.misconceptions.pop(); }],
    ["C07", (p) => { p.exercises[0].description = "TT-E01 没有三段格式"; }],
    ["C08", (p) => { p.sources[2].verification = "待核验"; }],
    ["C09", (p) => { p.completion.basic = "熟悉主要内容。"; }],
  ];
  for (const [id, mutate] of cases) {
    const page = goodPage();
    mutate(page);
    assert.ok(failing(page, withAudit(page)).includes(id), `${id} should fail`);
  }
});

test("citations must point to a verified source id", () => {
  const page = goodPage();
  page.lesson.derivation.cite = { source: "NOPE", at: "第 9 章" };
  const r = checkPage(page, { root: withAudit(page), node }).filter((x) => !x.ok);
  assert.deepEqual(r.map((x) => x.id).sort(), ["C04", "C08"]);
  assert.match(r.find((x) => x.id === "C08").detail, /NOPE/);
});

test("graph summary and audit record are enforced", () => {
  const page = goodPage();
  assert.ok(checkPage(page, { root: withAudit(page), node: { ...node, summary: "玩具节点的课程级知识模块，关注核心概念、典型方法、前置依赖与后续研究方向。" } }).find((r) => r.id === "C10" && !r.ok));
  assert.ok(failing(page, withAudit(page, "# 审核\n没有复核")).includes("C11"));
  const noAuditRoot = fs.mkdtempSync(path.join(os.tmpdir(), "checklist-"));
  assert.ok(failing(page, noAuditRoot).includes("C11"));
});

test("schema rejects unknown lesson fields", () => {
  const page = goodPage();
  page.lesson.extra = "x";
  assert.ok(validateSchema(schema, page).some((e) => e.includes("不允许的字段 extra")));
});
