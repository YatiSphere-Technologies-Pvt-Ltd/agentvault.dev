'use client';

import { useState } from 'react';

/* Lightweight collapsible JSON viewer.
   Renders the same data a browser devtools console would, minus third-party
   dependencies. Keys colored muted; strings soft blue-ish; numbers mono;
   booleans/null uppercase mono. */
export default function JsonTree({ value, initialDepth = 2 }) {
  if (value === undefined) return <div className="text-[12px] text-muted-foreground italic">undefined</div>;
  return <Node value={value} depth={0} initialDepth={initialDepth} />;
}

function Node({ value, depth, initialDepth, keyName }) {
  if (value === null)                      return <Leaf label="null" tone="muted" keyName={keyName} />;
  if (typeof value === 'boolean')          return <Leaf label={String(value)} tone="accent" keyName={keyName} />;
  if (typeof value === 'number')           return <Leaf label={String(value)} tone="num" keyName={keyName} />;
  if (typeof value === 'string')           return <StringLeaf value={value} keyName={keyName} />;
  if (Array.isArray(value))                return <ArrayNode arr={value} depth={depth} initialDepth={initialDepth} keyName={keyName} />;
  if (typeof value === 'object')           return <ObjectNode obj={value} depth={depth} initialDepth={initialDepth} keyName={keyName} />;
  return <Leaf label={String(value)} tone="muted" keyName={keyName} />;
}

function Leaf({ label, tone, keyName }) {
  const toneClass =
    tone === 'num'    ? 'text-foreground' :
    tone === 'accent' ? 'text-primary' :
                        'text-muted-foreground';
  return (
    <div className="font-mono text-[11.5px] leading-relaxed">
      {keyName !== undefined && <Key name={keyName} />}
      <span className={toneClass}>{label}</span>
    </div>
  );
}

function StringLeaf({ value, keyName }) {
  // Truncate very long strings — expand on click
  const [open, setOpen] = useState(false);
  const tooLong = value.length > 220;
  const display = open || !tooLong ? value : value.slice(0, 220) + '…';
  return (
    <div className="font-mono text-[11.5px] leading-relaxed break-words">
      {keyName !== undefined && <Key name={keyName} />}
      <span className="text-brand-teal">&quot;{display}&quot;</span>
      {tooLong && (
        <button onClick={() => setOpen(o => !o)} className="ml-2 text-[10px] text-primary underline-offset-2 hover:underline">
          {open ? 'shorten' : 'expand'}
        </button>
      )}
    </div>
  );
}

function ObjectNode({ obj, depth, initialDepth, keyName }) {
  const [open, setOpen] = useState(depth < initialDepth);
  const entries = Object.entries(obj);
  return (
    <div className="font-mono text-[11.5px] leading-relaxed">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground"
      >
        <span className="inline-block w-3 text-[10px]">{open ? '▾' : '▸'}</span>
        {keyName !== undefined && <Key name={keyName} />}
        <span className="text-foreground">{`{`}</span>
        {!open && <span className="text-muted-foreground italic">{entries.length} {entries.length === 1 ? 'key' : 'keys'}</span>}
        {!open && <span className="text-foreground">{`}`}</span>}
      </button>
      {open && (
        <div className="pl-4 border-l border-border/60 ml-1 mt-0.5">
          {entries.map(([k, v]) => (
            <Node key={k} keyName={k} value={v} depth={depth + 1} initialDepth={initialDepth} />
          ))}
          <div className="text-foreground">{`}`}</div>
        </div>
      )}
    </div>
  );
}

function ArrayNode({ arr, depth, initialDepth, keyName }) {
  const [open, setOpen] = useState(depth < initialDepth);
  return (
    <div className="font-mono text-[11.5px] leading-relaxed">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground"
      >
        <span className="inline-block w-3 text-[10px]">{open ? '▾' : '▸'}</span>
        {keyName !== undefined && <Key name={keyName} />}
        <span className="text-foreground">{`[`}</span>
        {!open && <span className="text-muted-foreground italic">{arr.length} {arr.length === 1 ? 'item' : 'items'}</span>}
        {!open && <span className="text-foreground">{`]`}</span>}
      </button>
      {open && (
        <div className="pl-4 border-l border-border/60 ml-1 mt-0.5">
          {arr.map((v, i) => (
            <Node key={i} keyName={i} value={v} depth={depth + 1} initialDepth={initialDepth} />
          ))}
          <div className="text-foreground">{`]`}</div>
        </div>
      )}
    </div>
  );
}

function Key({ name }) {
  return (
    <span className="text-muted-foreground mr-1">
      {typeof name === 'number' ? name : <span>&quot;{name}&quot;</span>}:
    </span>
  );
}
