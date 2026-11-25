// A small JSON Schema checker covering the subset this repository uses:
// type, required, properties, additionalProperties:false, enum, const,
// minLength, pattern, items, minItems, uniqueItems, $ref (#/$defs/...).
// Zero dependencies on purpose: the site has no build step.

export function validateSchema(schema, value, root = schema, path = "$") {
  const errors = [];
  const at = (p, msg) => errors.push(`${p}: ${msg}`);
  const walk = (s, v, p) => {
    if (s.$ref) {
      const name = s.$ref.replace(/^#\/\$defs\//, "");
      const target = root.$defs?.[name];
      if (!target) return at(p, `未知引用 ${s.$ref}`);
      return walk(target, v, p);
    }
    if ("const" in s && v !== s.const) return at(p, `必须等于 ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.includes(v)) return at(p, `必须是 ${s.enum.map((x) => JSON.stringify(x)).join(" / ")} 之一，实际为 ${JSON.stringify(v)}`);
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      const actual = Array.isArray(v) ? "array" : v === null ? "null" : Number.isInteger(v) ? "integer" : typeof v;
      const ok = types.some((t) => t === actual || (t === "number" && actual === "integer"));
      if (!ok) return at(p, `类型应为 ${types.join("/")}，实际为 ${actual}`);
    }
    if (typeof v === "string") {
      if (s.minLength != null && [...v].length < s.minLength) at(p, `长度至少 ${s.minLength}`);
      if (s.pattern && !new RegExp(s.pattern).test(v)) at(p, `不匹配 ${s.pattern}`);
    }
    if (Array.isArray(v)) {
      if (s.minItems != null && v.length < s.minItems) at(p, `至少 ${s.minItems} 项，实际 ${v.length}`);
      if (s.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) at(p, "存在重复项");
      if (s.items) v.forEach((item, i) => walk(s.items, item, `${p}[${i}]`));
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const key of s.required || []) if (!(key in v)) at(p, `缺少必填字段 ${key}`);
      const props = s.properties || {};
      for (const [key, child] of Object.entries(v)) {
        if (props[key]) walk(props[key], child, `${p}.${key}`);
        else if (s.additionalProperties === false) at(p, `不允许的字段 ${key}`);
      }
    }
  };
  walk(schema, value, path);
  return errors;
}
