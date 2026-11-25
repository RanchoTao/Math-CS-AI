import fs from "node:fs";
import path from "node:path";
import { validateSchema } from "./lib/schema.mjs";
import { checkPage, formatReport, TEMPLATE_SUMMARY } from "./lib/checklist.mjs";

const root = process.cwd();
let errors = 0;
let warnings = 0;
const fail = message => { console.error(`FAIL: ${message}`); errors += 1; };
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const clean = value => String(value || '').replace(/\s+/g, '').toLowerCase();
const loadManifestItems = (manifestFile, key) => {
  const manifest = readJson(manifestFile);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest[key])) fail(`${manifestFile} 格式非法`);
  return manifest[key] || [];
};
const loadReferenced = (entry, kind) => {
  if (!entry.path) { fail(`${kind} manifest 条目缺少 path`); return null; }
  const file = entry.path.replace(/^\.\//, '');
  if (!fs.existsSync(path.join(root, file))) { fail(`${kind} 内容文件不存在: ${file}`); return null; }
  try { return { file, value: readJson(file) }; } catch (error) { fail(`${file} 不是合法 JSON: ${error.message}`); return null; }
};

const pageSchema = readJson('schemas/knowledge-page.schema.json');
const courseSchema = readJson('schemas/course-implementation.schema.json');
const experienceSchema = readJson('schemas/learning-experience.schema.json');
const schemaFail = (file, schema, value) => { for (const e of validateSchema(schema, value)) fail(`${file} 不符合 schema：${e}`); };
const catalog = readJson('data/catalog.json');
const nodes = Array.isArray(catalog.nodes) ? catalog.nodes : Object.entries(catalog.nodes || {}).map(([id,item]) => ({id,...item}));
const nodeTitles = new Set(nodes.map(node => clean(node.title)));

// 图谱结构校验：引用存在、ID 唯一、无环、必要前置层级不高于本节点。
{
  const byId = new Map();
  for (const node of nodes) {
    if (byId.has(node.id)) fail(`重复节点 ID: ${node.id}`);
    byId.set(node.id, node);
    if (!Number.isInteger(node.stage) || node.stage < 0 || node.stage > 8) fail(`${node.id} stage 必须是 0–8 的整数`);
    if (!['math','cs','ai'].includes(node.domain)) fail(`${node.id} domain 非法: ${node.domain}`);
  }
  const clusterIds = new Set((catalog.clusters || []).map(c => c.id));
  for (const node of nodes) {
    if (!clusterIds.has(node.cluster)) fail(`${node.id} 引用了不存在的学科群 ${node.cluster}`);
    for (const key of ['prerequisites','recommended']) for (const ref of node[key] || []) {
      const target = byId.get(ref);
      if (!target) { fail(`${node.id}.${key} 引用了不存在的节点 ${ref}`); continue; }
      if (key === 'prerequisites' && target.stage > node.stage) fail(`${node.id}（L${node.stage}）的必要前置 ${ref} 位于更高的 L${target.stage}`);
    }
  }
  const state = new Map();
  const visit = (id, trail) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { fail(`必要前置存在环: ${[...trail, id].join(' → ')}`); return; }
    state.set(id, 1);
    for (const ref of byId.get(id)?.prerequisites || []) if (byId.has(ref)) visit(ref, [...trail, id]);
    state.set(id, 2);
  };
  for (const node of nodes) visit(node.id, []);
  for (const [key, path] of Object.entries(catalog.paths || {})) for (const ref of path.nodes || []) if (!byId.has(ref)) fail(`示例路线 ${key} 引用了不存在的节点 ${ref}`);
  for (const [key, layer] of Object.entries(catalog.curricula || {})) for (const ref of layer.nodes || []) if (!byId.has(ref)) fail(`培养方案 ${key} 引用了不存在的节点 ${ref}`);
}
const knowledgeExists = value => nodeTitles.has(clean(value));

const requiredPage = ['schemaVersion','slug','title','tier','status','kind','summary','why','learningObjectives','coreTopics','resources','completion','sources'];
const forbiddenRelations = ['domain','stage','cluster','prerequisite','prerequisites','recommended'];
const seenSlugs = new Set();
const pagesBySlug = new Map();
let checkedPages = 0;
for (const entry of loadManifestItems('content/manifest.json', 'pages')) {
  if (!entry.slug) { fail('knowledge manifest 页面缺少 slug'); continue; }
  if (seenSlugs.has(entry.slug)) fail(`重复 slug: ${entry.slug}`);
  seenSlugs.add(entry.slug);
  const loaded = loadReferenced(entry, 'KnowledgePage');
  if (!loaded) continue;
  const {file, value: page} = loaded;
  schemaFail(file, pageSchema, page);
  for (const key of requiredPage) if (!(key in page)) fail(`${file} 缺少字段 ${key}`);
  pagesBySlug.set(page.slug, page);
  // schemaVersion 2：按检查清单逐条判定，任何一条不通过都阻断部署。
  if (page.schemaVersion === 2) {
    const node = nodes.find(n => clean(n.title) === clean(page.title));
    const results = checkPage(page, { root, node });
    if (results.some(r => !r.ok)) fail(`${file} 未通过内容检查清单\n${formatReport(page.slug, results)}`);
    else checkedPages += 1;
  }
  if (!['course','practice','tool','frontier'].includes(page.kind)) fail(`${file} kind 非法: ${page.kind}`);
  if (!['基础页','标准页','精品页'].includes(page.tier)) fail(`${file} tier 非法: ${page.tier}`);
  if (!['draft','validated','reviewed','published'].includes(page.status)) fail(`${file} status 非法: ${page.status}`);
  if (page.slug !== entry.slug) fail(`${file} slug 与 manifest 不一致`);
  const candidates = [page.title,...(page.aliases||[]),entry.title,...(entry.aliases||[])];
  if (!candidates.some(knowledgeExists)) fail(`${file} 无法映射到知识图谱节点: ${page.title}`);
  if (!page.completion?.basic || !page.completion?.proficient || !page.completion?.researchReady) fail(`${file} completion 不完整`);
  for (const key of forbiddenRelations) if (key in page) fail(`${file} 不得复制维护图谱关系字段 ${key}`);
  for (const resource of page.resources || []) if (!resource.title || !resource.type || !resource.verification) fail(`${file} 存在不完整资源记录`);
  for (const r of [...(page.resources || []), ...(page.sources || [])]) {
    if (r.verification === '已核验' && !/^https:\/\//.test(r.url || '')) fail(`${file} 标为已核验的条目必须有 https 链接：${r.title}`);
  }
  for (const s of page.sources || []) if (s.verification === '已核验' && !/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt || '')) fail(`${file} 已核验来源缺少 checkedAt（YYYY-MM-DD）：${s.title}`);
  // 标准页质量提示：不阻断部署，供审核时参考。
  if (page.tier !== '基础页' && page.schemaVersion === 1) {
    const ex = page.exercises || [];
    const warn = message => { console.warn(`WARN: ${file} ${message}`); warnings += 1; };
    if (ex.length < 8) warn(`练习少于 8 题（${ex.length}）`);
    const unsolved = ex.filter(x => !/\n解析[:：]/.test(x.description || '')).length;
    if (unsolved) warn(`${unsolved} 道练习没有“解析：”`);
    if ((page.syllabus || []).length < 5) warn(`章节少于 5 章`);
    if (!(page.sources || []).some(s => s.verification === '已核验')) warn('没有任何已核验来源');
    if (/了解|熟悉/.test(Object.values(page.completion || {}).join(''))) warn('完成标准含“了解/熟悉”等不可验证措辞');
  }
}

const dimensions = ['theoryDepth','practiceIntensity','mathRequirement','programmingIntensity','resourceCompleteness'];
const subjectiveFields = ['workloadHours','difficulty','hardestParts','mostValuableParts','recommendedPreparation','advice'];
const requiredCourse = ['schemaVersion','id','knowledgeNode','institution','courseCode','title','academicYear','language','officialUrl','status','coverage','features','workload','dimensions','resources','sources','verification'];
const seenCourseIds = new Set();
for (const entry of loadManifestItems('content/courses/manifest.json', 'courses')) {
  const loaded = loadReferenced(entry, 'CourseImplementation');
  if (!loaded) continue;
  const {file, value: course} = loaded;
  schemaFail(file, courseSchema, course);
  for (const key of requiredCourse) if (!(key in course)) fail(`${file} 缺少字段 ${key}`);
  if (!course.id || seenCourseIds.has(course.id)) fail(`${file} CourseImplementation id 缺失或重复: ${course.id}`);
  seenCourseIds.add(course.id);
  if (entry.id !== course.id) fail(`${file} id 与 manifest 不一致`);
  if (course.schemaVersion !== 1) fail(`${file} schemaVersion 必须为 1`);
  if (!knowledgeExists(course.knowledgeNode)) fail(`${file} knowledgeNode 不存在: ${course.knowledgeNode}`);
  if (!['draft','validated','reviewed'].includes(course.verification)) fail(`${file} verification 非法: ${course.verification}`);
  if (!['active','historical','unknown'].includes(course.status)) fail(`${file} status 非法: ${course.status}`);
  for (const key of dimensions) if (!Number.isInteger(course.dimensions?.[key]) || course.dimensions[key] < 1 || course.dimensions[key] > 5) fail(`${file} dimensions.${key} 必须是 1–5 的整数`);
  const hours = course.workload?.estimatedHours;
  if (hours && (hours.min < 0 || hours.max < hours.min)) fail(`${file} estimatedHours 范围非法`);
  for (const key of subjectiveFields) if (key in course) fail(`${file} 官方课程对象不得包含主观字段 ${key}`);
}

let experienceCount = 0;
const seenExperienceIds = new Set();
const requiredExperience = ['schemaVersion','knowledgeNode','courseImplementation','sourceType','workloadHours','difficulty','hardestParts','mostValuableParts','recommendedPreparation','advice','source','verification'];
for (const entry of loadManifestItems('content/experiences/manifest.json', 'experiences')) {
  if (!entry.id || seenExperienceIds.has(entry.id)) fail(`LearningExperience manifest id 缺失或重复: ${entry.id}`);
  seenExperienceIds.add(entry.id);
  const loaded = loadReferenced(entry, 'LearningExperience');
  if (!loaded) continue;
  experienceCount += 1;
  const {file, value: experience} = loaded;
  schemaFail(file, experienceSchema, experience);
  for (const key of requiredExperience) if (!(key in experience)) fail(`${file} 缺少字段 ${key}`);
  if (experience.schemaVersion !== 1) fail(`${file} schemaVersion 必须为 1`);
  if (!knowledgeExists(experience.knowledgeNode)) fail(`${file} knowledgeNode 不存在: ${experience.knowledgeNode}`);
  if (experience.courseImplementation && !seenCourseIds.has(experience.courseImplementation)) fail(`${file} 引用了不存在的 courseImplementation: ${experience.courseImplementation}`);
  if (!['community-project','maintainer-review','learner-report'].includes(experience.sourceType)) fail(`${file} sourceType 非法: ${experience.sourceType}`);
  if (!['unverified','reviewed'].includes(experience.verification)) fail(`${file} verification 非法: ${experience.verification}`);
  for (const key of ['hardestParts','mostValuableParts','recommendedPreparation','advice']) if (!Array.isArray(experience[key])) fail(`${file} ${key} 必须是数组`);
}

// 学习路径：standard 为 2 的路径逐节点统计达标情况；status 为 published 时必须全部达标且经维护者审阅。
for (const [key, route] of Object.entries(catalog.paths || {})) {
  if (route.standard !== 2) continue;
  const rows = route.nodes.map(id => {
    const node = nodes.find(n => n.id === id);
    const page = [...pagesBySlug.values()].find(p => clean(p.title) === clean(node?.title));
    const ok = page?.schemaVersion === 2 && checkPage(page, { root, node }).every(r => r.ok);
    return { id, ok, reviewed: ['reviewed', 'published'].includes(page?.status), template: TEMPLATE_SUMMARY.test(node?.summary || '') };
  });
  const done = rows.filter(r => r.ok).length;
  console.log(`PATH ${key}（${route.title}）：${done}/${rows.length} 个节点达到内容标准，${rows.filter(r => r.reviewed).length} 个已审阅；仍为模板摘要：${rows.filter(r => r.template).map(r => r.id).join('、') || '无'}`);
  if (route.status === 'published') for (const r of rows) {
    if (!r.ok) fail(`已发布路径 ${key} 的节点 ${r.id} 未达到内容标准`);
    if (!r.reviewed) fail(`已发布路径 ${key} 的节点 ${r.id} 尚未经维护者审阅（status 需为 reviewed 或 published）`);
  }
}

if (errors) process.exit(1);
console.log(`PASS: ${seenSlugs.size} 个知识页面（其中 ${checkedPages} 个通过新版检查清单）、${seenCourseIds.size} 个课程实现、${experienceCount} 条学习经验通过校验；图谱包含 ${nodes.length} 个节点。`);
