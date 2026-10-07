import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => typeof value === 'string' && value.length > 0 && value.trim() === value;
const domains = ['math', 'cs', 'ai'];
const nodeTypes = ['course', 'practice', 'tool', 'frontier'];

// Read the same five gzip/base64 fragments loaded by index.html and knowledge.html.
// Extract data only; never evaluate the JavaScript wrappers.
export function loadAtlasCatalog(root = repositoryRoot) {
  const encoded = [1, 2, 3, 4, 5].map(index => {
    const file = `data/catalog.part${index}.js`;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const match = source.match(/push\("([A-Za-z0-9+/=]+)"\)/);
    if (!match) throw new Error(`${file}: missing base64 catalog fragment`);
    return match[1];
  }).join('');
  return JSON.parse(zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
}

// Required node/cluster fields and enums come from DATA_MODEL.md. The runtime
// also accepts keyed collections (app-v4.js); keys supply omitted IDs.
// Relations assert referential integrity only, with no cycle or stage-order rule.
export function validateGraph(catalog) {
  const errors = [];
  const fail = (location, message) => errors.push(`${location}: ${message}`);
  if (!isRecord(catalog)) return ['catalog: must be an object'];

  function collection(key, required = true) {
    const value = catalog[key];
    if (value === undefined && !required) return [];
    let entries;
    if (Array.isArray(value)) {
      entries = value.map((item, index) => [item, `${key}[${index}]`]);
    } else if (isRecord(value)) {
      entries = Object.entries(value).map(([id, item]) => [
        isRecord(item) ? { id, ...item } : item, `${key}[${JSON.stringify(id)}]`,
      ]);
    } else {
      fail(key, 'must be an array or keyed object');
      return [];
    }
    return entries.filter(([item, location]) => {
      if (isRecord(item)) return true;
      fail(location, 'must be an object');
      return false;
    });
  }

  function indexIds(entries) {
    const ids = new Map();
    for (const [item, location] of entries) {
      if (!isId(item.id)) fail(`${location}.id`, 'must be a nonempty string without surrounding whitespace');
      else if (ids.has(item.id)) fail(`${location}.id`, `duplicate ID ${JSON.stringify(item.id)} (first at ${ids.get(item.id)})`);
      else ids.set(item.id, location);
    }
    return ids;
  }

  function fields(item, location, required) {
    for (const key of required) {
      if (!Object.hasOwn(item, key)) fail(`${location}.${key}`, 'required field is missing');
    }
  }

  function string(item, location, key) {
    if (Object.hasOwn(item, key) && typeof item[key] !== 'string') fail(`${location}.${key}`, 'must be a string');
  }

  function stringArray(item, location, key, targets) {
    if (!Object.hasOwn(item, key)) return;
    if (!Array.isArray(item[key])) { fail(`${location}.${key}`, 'must be an array'); return; }
    item[key].forEach((value, index) => {
      const at = `${location}.${key}[${index}]`;
      if (targets) {
        if (!isId(value)) fail(at, 'reference must be a nonempty string without surrounding whitespace');
        else if (!targets.has(value)) fail(at, `unknown ID ${JSON.stringify(value)}`);
      } else if (typeof value !== 'string') fail(at, 'must be a string');
    });
  }

  function domain(item, location) {
    if (Object.hasOwn(item, 'domain') && !domains.includes(item.domain)) fail(`${location}.domain`, 'must be math, cs, or ai');
  }

  const nodes = collection('nodes');
  const clusters = collection('clusters');
  const nodeIds = indexIds(nodes);
  const clusterIds = indexIds(clusters);
  for (const [cluster, location] of clusters) {
    fields(cluster, location, ['id', 'title', 'domain', 'stage', 'order', 'summary']);
    for (const key of ['title', 'summary']) string(cluster, location, key);
    domain(cluster, location);
    for (const key of ['stage', 'order']) {
      if (Object.hasOwn(cluster, key) && !Number.isFinite(cluster[key])) fail(`${location}.${key}`, 'must be a finite number');
    }
  }
  for (const [node, location] of nodes) {
    fields(node, location, ['id', 'title', 'domain', 'cluster', 'stage', 'type', 'summary', 'prerequisites', 'recommended', 'topics', 'tags']);
    for (const key of ['title', 'summary']) string(node, location, key);
    domain(node, location);
    if (Object.hasOwn(node, 'stage') && (!Number.isInteger(node.stage) || node.stage < 0 || node.stage > 8)) fail(`${location}.stage`, 'must be an integer from 0 to 8');
    if (Object.hasOwn(node, 'type') && !nodeTypes.includes(node.type)) fail(`${location}.type`, 'must be course, practice, tool, or frontier');
    if (Object.hasOwn(node, 'cluster')) {
      if (!isId(node.cluster)) fail(`${location}.cluster`, 'must be a nonempty cluster ID');
      else if (!clusterIds.has(node.cluster)) fail(`${location}.cluster`, `unknown ID ${JSON.stringify(node.cluster)}`);
    }
    for (const key of ['prerequisites', 'recommended']) stringArray(node, location, key, nodeIds);
    for (const key of ['topics', 'tags']) stringArray(node, location, key);
  }

  if (Object.hasOwn(catalog, 'clusterEdges')) {
    if (!Array.isArray(catalog.clusterEdges)) fail('clusterEdges', 'must be an array');
    else catalog.clusterEdges.forEach((edge, index) => {
      const location = `clusterEdges[${index}]`;
      if (!Array.isArray(edge) || edge.length !== 2) { fail(location, 'must be a pair of cluster IDs'); return; }
      edge.forEach((id, endpoint) => {
        if (!isId(id)) fail(`${location}[${endpoint}]`, 'must be a nonempty cluster ID');
        else if (!clusterIds.has(id)) fail(`${location}[${endpoint}]`, `unknown ID ${JSON.stringify(id)}`);
      });
    });
  }

  for (const key of ['paths', 'curricula']) {
    const entries = collection(key, false);
    indexIds(entries);
    for (const [item, location] of entries) {
      string(item, location, 'title');
      // Match extractIds() in app-v4.js, including legacy route field names
      // and object references. Missing/empty selections mean all nodes.
      const routeFields = ['nodes', 'nodeIds', 'requiredNodes', 'required', 'members', 'ids', 'path'];
      const activeField = routeFields.find(field => Array.isArray(item[field]));
      if (activeField) {
        item[activeField].forEach((entry, index) => {
          const id = typeof entry === 'string' ? entry : entry?.id || entry?.nodeId;
          const at = `${location}.${activeField}[${index}]`;
          if (!isId(id)) fail(at, 'reference must be a nonempty string without surrounding whitespace');
          else if (!nodeIds.has(id)) fail(at, `unknown ID ${JSON.stringify(id)}`);
        });
      } else {
        for (const field of routeFields) {
          if (Object.hasOwn(item, field)) fail(`${location}.${field}`, 'must be an array');
        }
      }
    }
  }
  return errors.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const catalog = loadAtlasCatalog();
    const errors = validateGraph(catalog);
    if (errors.length) {
      for (const error of errors) console.error(`FAIL: ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`PASS: graph integrity; ${Object.keys(catalog.nodes).length} nodes, ${Object.keys(catalog.clusters).length} clusters.`);
    }
  } catch (error) {
    console.error(`FAIL: catalog could not be loaded: ${error.message}`);
    process.exitCode = 1;
  }
}
