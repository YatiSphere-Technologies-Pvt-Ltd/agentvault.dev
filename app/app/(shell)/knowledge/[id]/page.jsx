'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ACL_MODES, CHUNK_STRATEGIES, EMBEDDING_MODELS, kindById } from '../_catalog';
import { useSource, useSources } from '../_store';
import { KindIcon, StatusPill, fmtAgo, fmtBytes } from '../_shared';

const TABS = [
  { v: 'overview',   label: 'Overview' },
  { v: 'ingestion',  label: 'Ingestion' },
  { v: 'access',     label: 'Access' },
];

export default function KnowledgeSourceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get('tab') || 'overview';

  const { source, hydrated, patch } = useSource(id);
  const { deleteSource } = useSources();

  // Simulate ingestion finishing — flip status to "ready" after a short delay when indexing.
  useEffect(() => {
    if (!source || source.status !== 'indexing') return;
    const t = setTimeout(() => {
      patch(current => ({
        ...current,
        status: 'ready',
        docs: 120 + Math.floor(Math.random() * 800),
        chunks: 1200 + Math.floor(Math.random() * 18_000),
        indexBytes: 2 * 1024 * 1024 + Math.floor(Math.random() * 40 * 1024 * 1024),
        p50Retrieval: 80 + Math.floor(Math.random() * 180),
        recall: 0.85 + Math.random() * 0.12,
        lastIndexedAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + 6 * 3600000).toISOString(),
      }));
    }, 2200);
    return () => clearTimeout(t);
  }, [source, patch]);

  const setTab = (v) => {
    const p = new URLSearchParams(search.toString());
    p.set('tab', v);
    router.replace(`/app/knowledge/${id}?${p.toString()}`);
  };

  if (!hydrated) return <div className="max-w-7xl mx-auto px-6 py-10 text-[13px] text-muted-foreground">Loading source…</div>;
  if (!source) return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/app/knowledge" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All sources
      </Link>
      <h1 className="mt-4 text-[24px] font-semibold">Source not found</h1>
      <p className="mt-2 text-[13.5px] text-muted-foreground">
        No source with id <span className="font-mono">{id}</span>.
      </p>
      <Button render={<Link href="/app/knowledge" />} className="mt-5">Back to Knowledge</Button>
    </div>
  );

  const kind = kindById(source.kind);
  const confirmDelete = () => {
    deleteSource(source.id);
    router.push('/app/knowledge');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link href="/app/knowledge" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All sources
      </Link>

      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <KindIcon name={kind?.icon || 'docs'} size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-tight truncate">{source.name}</h1>
              <StatusPill status={source.status} />
              <Badge variant="outline" className="text-[9.5px]">{kind?.label || source.kind}</Badge>
            </div>
            <div className="text-[12px] text-muted-foreground font-mono truncate">{source.id} · {source.team}</div>
            {source.description && <div className="mt-1 text-[13px] text-foreground/80 max-w-prose">{source.description}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {source.status === 'ready' && (
            <Button variant="outline" size="sm" onClick={() => patch('status', 'indexing')}>
              <RefreshCw className="h-3.5 w-3.5" /> Re-index
            </Button>
          )}
          {source.status === 'ready' && (
            <Button variant="outline" size="sm" onClick={() => patch('status', 'paused')}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {source.status === 'paused' && (
            <Button variant="outline" size="sm" onClick={() => patch('status', 'ready')}>
              <Play className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {source.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the source and its index. Attached agents will lose retrieval until you re-attach a replacement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:brightness-110">
                  Delete source
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="h-9 bg-muted/60">
          {TABS.map(t => <TabsTrigger key={t.v} value={t.v} className="text-[12.5px]">{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview"   className="mt-5"><OverviewTab  source={source} kind={kind} /></TabsContent>
        <TabsContent value="ingestion"  className="mt-5"><IngestionTab source={source} patch={patch} /></TabsContent>
        <TabsContent value="access"     className="mt-5"><AccessTab    source={source} patch={patch} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   Tabs
   ============================================================ */
function OverviewTab({ source, kind }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Index health</CardTitle>
            <CardDescription>Live figures from the last completed run.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Documents"    value={source.docs.toLocaleString()} />
              <Stat label="Chunks"       value={source.chunks.toLocaleString()} />
              <Stat label="Index size"   value={fmtBytes(source.indexBytes)} />
              <Stat label="Failed docs"  value={source.failedDocs} tone={source.failedDocs > 0 ? 'bad' : 'fg'} />
              <Stat label="p50 retrieval" value={source.p50Retrieval ? `${source.p50Retrieval} ms` : '—'} />
              <Stat label="Recall"       value={source.recall ? `${(source.recall * 100).toFixed(1)}%` : '—'} tone="good" />
              <Stat label="Last indexed" value={fmtAgo(source.lastIndexedAt)} />
              <Stat label="Next run"     value={fmtAgo(source.nextRunAt)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Connection</CardTitle>
            <CardDescription>Credentials stay in the vault. Agents never see these.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/60 border border-border rounded-lg">
              <Kv k="Kind" v={kind?.label || source.kind} mono />
              {kind?.id === 'file' ? (
                <Kv k="Uploaded files" v={source.connection.fileCount?.toLocaleString() || '—'} mono />
              ) : (
                kind?.connectionFields.map(f => (
                  <Kv key={f.key} k={f.label} v={source.connection[f.key] || '—'} mono />
                ))
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Usage</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <Kv k="Attached agents" v={source.attachedAgents.length.toString()} mono />
              <Kv k="Queries (30d)"   v={source.queries30d.toLocaleString()}       mono />
              <Kv k="Last used"       v={fmtAgo(source.lastUsedAt)}                 mono />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-[14px]">Attached agents</CardTitle></CardHeader>
          <CardContent>
            {source.attachedAgents.length === 0 ? (
              <div className="text-[12.5px] text-muted-foreground">No agents have attached this source yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {source.attachedAgents.map(aid => (
                  <li key={aid}>
                    <Link href={`/app/agents/${aid}?tab=knowledge`} className="text-[12.5px] font-mono text-primary hover:underline">
                      {aid}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function IngestionTab({ source, patch }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Chunking & embedding</CardTitle>
            <CardDescription>Changing these triggers a full re-index.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Strategy</Label>
              <Select value={source.chunking.strategy} onValueChange={v => patch('chunking.strategy', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHUNK_STRATEGIES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Embedding model</Label>
              <Select value={source.embedding.model} onValueChange={v => {
                const em = EMBEDDING_MODELS.find(m => m.id === v);
                patch(cur => ({ ...cur, embedding: { model: v, dim: em?.dim || cur.embedding.dim } }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMBEDDING_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Chunk size · {source.chunking.size} tokens</Label>
              <Slider min={128} max={2048} step={64} value={[source.chunking.size]} onValueChange={([v]) => patch('chunking.size', v)} />
            </div>
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Overlap · {source.chunking.overlap} tokens</Label>
              <Slider min={0} max={512} step={16} value={[source.chunking.overlap]} onValueChange={([v]) => patch('chunking.overlap', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Refresh schedule</CardTitle>
            <CardDescription>When we crawl the source for updates.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Cron</Label>
              <Input value={source.refresh.cron} onChange={e => patch('refresh.cron', e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Mode</Label>
              <Select value={source.refresh.mode} onValueChange={v => patch('refresh.mode', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incremental">Incremental</SelectItem>
                  <SelectItem value="full">Full re-index</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">File patterns</CardTitle>
            <CardDescription>Glob patterns that define which files get indexed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={source.filePatterns.join(', ')}
              onChange={e => patch('filePatterns', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="*.pdf, *.md, *.docx"
              className="font-mono"
            />
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Re-index impact</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed space-y-2">
            <p>Changing chunk size, overlap, or embedding model requires a full re-index.</p>
            <p>Estimated time for <b className="text-foreground">{source.docs.toLocaleString()}</b> docs: <b className="text-foreground">{Math.max(2, Math.round(source.docs / 300))}m</b>.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function AccessTab({ source, patch }) {
  const allow = source.acl.allow || [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Access mode</CardTitle>
            <CardDescription>Who can retrieve from this source at run time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ACL_MODES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => patch('acl.mode', m.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  source.acl.mode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="text-[13px] font-medium">{m.label}</div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">{m.desc}</div>
              </button>
            ))}
            {source.acl.mode === 'allow-list' && (
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Allow groups</Label>
                <Input
                  value={allow.join(', ')}
                  onChange={e => patch('acl.allow', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="finance-managers, ap-team"
                />
                <p className="mt-1 text-[10.5px] text-muted-foreground font-mono">Comma-separated SCIM groups.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Audit</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed">
            Every retrieval is logged with the calling agent + user + matched chunks. Exported to the workspace audit log and retained for 18 months.
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

/* ============================================================
   Small primitives
   ============================================================ */
function Stat({ label, value, tone }) {
  const color = tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-brand-teal' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[17px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
function Kv({ k, v, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-3 py-2 border-b border-border/60 last:border-none">
      <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</span>
      <span className={`text-[12.5px] text-right truncate ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  );
}
