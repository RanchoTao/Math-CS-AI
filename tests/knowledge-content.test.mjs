import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = JSON.parse(read('data/catalog.json'));
const renderer = read('assets/knowledge.js');

// Execute the actual renderer with the committed catalog/manifests/content.
// All fetches are local fixtures, so this suite needs neither browser nor network.
async function render(id, overrides = {}) {
  const target = { innerHTML: '' };
  const document = { title: '', getElementById: id => (id === 'knowledgePage' ? target : null) };
  const errors = [];
  const context = vm.createContext({
    document,
    location: { search: `?id=${id}`, href: 'https://atlas.example/knowledge.html' },
    URL, URLSearchParams,
    console: { error: error => errors.push(String(error)) },
    window: { loadAtlasCatalog: async () => structuredClone(catalog) },
    fetch: async url => ({
      ok: true,
      json: async () => structuredClone(overrides[url] ?? JSON.parse(read(url.replace(/^\.\//, '')))),
    }),
  });
  await vm.runInContext(renderer, context);
  assert.deepEqual(errors, []);
  return { html: target.innerHTML, title: document.title };
}

for (const id of ['linear-algebra', 'probability']) {
  test(`${id}: authored draft, solutions, sources and catalog relations render`, async () => {
    const { html, title } = await render(id);
    const node = catalog.nodes.find(n => n.id === id);
    assert.equal(title, `${node.title} · 知识节点`);
    assert.match(html, /<strong>草稿<\/strong><span class="meta-sub mono">draft<\/span>/);
    assert.match(html, /<details><summary><span>先独立作答，再查看解析<\/span>/);
    assert.match(html, /<p>解析：/);
    assert.match(html, /<p>掌握检查：/);
    assert.match(html, /2026-10-11/);
    assert.match(html, /target="_blank" rel="noopener noreferrer">打开资源/);
    assert.match(html, /target="_blank" rel="noopener noreferrer">核对来源/);
    assert.doesNotMatch(html, /该节点已经拥有可访问页面/);
    for (const prerequisite of node.prerequisites) {
      assert.ok(html.includes(`knowledge.html?id=${prerequisite}&title=`));
    }
    assert.match(html, /课程实现 · draft/);
    assert.match(html, /historical/);
    assert.match(html, /历史版本/);
  });
}

test('existing authored pages still render without requiring new fields', async () => {
  for (const id of ['real-analysis-1', 'operating-systems', 'machine-learning', 'command-line-git']) {
    // Resolve exact catalog IDs through the content manifest, including CLI title aliases.
    const entry = JSON.parse(read('content/manifest.json')).pages.find(p =>
      p.slug === (id === 'real-analysis-1' ? 'real-analysis-i' : id));
    const node = catalog.nodes.find(n => [entry.title, ...entry.aliases].includes(n.title));
    assert.ok(node, entry.slug);
    const { html } = await render(node.id);
    assert.ok(html.includes(`<h1>${node.title}</h1>`));
    assert.doesNotMatch(html, /这一页还没有正文/);
    assert.doesNotMatch(html, /知识页面加载失败/);
  }
});

test('an uncovered node keeps the metadata fallback and its own prerequisites', async () => {
  const { html } = await render('multivariable-calculus');
  assert.match(html, /这一页还没有正文/);
  assert.match(html, /该节点已经拥有可访问页面/);
  assert.match(html, /<span class="tier ">基础页<\/span>/);
  assert.match(html, /knowledge.html\?id=calculus&title=/);
  assert.match(html, /knowledge.html\?id=linear-algebra&title=/);
  assert.doesNotMatch(html, /LA-E01|P-E01/);
});

test('reference URLs reject unsafe protocols and absent URLs; text stays escaped', async () => {
  const page = JSON.parse(read('content/pages/probability.json'));
  page.resources = [
    { type: '参考资料', title: '<script>bad</script>', verification: '待核验', url: 'javascript:alert(1)' },
    { type: '参考资料', title: 'no URL', verification: '待核验' },
    { type: '参考资料', title: 'empty URL', verification: '待核验', url: '  ' },
    { type: '参考资料', title: 'valid', verification: '已核验', url: 'https://example.org/?x=1&y=2' },
  ];
  page.sources = [{ sourceType: '其他', title: 'unsafe', verification: '待核验', url: 'data:text/html,bad' }];
  page.exercises = [{ type: '基础题', description: '题目：<img onerror="bad">\n解析：1 < 2' }];
  const { html } = await render('probability', { './content/pages/probability.json': page });
  assert.doesNotMatch(html, /javascript:|data:text\/html|<script>bad|<img onerror/);
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.match(html, /href="https:\/\/example.org\/\?x=1&amp;y=2"/);
  assert.equal((html.match(/>打开资源<\/a>/g) || []).length, 1);
  assert.equal((html.match(/>核对来源<\/a>/g) || []).length, 0);
  assert.match(html, /<p>解析：1 &lt; 2<\/p>/);
});

test('a standard-v2 page renders the lesson, citations, exercise ids and path navigation', async () => {
  const { html } = await render('probability');
  for (const heading of ['直觉', '正式定义', '完整推导', '例子', '常见误区']) assert.match(html, new RegExp(`</span>${heading}</h2>`));
  assert.match(html, /<a class="cite" href="#src-P3-L"/);
  assert.match(html, /<li id="src-P3-L">/);
  assert.match(html, /<span class="mono ex-n">P-E01<\/span>/);
  assert.doesNotMatch(html, /<p>P-E01｜/);
  assert.match(html, /第 2 \/ 11 步/);
  assert.match(html, /aria-current="step"/);
  assert.match(html, /pg-prev[^>]*href="[^"]*id=linear-algebra[^"]*path=ml-foundations"|href="[^"]*id=linear-algebra[^"]*path=ml-foundations"[^>]*>\s*<span class="pg-k mono">← 上一步/);
  assert.match(html, /下一步 →/);
  assert.match(html, /开始之前/);
});
