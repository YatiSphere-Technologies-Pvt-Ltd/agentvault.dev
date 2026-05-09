'use client';

/* NudgeBox — out-of-band steering for a *running* agent.
   ─────────────────────────────────────────────────────
   The other HITL primitives (approval points, decisions on the inbox) all
   require the agent to have paused on its own. Nudges are the inverse: the
   human starts the conversation. The agent's loop reads its inbox at safe
   checkpoints (between iterations / before tool calls) and incorporates
   pending nudges into context. If a nudge says "stop", the agent halts at
   the next checkpoint and creates an approval task for confirmation.

   Three quick presets cover most real cases (be more conservative · stop
   after current step · prefer source X), plus a free-text composer and a
   `Stop now` action that sends a stop nudge.

   The demo simulates the agent picking up the nudge ~2s after send, so the
   "Consumed" badge + the agent's reaction line appear without a real
   runtime. In production the agent runtime calls consumeNudge() at its
   checkpoint with whatever interpretation it formed. */

import { useState } from 'react';
import { Send, MessageSquare, ShieldAlert, Sparkles, Octagon, Bot, Check, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNudges, sendNudge, consumeNudge, useMe } from '../../approvals/_store';

const PRESETS = [
  {
    id: 'conservative',
    label: 'Be more conservative',
    body: 'Lower your risk tolerance for the rest of this run. Prefer asking a human over taking irreversible actions.',
    icon: ShieldAlert,
  },
  {
    id: 'stop-after-step',
    label: 'Stop after current step',
    body: 'Finish the step you are on, then pause and create an approval task before continuing.',
    icon: Octagon,
  },
  {
    id: 'prefer-source',
    label: 'Prefer the verified source',
    body: 'Trust the verified knowledge corpus over web search results from here on.',
    icon: Sparkles,
  },
];

export default function NudgeBox({ runId, runStatus }) {
  const me = useMe();
  const nudges = useNudges(runId);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const isRunning = runStatus === 'running' || runStatus === 'paused';

  // For finished runs that never had nudges, render nothing — keeps the
  // overview clean. The component still mounts (for the hook) but returns
  // null. History is only useful evidence when something happened.
  if (!isRunning && nudges.length === 0) return null;

  // Always render history (so audit is permanent), only render composer on
  // running/paused runs — sending to a finished run would be misleading.
  const send = (kind, payload) => {
    setSending(true);
    sendNudge(runId, { who: me, kind, ...payload });
    // Demo simulator: flip to consumed after ~2s with a generated reaction.
    // The new nudge id is the latest entry.
    setTimeout(() => {
      const all = (typeof window !== 'undefined' && window.__nudgeAfterSend?.(runId)) || nudgesNow(runId);
      const fresh = all[all.length - 1];
      if (!fresh) { setSending(false); return; }
      consumeNudge(runId, fresh.id, autoReaction(kind, payload));
      setSending(false);
    }, 1800);
    setBody('');
  };

  const sendFree = () => {
    if (!body.trim()) return;
    send('guidance', { body: body.trim() });
  };

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/[0.04] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-accent/20 bg-accent/[0.06] flex items-center gap-2">
        <Bot className="h-3.5 w-3.5 text-accent" />
        <span className="text-[12px] font-medium text-foreground">Steer the agent</span>
        <span className="text-[10.5px] text-muted-foreground">
          {isRunning
            ? '· agent is running — it picks up nudges at its next checkpoint'
            : '· run is finished — sending is disabled, history is read-only'}
        </span>
      </div>

      {isRunning && (
        <div className="px-4 py-3 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={sending}
                  onClick={() => send('guidance', { body: p.body })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-background hover:border-accent/50 hover:bg-accent/[0.04] transition-colors text-[11.5px] text-foreground disabled:opacity-50"
                >
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={sending}
              onClick={() => send('stop', { body: 'Stop now. Halt at the next safe checkpoint and wait for human approval.' })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors text-[11.5px] text-destructive disabled:opacity-50"
            >
              <Octagon className="h-3 w-3" />
              Stop now
            </button>
          </div>

          <div className="flex items-start gap-2">
            <textarea
              rows={2}
              placeholder="Or write a custom nudge — agent reads this on its next checkpoint"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none disabled:opacity-50"
            />
            <Button
              size="sm"
              onClick={sendFree}
              disabled={sending || !body.trim()}
              className="bg-accent text-accent-foreground hover:brightness-110 shrink-0"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>
        </div>
      )}

      {nudges.length > 0 && (
        <div className="border-t border-accent/15 divide-y divide-border bg-card">
          {nudges.slice().reverse().map(n => (
            <NudgeRow key={n.id} nudge={n} />
          ))}
        </div>
      )}

      {!isRunning && nudges.length === 0 && (
        <div className="px-4 py-3 text-[11.5px] text-muted-foreground italic">
          No nudges sent during this run.
        </div>
      )}
    </div>
  );
}

function NudgeRow({ nudge }) {
  const consumed = !!nudge.consumed_at;
  const isStop = nudge.kind === 'stop';
  const KindIcon = isStop ? Octagon : MessageSquare;
  return (
    <div className="px-4 py-2.5 flex items-start gap-3">
      <KindIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isStop ? 'text-destructive' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em] ${
            isStop
              ? 'border-destructive/40 text-destructive bg-destructive/10'
              : 'border-accent/40 text-accent bg-accent/10'
          }`}>
            {nudge.kind}
          </span>
          {consumed ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-brand-teal">
              <Check className="h-3 w-3" /> agent picked up
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-primary">
              <Hourglass className="h-3 w-3 animate-pulse" /> awaiting checkpoint
            </span>
          )}
          <span className="text-[10.5px] font-mono text-muted-foreground ml-auto">
            {new Date(nudge.sent_at).toLocaleTimeString()}
          </span>
        </div>
        <div className="mt-1 text-[12.5px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {nudge.body || <span className="italic text-muted-foreground">(no body)</span>}
        </div>
        {consumed && nudge.agent_reaction && (
          <div className="mt-1.5 rounded border border-(--brand-teal)/30 bg-(--brand-teal)/5 px-2 py-1.5 text-[11.5px] text-foreground/85">
            <span className="font-mono text-brand-teal">agent:</span> {nudge.agent_reaction}
          </div>
        )}
        <div className="mt-1 text-[10px] font-mono text-muted-foreground">
          sent by {nudge.sent_by}
        </div>
      </div>
    </div>
  );
}

/* Reaches into the cached snapshot to grab the just-pushed nudge so the
   demo simulator knows which one to consume. Avoids racing the React
   re-render that would otherwise happen between sendNudge and the timeout
   firing. */
function nudgesNow(runId) {
  // The store keeps a module-level cached map of nudges by runId; this
  // import path is the only public read.
  // Import ergonomics: use require here would create a cycle; instead we
  // expose a tiny accessor.
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('agentvault.approvals.v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (parsed.nudges && parsed.nudges[runId]) || [];
  } catch { return []; }
}

function autoReaction(kind, payload) {
  if (kind === 'stop') return 'Halting at next checkpoint. Will create an approval task before continuing.';
  const body = (payload?.body || '').toLowerCase();
  if (body.includes('conservative')) return 'Got it — switching to conservative mode. Will pause before any irreversible action.';
  if (body.includes('stop after')) return 'Acknowledged. Will finish current step then pause for approval.';
  if (body.includes('prefer the verified') || body.includes('verified source')) return 'Acknowledged. Prioritizing verified corpus, deprioritizing web search.';
  return 'Got it. Folding this into the next planning step.';
}
