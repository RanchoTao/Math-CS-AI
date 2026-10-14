import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import { loadAtlasCatalog, validateGraph } from '../scripts/validate-graph.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readFixture = file => JSON.parse(fs.readFileSync(new URL(`fixtures/${file}`, import.meta.url), 'utf8'));
const fixture = readFixture('valid-graph.json');
const malformed = readFixture('malformed-graph-cases.json');

test('actual compressed catalog satisfies the documented graph contract', () => {
  const catalog = loadAtlasCatalog();
  assert.ok(catalog.nodes.length > 0);
  assert.ok(catalog.clusters.length > 0);
  assert.deepEqual(validateGraph(catalog), []);
});

test('valid fixture is accepted without mutating data', () => {
  const catalog = structuredClone(fixture);
  assert.deepEqual(validateGraph(catalog), []);
  assert.deepEqual(catalog, fixture);
});

test('keyed collections supply IDs as the browser runtime does', () => {
  const catalog = structuredClone(fixture);
  for (const key of ['nodes', 'clusters']) {
    catalog[key] = Object.fromEntries(catalog[key].map(({ id, ...item }) => [id, item]));
  }
  assert.deepEqual(validateGraph(catalog), []);
});

test('array routes and duplicate route IDs are checked', () => {
  const catalog = structuredClone(fixture);
  catalog.paths = [{ id: 'example', ...catalog.paths.example }];
  catalog.curricula = [{ id: 'atlas', ...catalog.curricula.atlas }];
  assert.deepEqual(validateGraph(catalog), []);
  catalog.paths.push(structuredClone(catalog.paths[0]));
  assert.ok(validateGraph(catalog).some(error => error.startsWith('paths[1].id: duplicate ID')));
});

test('cycles, same-stage relations, and empty curriculum selections are allowed', () => {
  const catalog = structuredClone(fixture);
  catalog.nodes[0].prerequisites = ['n-b'];
  catalog.nodes[0].stage = catalog.nodes[1].stage;
  catalog.nodes[1].recommended = ['n-a'];
  catalog.clusterEdges.push(['c-b', 'c-a']);
  assert.deepEqual(validateGraph(catalog), []);
});

test('absent optional overlays and extra metadata are allowed', () => {
  const catalog = structuredClone(fixture);
  for (const key of ['paths', 'curricula', 'clusterEdges']) delete catalog[key];
  catalog.nodes[0].editorialNote = 'Fixture metadata';
  assert.deepEqual(validateGraph(catalog), []);
});

test('route aliases and object references match the browser extraction rules', () => {
  for (const field of ['nodeIds', 'requiredNodes', 'required', 'members', 'ids', 'path']) {
    const catalog = structuredClone(fixture);
    delete catalog.paths.example.nodes;
    catalog.paths.example[field] = [{ id: 'n-a' }, { nodeId: 'n-b' }];
    assert.deepEqual(validateGraph(catalog), []);
    catalog.paths.example[field][1].nodeId = 'missing';
    assert.ok(validateGraph(catalog).some(error => error.startsWith(`paths["example"].${field}[1]: unknown ID`)));
  }
  const catalog = structuredClone(fixture);
  delete catalog.curricula.atlas.nodes;
  assert.deepEqual(validateGraph(catalog), []);
});

for (const { name, path: keys, value, remove, expected } of malformed) {
  test(`rejects ${name} with a deterministic diagnostic`, () => {
    let catalog = structuredClone(fixture);
    if (keys.length === 0) catalog = value;
    else {
      const parent = keys.slice(0, -1).reduce((item, key) => item[key], catalog);
      if (remove) delete parent[keys.at(-1)];
      else parent[keys.at(-1)] = value;
    }
    const errors = validateGraph(catalog);
    assert.ok(errors.some(error => error.startsWith(expected)), JSON.stringify(errors));
    assert.deepEqual(validateGraph(catalog), errors);
    assert.deepEqual(errors, [...errors].sort());
  });
}

// Keep all DATA_MODEL.md fields covered, including an explicitly missing ID.
for (const [collection, fields] of [
  ['nodes', ['id', 'title', 'domain', 'cluster', 'stage', 'type', 'summary', 'prerequisites', 'recommended', 'topics', 'tags']],
  ['clusters', ['id', 'title', 'domain', 'stage', 'order', 'summary']],
]) {
  for (const field of fields) {
    test(`rejects missing required ${collection}.${field}`, () => {
      const catalog = structuredClone(fixture);
      delete catalog[collection][0][field];
      assert.ok(validateGraph(catalog).includes(`${collection}[0].${field}: required field is missing`));
    });
  }
}

test('the existing content command fails on a malformed compressed graph', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'math-cs-ai-graph-'));
  try {
    for (const directory of ['content', 'schemas']) fs.cpSync(path.join(root, directory), path.join(temporaryRoot, directory), { recursive: true });
    fs.mkdirSync(path.join(temporaryRoot, 'data'));
    const catalog = loadAtlasCatalog();
    catalog.nodes[1].id = catalog.nodes[0].id;
    const encoded = gzipSync(JSON.stringify(catalog)).toString('base64');
    const partSize = Math.ceil(encoded.length / 5);
    for (let index = 0; index < 5; index += 1) {
      fs.writeFileSync(path.join(temporaryRoot, `data/catalog.part${index + 1}.js`), `window.__ATLAS_PARTS.push("${encoded.slice(index * partSize, (index + 1) * partSize)}");\n`);
    }
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/validate-content.mjs')], { cwd: temporaryRoot, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /FAIL: graph: nodes\[1\]\.id: duplicate ID/);
    assert.doesNotMatch(result.stdout, /PASS:/);
    fs.writeFileSync(path.join(temporaryRoot, 'data/catalog.part1.js'), 'invalid fragment');
    assert.throws(() => loadAtlasCatalog(temporaryRoot), /catalog\.part1\.js: missing base64 catalog fragment/);
  } finally {
    // The cleanup target must remain under the OS temporary directory.
    assert.ok(path.resolve(temporaryRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
