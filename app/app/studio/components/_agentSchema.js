/* Lightweight schema for agent `returns` contracts.

   Format A (shorthand, what we ship by default):
     { "decision": "string", "amount": "number", "reasons": "string[]" }
   Type names: "string" | "number" | "boolean" | "any" | "object" | "string[]"
   | "number[]" | enum syntax "approve | reject | escalate".

   Format B (a small subset of JSON Schema, accepted but not authored by hand
   yet): { "type": "object", "properties": { ... } }

   parseSchema(s)        → { ok, schema, error }
   validate(value, sch)  → { ok, errors: string[], coerced: value }
   sampleFromSchema(sch) → an example object that satisfies the schema; used
                           by the mock runner to produce realistic results.
*/

export function parseSchema(input) {
  if (input == null || input === '') return { ok: true, schema: { type: 'any' } };
  if (typeof input !== 'string') return { ok: true, schema: input };

  let parsed;
  try { parsed = JSON.parse(input); }
  catch (e) { return { ok: false, error: 'invalid JSON: ' + e.message }; }

  // If it already looks like JSON Schema, take it as-is.
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.type) {
    return { ok: true, schema: parsed };
  }

  // Otherwise treat the object as our shorthand: { fieldName: typeStr }.
  if (parsed && typeof parsed === 'object') {
    const properties = {};
    for (const [k, v] of Object.entries(parsed)) {
      properties[k] = shorthandTypeToSchema(v);
    }
    return { ok: true, schema: { type: 'object', properties, _shorthand: true } };
  }

  return { ok: false, error: 'expected an object at top level' };
}

function shorthandTypeToSchema(t) {
  if (typeof t !== 'string') {
    // Nested object literal
    if (t && typeof t === 'object') {
      const r = parseSchema(JSON.stringify(t));
      return r.ok ? r.schema : { type: 'any' };
    }
    return { type: 'any' };
  }
  const s = t.trim();
  // enum: "a | b | c"
  if (s.includes('|')) {
    const opts = s.split('|').map(x => x.trim()).filter(Boolean);
    return { type: 'string', enum: opts };
  }
  // arrays: "string[]" / "number[]" / "object[]"
  if (s.endsWith('[]')) {
    const inner = s.slice(0, -2);
    return { type: 'array', items: shorthandTypeToSchema(inner) };
  }
  switch (s) {
    case 'string':  return { type: 'string' };
    case 'number':  return { type: 'number' };
    case 'integer': return { type: 'integer' };
    case 'boolean': return { type: 'boolean' };
    case 'object':  return { type: 'object' };
    case 'any':     return { type: 'any' };
    default:        return { type: 'any', _hint: s };
  }
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export function validate(value, schema, path = '') {
  const errors = [];
  if (!schema) return { ok: true, errors };

  const t = schema.type;
  if (t === 'any') return { ok: true, errors };

  if (t === 'object') {
    if (typeOf(value) !== 'object') {
      errors.push(`${path || '<root>'}: expected object, got ${typeOf(value)}`);
      return { ok: false, errors };
    }
    if (schema.properties) {
      for (const [k, sub] of Object.entries(schema.properties)) {
        const v = value?.[k];
        if (v === undefined) {
          errors.push(`${path}${path ? '.' : ''}${k}: missing`);
          continue;
        }
        const r = validate(v, sub, `${path}${path ? '.' : ''}${k}`);
        for (const e of r.errors) errors.push(e);
      }
    }
    return { ok: errors.length === 0, errors };
  }

  if (t === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array, got ${typeOf(value)}`);
      return { ok: false, errors };
    }
    if (schema.items) {
      value.forEach((it, i) => {
        const r = validate(it, schema.items, `${path}[${i}]`);
        for (const e of r.errors) errors.push(e);
      });
    }
    return { ok: errors.length === 0, errors };
  }

  if (t === 'string') {
    if (typeof value !== 'string') errors.push(`${path}: expected string, got ${typeOf(value)}`);
    else if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: "${value}" not in [${schema.enum.join(', ')}]`);
    return { ok: errors.length === 0, errors };
  }

  if (t === 'number')  { if (typeof value !== 'number') errors.push(`${path}: expected number, got ${typeOf(value)}`); return { ok: errors.length === 0, errors }; }
  if (t === 'integer') { if (!Number.isInteger(value))  errors.push(`${path}: expected integer, got ${typeOf(value)}`); return { ok: errors.length === 0, errors }; }
  if (t === 'boolean') { if (typeof value !== 'boolean') errors.push(`${path}: expected boolean, got ${typeOf(value)}`); return { ok: errors.length === 0, errors }; }

  return { ok: errors.length === 0, errors };
}

/* Generate a plausible value that conforms to a parsed schema. Used by the
   mock runner so simulated agent outputs always satisfy the declared
   contract. */
export function sampleFromSchema(schema) {
  if (!schema) return null;
  const t = schema.type;
  if (t === 'any') return 'simulated';
  if (t === 'object') {
    const out = {};
    for (const [k, sub] of Object.entries(schema.properties || {})) {
      out[k] = sampleFromSchema(sub);
    }
    return out;
  }
  if (t === 'array') return [sampleFromSchema(schema.items || { type: 'any' })];
  if (t === 'string') {
    if (schema.enum?.length) return schema.enum[0];
    return 'simulated';
  }
  if (t === 'number')  return 42;
  if (t === 'integer') return 1;
  if (t === 'boolean') return true;
  return null;
}

/* Render the parsed schema back as the lo-fi shorthand for display. Useful
   when we want to show "the contract you declared" without re-emitting raw
   JSON Schema. */
export function describeSchema(schema, indent = 0) {
  if (!schema) return 'any';
  const t = schema.type;
  if (t === 'any')     return 'any';
  if (t === 'string')  return schema.enum?.length ? schema.enum.join(' | ') : 'string';
  if (t === 'number')  return 'number';
  if (t === 'integer') return 'integer';
  if (t === 'boolean') return 'boolean';
  if (t === 'array')   return describeSchema(schema.items, indent) + '[]';
  if (t === 'object') {
    const pad = '  '.repeat(indent + 1);
    const close = '  '.repeat(indent);
    if (!schema.properties) return 'object';
    const lines = Object.entries(schema.properties).map(([k, sub]) => `${pad}${k}: ${describeSchema(sub, indent + 1)}`);
    return `{\n${lines.join(',\n')}\n${close}}`;
  }
  return 'any';
}
