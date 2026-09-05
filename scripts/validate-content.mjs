import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const exists = (file) => fs.existsSync(path.join(root, file));
const normalizeTitle = (value) =>
  String(value || "").replace(/\s+/g, "").toLowerCase();

function loadCatalog() {
  const encoded = [1, 2, 3, 4, 5]
    .map((index) => {
      const text = fs.readFileSync(
        path.join(root, `data/catalog.part${index}.js`),
        "utf8",
      );
      const match = text.match(/push\("([A-Za-z0-9+/=]+)"\)/);
      if (!match) throw new Error(`无法读取 catalog.part${index}.js`);
      return match[1];
    })
    .join("");

  return JSON.parse(
    zlib.gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"),
  );
}

const catalog = loadCatalog();
const nodes = Array.isArray(catalog.nodes)
  ? catalog.nodes
  : Object.entries(catalog.nodes || {}).map(([id, item]) => ({ id, ...item }));

const nodeTitles = new Set(
  nodes.flatMap((node) => [node.title, ...(node.aliases || [])]).map(normalizeTitle),
);

function assertKnowledgeNodeExists(value, context) {
  if (!nodeTitles.has(normalizeTitle(value))) {
    fail(`${context} 无法映射到知识图谱节点: ${value}`);
    return false;
  }
  return true;
}

function assertPath(pathValue, context) {
  const file = String(pathValue || "").replace(/^\.\//, "");
  if (!file) {
    fail(`${context} 缺少 path`);
    return null;
  }
  if (!exists(file)) {
    fail(`${context} 内容文件不存在: ${file}`);
    return null;
  }
  return file;
}

function isDimension(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

const pageManifest = readJson("content/manifest.json");
const courseManifest = exists("content/courses/manifest.json")
  ? readJson("content/courses/manifest.json")
  : { courses: [] };
const experienceManifest = exists("content/experiences/manifest.json")
  ? readJson("content/experiences/manifest.json")
  : { experiences: [] };

const pageRequired = [
  "schemaVersion",
  "slug",
  "title",
  "tier",
  "status",
  "kind",
  "summary",
  "why",
  "learningObjectives",
  "coreTopics",
  "resources",
  "completion",
  "sources",
];
const allowedKinds = new Set(["course", "practice", "tool", "frontier"]);
const allowedTiers = new Set(["基础页", "标准页", "精品页"]);
const allowedPageStatus = new Set(["draft", "validated", "reviewed", "published"]);
const forbiddenKnowledgeRelations = new Set([
  "domain",
  "stage",
  "cluster",
  "prerequisites",
  "recommended",
  "next",
  "nextNodes",
  "dependencies",
]);

const seenSlugs = new Set();

for (const entry of pageManifest.pages || []) {
  if (!entry.slug || !entry.path) {
    fail("content/manifest.json 存在缺少 slug 或 path 的页面");
    continue;
  }

  if (seenSlugs.has(entry.slug)) fail(`重复 slug: ${entry.slug}`);
  seenSlugs.add(entry.slug);

  const file = assertPath(entry.path, `知识页面 ${entry.slug}`);
  if (!file) continue;
  const page = readJson(file);

  for (const key of pageRequired) {
    if (!(key in page)) fail(`${file} 缺少字段 ${key}`);
  }

  for (const key of forbiddenKnowledgeRelations) {
    if (key in page) {
      fail(`${file} 不得自行维护图谱关系字段 ${key}；data/catalog.* 是唯一事实源`);
    }
  }

  if (page.schemaVersion !== 1) fail(`${file} schemaVersion 必须为 1`);
  if (!allowedKinds.has(page.kind)) fail(`${file} kind 非法: ${page.kind}`);
  if (!allowedTiers.has(page.tier)) fail(`${file} tier 非法: ${page.tier}`);
  if (!allowedPageStatus.has(page.status)) {
    fail(`${file} status 非法: ${page.status}`);
  }
  if (page.slug !== entry.slug) {
    fail(`${file} slug 与 content/manifest.json 不一致`);
  }

  const candidates = [
    page.title,
    ...(page.aliases || []),
    entry.title,
    ...(entry.aliases || []),
  ].map(normalizeTitle);

  if (!candidates.some((title) => nodeTitles.has(title))) {
    fail(`${file} 无法映射到知识图谱节点: ${page.title}`);
  }

  if (
    !page.completion?.basic ||
    !page.completion?.proficient ||
    !page.completion?.researchReady
  ) {
    fail(`${file} completion 不完整`);
  }

  for (const resource of page.resources || []) {
    if (!resource.title || !resource.type || !resource.verification) {
      fail(`${file} 存在不完整资源记录`);
    }
  }
}

const courseRequired = [
  "schemaVersion",
  "id",
  "knowledgeNode",
  "institution",
  "title",
  "language",
  "status",
  "coverage",
  "features",
  "dimensions",
  "resources",
  "sources",
  "verification",
];
const allowedCourseStatus = new Set(["active", "historical", "unknown"]);
const allowedCourseVerification = new Set(["draft", "validated", "reviewed"]);
const subjectiveOnlyKeys = new Set([
  "difficulty",
  "hardestParts",
  "mostValuableParts",
  "recommendedPreparation",
  "advice",
  "sourceType",
  "workloadHours",
  "overallScore",
  "score",
  "rating",
]);
const dimensionKeys = [
  "theoryDepth",
  "practiceIntensity",
  "mathRequirement",
  "programmingIntensity",
  "resourceCompleteness",
];

const seenCourseIds = new Set();

for (const entry of courseManifest.courses || []) {
  if (!entry.id || !entry.path) {
    fail("content/courses/manifest.json 存在缺少 id 或 path 的记录");
    continue;
  }
  if (seenCourseIds.has(entry.id)) fail(`重复课程实现 id: ${entry.id}`);
  seenCourseIds.add(entry.id);

  const file = assertPath(entry.path, `课程实现 ${entry.id}`);
  if (!file) continue;
  const course = readJson(file);

  for (const key of courseRequired) {
    if (!(key in course)) fail(`${file} 缺少字段 ${key}`);
  }
  for (const key of subjectiveOnlyKeys) {
    if (key in course) {
      fail(`${file} 不得包含学习经验主观字段 ${key}`);
    }
  }

  if (course.schemaVersion !== 1) fail(`${file} schemaVersion 必须为 1`);
  if (course.id !== entry.id) fail(`${file} id 与课程 manifest 不一致`);
  if (
    entry.knowledgeNode &&
    normalizeTitle(course.knowledgeNode) !== normalizeTitle(entry.knowledgeNode)
  ) {
    fail(`${file} knowledgeNode 与课程 manifest 不一致`);
  }

  assertKnowledgeNodeExists(course.knowledgeNode, file);

  if (!allowedCourseStatus.has(course.status)) {
    fail(`${file} status 非法: ${course.status}`);
  }
  if (!allowedCourseVerification.has(course.verification)) {
    fail(`${file} verification 非法: ${course.verification}`);
  }

  for (const key of dimensionKeys) {
    if (!isDimension(course.dimensions?.[key])) {
      fail(`${file} dimensions.${key} 必须是 1–5 的整数`);
    }
  }

  if (
    course.workload?.estimatedHours &&
    Number(course.workload.estimatedHours.max) <
      Number(course.workload.estimatedHours.min)
  ) {
    fail(`${file} workload.estimatedHours.max 不能小于 min`);
  }

  for (const resource of course.resources || []) {
    if (!resource.type || !resource.title || !resource.verification) {
      fail(`${file} 存在不完整课程资源记录`);
    }
  }

  for (const source of course.sources || []) {
    if (!source.sourceType || !source.title || !source.verification) {
      fail(`${file} 存在不完整第一手来源记录`);
    }
  }
}

const allowedExperienceType = new Set([
  "community-project",
  "maintainer-review",
  "learner-report",
]);
const allowedExperienceVerification = new Set(["unverified", "reviewed"]);
const experienceRequired = [
  "schemaVersion",
  "id",
  "knowledgeNode",
  "sourceType",
  "hardestParts",
  "mostValuableParts",
  "recommendedPreparation",
  "advice",
  "source",
  "verification",
];
const seenExperienceIds = new Set();

for (const entry of experienceManifest.experiences || []) {
  if (!entry.id || !entry.path) {
    fail("content/experiences/manifest.json 存在缺少 id 或 path 的记录");
    continue;
  }
  if (seenExperienceIds.has(entry.id)) fail(`重复学习经验 id: ${entry.id}`);
  seenExperienceIds.add(entry.id);

  const file = assertPath(entry.path, `学习经验 ${entry.id}`);
  if (!file) continue;
  const experience = readJson(file);

  for (const key of experienceRequired) {
    if (!(key in experience)) fail(`${file} 缺少字段 ${key}`);
  }

  if (experience.schemaVersion !== 1) fail(`${file} schemaVersion 必须为 1`);
  if (experience.id !== entry.id) fail(`${file} id 与经验 manifest 不一致`);
  if (
    entry.knowledgeNode &&
    normalizeTitle(experience.knowledgeNode) !== normalizeTitle(entry.knowledgeNode)
  ) {
    fail(`${file} knowledgeNode 与经验 manifest 不一致`);
  }

  assertKnowledgeNodeExists(experience.knowledgeNode, file);

  if (
    experience.courseImplementation &&
    !seenCourseIds.has(experience.courseImplementation)
  ) {
    fail(
      `${file} 引用了不存在的 courseImplementation: ${experience.courseImplementation}`,
    );
  }

  if (!allowedExperienceType.has(experience.sourceType)) {
    fail(`${file} sourceType 非法: ${experience.sourceType}`);
  }
  if (!allowedExperienceVerification.has(experience.verification)) {
    fail(`${file} verification 非法: ${experience.verification}`);
  }
  if (
    experience.difficulty !== null &&
    experience.difficulty !== undefined &&
    !isDimension(experience.difficulty)
  ) {
    fail(`${file} difficulty 必须为空或 1–5 的整数`);
  }
  if (
    experience.workloadHours !== null &&
    experience.workloadHours !== undefined &&
    (!Number.isInteger(experience.workloadHours) || experience.workloadHours < 0)
  ) {
    fail(`${file} workloadHours 必须为空或非负整数`);
  }

  for (const key of [
    "hardestParts",
    "mostValuableParts",
    "recommendedPreparation",
    "advice",
  ]) {
    if (!Array.isArray(experience[key])) {
      fail(`${file} ${key} 必须为数组`);
    }
  }

  if (!experience.source?.title || !experience.source?.url) {
    fail(`${file} source 不完整`);
  }
}

if (process.exitCode) process.exit(process.exitCode);

console.log(
  `PASS: ${seenSlugs.size} 个知识页面、${seenCourseIds.size} 个课程实现、${seenExperienceIds.size} 条学习经验通过校验；图谱包含 ${nodes.length} 个节点。`,
);
