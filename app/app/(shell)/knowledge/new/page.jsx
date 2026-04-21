'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  ACL_MODES, CHUNK_STRATEGIES, EMBEDDING_MODELS, KIND_CATALOG, kindById,
} from '../_catalog';
import { useSources } from '../_store';
import { KindIcon } from '../_shared';

const STEPS = [
  { id: 'kind',       label: 'Kind',       hint: 'What are you connecting?' },
  { id: 'connect',    label: 'Connect',    hint: 'Credentials + scope' },
  { id: 'ingestion',  label: 'Ingestion',  hint: 'Chunking + refresh + ACL' },
  { id: 'review',     label: 'Review',     hint: 'Start indexing' },
];

export default function NewKnowledgeSourcePage() {
  const router = useRouter();
  const { createSource } = useSources();

  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx].id;

  const [kindId, setKindId] = useState(null);
  const [identity, setIdentity] = useState({ name: '', description: '', team: 'Default team', visibility: 'team' });
  const [connection, setConnection] = useState({});        // kind-specific
  const [filePatterns, setFilePatterns] = useState('*.pdf, *.md, *.docx, *.csv');
  const [files, setFiles] = useState([]);                  // mock uploads for kind=file
  const [chunking, setChunking] = useState({ strategy: 'semantic', size: 512, overlap: 64 });
  const [embedding, setEmbedding] = useState({ model: 'text-embedding-3-large' });
  const [refresh, setRefresh] = useState({ cron: '0 */6 * * *', mode: 'incremental' });
  const [acl, setAcl] = useState({ mode: 'inherit-from-source', allow: '' });

  const kind = kindById(kindId);

  const canAdvance = (() => {
    if (step === 'kind')      return !!kindId;
    if (step === 'connect') {
      if (kindId === 'file') return identity.name.trim().length > 0 && files.length > 0;
      if (identity.name.trim().length === 0) return false;
      return kind.connectionFields.every(f => !f.required || !!connection[f.key]?.toString().trim());
    }
    if (step === 'ingestion') return true;
    if (step === 'review')    return true;
    return true;
  })();

  const finish = () => {
    const src = createSource({
      kind: kindId,
      name: identity.name.trim(),
      description: identity.description.trim(),
      team: identity.team,
      visibility: identity.visibility,
      connection: kindId === 'file' ? { fileCount: files.length } : connection,
      filePatterns: filePatterns.split(',').map(s => s.trim()).filter(Boolean),
      chunking,
      embedding: { model: embedding.model, dim: EMBEDDING_MODELS.find(m => m.id === embedding.model)?.dim || 1024 },
      refresh,
      acl: { mode: acl.mode, allow: acl.allow.split(',').map(s => s.trim()).filter(Boolean) },
      status: 'indexing',
      nextRunAt: new Date(Date.now() + 120_000).toISOString(),
    });
    router.push(`/app/knowledge/${src.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <Link href="/app/knowledge" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All sources
      </Link>

      <div className="mt-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
          <KindIcon name={kind?.icon || 'docs'} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">New knowledge source</div>
            {kind && <Badge variant="outline" className="text-[9.5px]">{kind.label}</Badge>}
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Connect a data source</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Credentials stay in the vault. Agents never see raw connection details — they query via a shared index.
          </p>
        </div>
      </div>

      <ol className="mt-7 grid gap-3" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
        {STEPS.map((s, i) => {
          const state = stepIdx > i ? 'done' : stepIdx === i ? 'active' : 'future';
          return (
            <li key={s.id}
              className={`relative rounded-lg border p-3 ${
                state === 'active' ? 'border-primary/50 bg-primary/5'
                : state === 'done' ? 'border-border bg-card'
                : 'border-dashed border-border bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium ${
                  state === 'done'    ? 'bg-brand-teal text-white'
                  : state === 'active' ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}>
                  {state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium leading-tight truncate">{s.label}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">{s.hint}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {step === 'kind'      && <StepKind kindId={kindId} onPick={setKindId} />}
        {step === 'connect'   && <StepConnect kind={kind} identity={identity} setIdentity={setIdentity} connection={connection} setConnection={setConnection} files={files} setFiles={setFiles} filePatterns={filePatterns} setFilePatterns={setFilePatterns} />}
        {step === 'ingestion' && <StepIngestion chunking={chunking} setChunking={setChunking} embedding={embedding} setEmbedding={setEmbedding} refresh={refresh} setRefresh={setRefresh} acl={acl} setAcl={setAcl} />}
        {step === 'review'    && <StepReview kind={kind} identity={identity} connection={connection} files={files} chunking={chunking} embedding={embedding} refresh={refresh} acl={acl} />}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => stepIdx === 0 ? router.push('/app/knowledge') : setStepIdx(s => s - 1)}>
          <ArrowLeft className="h-4 w-4" />
          {stepIdx === 0 ? 'Cancel' : 'Back'}
        </Button>
        {stepIdx < STEPS.length - 1 ? (
          <Button disabled={!canAdvance} onClick={() => setStepIdx(s => s + 1)}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish}>
            Start indexing
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Step 1 — Kind picker
   ============================================================ */
function StepKind({ kindId, onPick }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">What are you connecting?</CardTitle>
        <CardDescription>Each kind has its own connection form on the next step.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {KIND_CATALOG.map(k => {
            const active = kindId === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => onPick(k.id)}
                className={`text-left rounded-lg border p-4 transition-colors min-w-0 ${
                  active ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <KindIcon name={k.icon} size={16} />
                  </div>
                  {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <div className="mt-3 text-[14px] font-semibold">{k.label}</div>
                <p className="mt-1 text-[12px] text-muted-foreground leading-snug">{k.blurb}</p>
                <div className="mt-2 text-[10.5px] font-mono text-muted-foreground">{k.scopeHint}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Step 2 — Kind-specific connect form
   ============================================================ */
function StepConnect({ kind, identity, setIdentity, connection, setConnection, files, setFiles, filePatterns, setFilePatterns }) {
  const set = (k, v) => setIdentity({ ...identity, [k]: v });
  const setConn = (k, v) => setConnection({ ...connection, [k]: v });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Identity</CardTitle>
            <CardDescription>Name this source so builders can find it when attaching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Name</Label>
                <Input value={identity.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Employee handbook" autoFocus />
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Team</Label>
                <Input value={identity.team} onChange={e => set('team', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Description</Label>
                <Textarea value={identity.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="What's in this source? Helps builders pick the right one." />
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Visibility</Label>
                <Select value={identity.visibility} onValueChange={v => set('visibility', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private — just me</SelectItem>
                    <SelectItem value="team">Team — {identity.team}</SelectItem>
                    <SelectItem value="org">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Connection · {kind.label}</CardTitle>
            <CardDescription>{kind.scopeHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {kind.id === 'file' ? (
              <FileDropzone files={files} setFiles={setFiles} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kind.connectionFields.map(f => (
                  <div key={f.key} className={f.key === 'include' || f.key === 'exclude' || f.key === 'body' ? 'md:col-span-2' : ''}>
                    <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                    {f.type === 'select' ? (
                      <Select value={connection[f.key] || ''} onValueChange={v => setConn(f.key, v)}>
                        <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                        <SelectContent>
                          {f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={f.type || 'text'}
                        value={connection[f.key] || ''}
                        onChange={e => setConn(f.key, e.target.value)}
                        placeholder={f.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {kind.id !== 'file' && kind.id !== 'snowflake' && kind.id !== 'postgres' && (
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">File patterns</Label>
                <Input value={filePatterns} onChange={e => setFilePatterns(e.target.value)} placeholder="*.pdf, *.md, *.docx" />
                <p className="mt-1 text-[10.5px] text-muted-foreground font-mono">Comma-separated glob patterns. Leave as <code>*</code> to include everything.</p>
              </div>
            )}

            {kind.id !== 'file' && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-muted/30 text-[12px]">
                <div className="text-muted-foreground">We'll do a dry-run against this connection to verify credentials + scope.</div>
                <Button variant="outline" size="sm" disabled>Test connection</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Secret handling</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed">
            Credentials are stored in the workspace auth vault, encrypted at rest with customer-managed keys. Agents only see a scoped retrieval API — never the raw source.
          </CardContent>
        </Card>
        {kind.id !== 'file' && (
          <Card>
            <CardHeader><CardTitle className="text-[14px]">Which account?</CardTitle></CardHeader>
            <CardContent className="text-[12px] text-muted-foreground leading-relaxed">
              If the account you need isn't in the list, an admin can connect a new OAuth app from <span className="font-medium text-foreground">Settings → Integrations</span>.
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function FileDropzone({ files, setFiles }) {
  const onPick = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles([...files, ...list.map(f => ({ name: f.name, size: f.size }))]);
  };
  const remove = (i) => setFiles(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className="flex flex-col items-center gap-2 p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <div className="text-[13px] font-medium">Drop files here or click to browse</div>
        <div className="text-[11px] text-muted-foreground">PDF, DOCX, MD, CSV, TXT · up to 100 MB each</div>
        <input type="file" multiple className="hidden" onChange={onPick} />
      </label>
      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-border border border-border rounded-lg overflow-hidden">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between p-3">
              <div className="text-[12.5px]">{f.name}</div>
              <div className="flex items-center gap-3">
                <span className="text-[10.5px] font-mono text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(i)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   Step 3 — Ingestion config (shared across kinds)
   ============================================================ */
function StepIngestion({ chunking, setChunking, embedding, setEmbedding, refresh, setRefresh, acl, setAcl }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Chunking</CardTitle>
            <CardDescription>How documents are split before embedding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Strategy</Label>
                <Select value={chunking.strategy} onValueChange={v => setChunking({ ...chunking, strategy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHUNK_STRATEGIES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Embedding model</Label>
                <Select value={embedding.model} onValueChange={v => setEmbedding({ model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMBEDDING_MODELS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span>{m.label}</span>
                          <span className="text-[10.5px] font-mono text-muted-foreground">{m.dim}d</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Chunk size · {chunking.size} tokens</Label>
                <Slider min={128} max={2048} step={64} value={[chunking.size]} onValueChange={([v]) => setChunking({ ...chunking, size: v })} />
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Overlap · {chunking.overlap} tokens</Label>
                <Slider min={0} max={512} step={16} value={[chunking.overlap]} onValueChange={([v]) => setChunking({ ...chunking, overlap: v })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Refresh schedule</CardTitle>
            <CardDescription>Keep the index current. We'll pick up deletions and updates from the source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Cron</Label>
                <Input value={refresh.cron} onChange={e => setRefresh({ ...refresh, cron: e.target.value })} className="font-mono" />
                <p className="mt-1 text-[10.5px] text-muted-foreground font-mono">Default: every 6 hours.</p>
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Mode</Label>
                <Select value={refresh.mode} onValueChange={v => setRefresh({ ...refresh, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incremental">Incremental (recommended)</SelectItem>
                    <SelectItem value="full">Full re-index</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Access control</CardTitle>
            <CardDescription>Who can retrieve from this source at run time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {ACL_MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAcl({ ...acl, mode: m.id })}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    acl.mode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="text-[13px] font-medium">{m.label}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
            {acl.mode === 'allow-list' && (
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Allow groups</Label>
                <Input value={acl.allow} onChange={e => setAcl({ ...acl, allow: e.target.value })} placeholder="finance-managers, ap-team" />
                <p className="mt-1 text-[10.5px] text-muted-foreground font-mono">Comma-separated SCIM groups.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Guidance</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed space-y-2">
            <p><b className="text-foreground">Chunk size 512 / overlap 64</b> works for most prose. For tabular / row-oriented data, lower overlap; for code, bigger chunks.</p>
            <p><b className="text-foreground">Semantic chunking</b> is slower at ingest but gives markedly better recall.</p>
            <p><b className="text-foreground">Inherit ACLs</b> when the source supports it (Confluence, SharePoint, Drive). Only fall back to allow-list if the source has no permissions model.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

/* ============================================================
   Step 4 — Review
   ============================================================ */
function StepReview({ kind, identity, connection, files, chunking, embedding, refresh, acl }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">Review & start indexing</CardTitle>
        <CardDescription>We'll begin ingestion as soon as you confirm. You can tune settings later from the source page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Group title="Identity">
          <Kv k="Name" v={identity.name || '—'} />
          <Kv k="Kind" v={kind.label} mono />
          <Kv k="Team" v={identity.team} />
          <Kv k="Visibility" v={identity.visibility} />
          {identity.description && <Kv k="Description" v={identity.description} />}
        </Group>

        <Group title="Connection">
          {kind.id === 'file' ? (
            <Kv k="Uploaded files" v={`${files.length}`} />
          ) : (
            kind.connectionFields.map(f => (
              <Kv key={f.key} k={f.label} v={connection[f.key] || '—'} mono />
            ))
          )}
        </Group>

        <Group title="Ingestion">
          <Kv k="Embedding"    v={EMBEDDING_MODELS.find(m => m.id === embedding.model)?.label || embedding.model} />
          <Kv k="Chunking"     v={`${chunking.strategy} · ${chunking.size}t / ${chunking.overlap}t overlap`} mono />
          <Kv k="Refresh"      v={`${refresh.cron} · ${refresh.mode}`} mono />
          <Kv k="Access"       v={ACL_MODES.find(m => m.id === acl.mode)?.label || acl.mode} />
          {acl.mode === 'allow-list' && <Kv k="Allow groups" v={acl.allow || '—'} mono />}
        </Group>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
          Once you click <b className="text-foreground">Start indexing</b>, the source moves to <span className="font-mono">indexing</span>. It typically completes in 2–10 minutes depending on size.
        </div>
      </CardContent>
    </Card>
  );
}

function Group({ title, children }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-mono mb-1.5">{title}</div>
      <div className="rounded-lg border border-border bg-background divide-y divide-border/60">{children}</div>
    </div>
  );
}
function Kv({ k, v, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-3 py-2">
      <span className="text-[11.5px] text-muted-foreground">{k}</span>
      <span className={`text-[12.5px] text-right truncate ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  );
}

