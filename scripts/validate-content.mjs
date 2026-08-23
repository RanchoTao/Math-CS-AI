import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const manifest = readJson('content/manifest.json');
const required = ['schemaVersion','slug','title','tier','status','kind','summary','why','learningObjectives','coreTopics','resources','completion','sources'];
const allowedKinds = new Set(['course','practice','tool','frontier']);
const allowedTiers = new Set(['基础页','标准页','精品页']);
const allowedStatus = new Set(['draft','validated','reviewed','published']);

const encoded = [1,2,3,4,5].map(index => {
  const text = fs.readFileSync(path.join(root, `data/catalog.part${index}.js`), 'utf8');
  const match = text.match(/push\("([A-Za-z0-9+/=]+)"\)/);
  if (!match) throw new Error(`无法读取 catalog.part${index}.js`);
  return match[1];
}).join('');
const catalog = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
const nodes = Array.isArray(catalog.nodes) ? catalog.nodes : Object.entries(catalog.nodes || {}).map(([id,item]) => ({id,...item}));
const titles = new Set(nodes.map(node => String(node.title).replace(/\s+/g,'').toLowerCase()));
const seenSlugs = new Set();

for (const entry of manifest.pages || []) {
  if (!entry.slug || !entry.path) { fail('manifest 页面缺少 slug 或 path'); continue; }
  if (seenSlugs.has(entry.slug)) fail(`重复 slug: ${entry.slug}`);
  seenSlugs.add(entry.slug);
  const file = entry.path.replace(/^\.\//,'');
  if (!fs.existsSync(path.join(root,file))) { fail(`内容文件不存在: ${file}`); continue; }
  const page = readJson(file);
  for (const key of required) if (!(key in page)) fail(`${file} 缺少字段 ${key}`);
  if (page.schemaVersion !== 1) fail(`${file} schemaVersion 必须为 1`);
  if (!allowedKinds.has(page.kind)) fail(`${file} kind 非法: ${page.kind}`);
  if (!allowedTiers.has(page.tier)) fail(`${file} tier 非法: ${page.tier}`);
  if (!allowedStatus.has(page.status)) fail(`${file} status 非法: ${page.status}`);
  if (page.slug !== entry.slug) fail(`${file} slug 与 manifest 不一致`);
  const candidates = [page.title,...(page.aliases||[]),entry.title,...(entry.aliases||[])].map(x=>String(x||'').replace(/\s+/g,'').toLowerCase());
  if (!candidates.some(title => titles.has(title))) fail(`${file} 无法映射到知识图谱节点: ${page.title}`);
  if (!page.completion?.basic || !page.completion?.proficient || !page.completion?.researchReady) fail(`${file} completion 不完整`);
  for (const resource of page.resources || []) {
    if (!resource.title || !resource.type || !resource.verification) fail(`${file} 存在不完整资源记录`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`PASS: ${seenSlugs.size} 个结构化知识页面通过校验，图谱包含 ${nodes.length} 个节点。`);
