'use client';

import { useEffect, useState } from 'react';
import { useWorkspaces } from '../../_workspaceStore';
import { useAuth } from '../../../../auth/AuthProvider';
import { Field, SettingsCard, TextInput } from '../Fields';

export default function WorkspaceSettingsPage() {
  const { user } = useAuth();
  const { current, list, update, ready } = useWorkspaces(user?.workspace);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);

  // Hydrate draft whenever the selected workspace changes.
  useEffect(() => {
    if (current) setDraft({
      name:        current.name,
      region:      current.region,
      defaultLLM:  current.defaultLLM,
      policyFile:  current.policyFile,
    });
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !current || !draft) {
    return (
      <SettingsCard title="Workspace" desc="Loading…">
        <div />
      </SettingsCard>
    );
  }

  const dirty =
       draft.name       !== current.name
    || draft.region     !== current.region
    || draft.defaultLLM !== current.defaultLLM
    || draft.policyFile !== current.policyFile;

  const onSave = () => {
    if (!draft.name.trim()) return;
    update(current.id, { ...draft, name: draft.name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const onReset = () => {
    setDraft({
      name: current.name, region: current.region,
      defaultLLM: current.defaultLLM, policyFile: current.policyFile,
    });
  };

  return (
    <SettingsCard
      title={`Workspace · ${current.name}`}
      desc={`Editing 1 of ${list.length}. Switch workspaces from the sidebar chip.`}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-mono text-muted-foreground">
            {saved ? 'Saved.' : dirty ? 'Unsaved changes.' : 'All changes saved.'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onReset}
              disabled={!dirty}
              className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!dirty || !draft.name.trim()}
              className="text-[12.5px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save changes
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Workspace name">
          <TextInput value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        </Field>
        <Field label="Region">
          <TextInput value={draft.region} onChange={e => setDraft(d => ({ ...d, region: e.target.value }))} />
        </Field>
        <Field label="Default LLM">
          <TextInput value={draft.defaultLLM} onChange={e => setDraft(d => ({ ...d, defaultLLM: e.target.value }))} />
        </Field>
        <Field label="Policy file">
          <TextInput value={draft.policyFile} onChange={e => setDraft(d => ({ ...d, policyFile: e.target.value }))} />
        </Field>
      </div>
    </SettingsCard>
  );
}
