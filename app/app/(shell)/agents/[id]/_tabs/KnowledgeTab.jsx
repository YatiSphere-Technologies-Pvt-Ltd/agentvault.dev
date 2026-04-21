'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { FieldRow, Section } from './_shared';
import { useSources } from '../../../knowledge/_store';
import { KindIcon, StatusPill, fmtAgo } from '../../../knowledge/_shared';

export default function KnowledgeTab({ agent, patch }) {
  const { sources, hydrated } = useSources();
  const attachedIds = agent.knowledge?.attachedSourceIds || [];
  const retrieval   = agent.knowledge?.retrieval || { topK: 8, threshold: 0.25, reranker: true, hybrid: true };
  const [attachOpen, setAttachOpen] = useState(false);

  const attached = useMemo(
    () => attachedIds.map(id => sources.find(s => s.id === id)).filter(Boolean),
    [attachedIds, sources],
  );
  const unattached = useMemo(
    () => sources.filter(s => !attachedIds.includes(s.id) && s.status !== 'failed'),
    [sources, attachedIds],
  );

  const attach = (id) => patch('knowledge.attachedSourceIds', [...attachedIds, id]);
  const detach = (id) => patch('knowledge.attachedSourceIds', attachedIds.filter(x => x !== id));
  const setRetrieval = (key, value) => patch(`knowledge.retrieval.${key}`, value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section
          title={`Attached sources · ${attached.length}`}
          description="Workspace knowledge this agent can retrieve from at run time."
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" render={<Link href="/app/knowledge" />}>
                Manage sources <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
                <DialogTrigger render={
                  <Button size="sm" disabled={!hydrated || unattached.length === 0}>
                    <Plus className="h-3.5 w-3.5" /> Attach source
                  </Button>
                } />
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Attach a workspace source</DialogTitle>
                    <DialogDescription>
                      Sources configured in <Link href="/app/knowledge" className="text-primary hover:underline">Knowledge</Link>. Pick one or more.
                    </DialogDescription>
                  </DialogHeader>
                  {unattached.length === 0 ? (
                    <div className="p-6 rounded-lg border border-dashed border-border text-center">
                      <div className="text-[13px] font-medium">All sources already attached</div>
                      <div className="mt-1 text-[11.5px] text-muted-foreground">Create a new one to add more options.</div>
                      <div className="mt-3">
                        <Button variant="outline" size="sm" render={<Link href="/app/knowledge/new" />}>
                          <Plus className="h-3.5 w-3.5" /> New source
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                      {unattached.map(s => (
                        <li key={s.id} className="flex items-center gap-3 p-3">
                          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <KindIcon name={iconFor(s.kind)} size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-medium truncate">{s.name}</span>
                              <Badge variant="outline" className="text-[9.5px]">{s.kind}</Badge>
                              <StatusPill status={s.status} />
                            </div>
                            <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                              {s.docs.toLocaleString()} docs · {s.team} · {fmtAgo(s.lastIndexedAt)}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => { attach(s.id); setAttachOpen(false); }}>
                            Attach
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          }
        >
          {!hydrated ? (
            <div className="text-[12.5px] text-muted-foreground">Loading sources…</div>
          ) : attached.length === 0 ? (
            <div className="p-6 border border-dashed border-border rounded-lg text-center">
              <div className="h-10 w-10 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <Plus className="h-4 w-4" />
              </div>
              <div className="mt-2 text-[13px] font-medium">No sources attached</div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">
                This agent has no knowledge. Attach a source so it can answer grounded in your data.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {attached.map(s => (
                <li key={s.id} className="flex items-center gap-3 p-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <KindIcon name={iconFor(s.kind)} size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/app/knowledge/${s.id}`} className="text-[13px] font-medium truncate hover:underline">{s.name}</Link>
                      <Badge variant="outline" className="text-[9.5px]">{s.kind}</Badge>
                      <StatusPill status={s.status} />
                    </div>
                    <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                      {s.docs.toLocaleString()} docs · {s.chunks.toLocaleString()} chunks · {fmtAgo(s.lastIndexedAt)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => detach(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Retrieval" description="How this agent pulls context at run time. Per-agent — the source's own ingestion config isn't affected.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldRow label={`Top-k · ${retrieval.topK}`}>
              <Slider min={1} max={32} step={1} value={[retrieval.topK]} onValueChange={([v]) => setRetrieval('topK', v)} />
            </FieldRow>
            <FieldRow label={`Similarity threshold · ${retrieval.threshold.toFixed(2)}`}>
              <Slider min={0} max={1} step={0.05} value={[retrieval.threshold]} onValueChange={([v]) => setRetrieval('threshold', v)} />
            </FieldRow>
            <FieldRow label="Hybrid (BM25 + vector)">
              <div className="flex items-center justify-between p-2 rounded-md border border-border">
                <span className="text-[12.5px] text-muted-foreground">Combine lexical + semantic</span>
                <Switch checked={retrieval.hybrid} onCheckedChange={v => setRetrieval('hybrid', v)} />
              </div>
            </FieldRow>
            <FieldRow label="Reranker">
              <div className="flex items-center justify-between p-2 rounded-md border border-border">
                <span className="text-[12.5px] text-muted-foreground">Cross-encoder rerank of top-k</span>
                <Switch checked={retrieval.reranker} onCheckedChange={v => setRetrieval('reranker', v)} />
              </div>
            </FieldRow>
          </div>
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="Coverage">
          <div className="space-y-1.5 text-[12.5px]">
            <Row k="Sources"   v={attached.length.toString()} />
            <Row k="Documents" v={attached.reduce((a, b) => a + b.docs,   0).toLocaleString()} />
            <Row k="Chunks"    v={attached.reduce((a, b) => a + b.chunks, 0).toLocaleString()} />
          </div>
        </Section>
        <Section title="How it works">
          <ul className="text-[12px] text-muted-foreground space-y-2 list-disc pl-4">
            <li>Each source has its own ingestion + ACL — configure those in <Link href="/app/knowledge" className="text-primary hover:underline">Knowledge</Link>.</li>
            <li>At run time, this agent queries <span className="font-medium text-foreground">only</span> the sources you've attached here.</li>
            <li>ACLs from the source are honored: users can't retrieve chunks they lack permission for.</li>
          </ul>
        </Section>
      </aside>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono tabular-nums">{v}</span>
    </div>
  );
}

function iconFor(kind) {
  if (['file', 'confluence', 'notion', 'sharepoint', 'gdrive', 'url'].includes(kind)) return 'docs';
  if (['s3', 'http'].includes(kind)) return 'plug';
  if (['snowflake', 'postgres', 'db'].includes(kind)) return 'db';
  return 'docs';
}
