'use client';

import { useAuth } from '../../../../auth/AuthProvider';
import { Field, SettingsCard, TextInput } from '../Fields';

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  return (
    <SettingsCard
      title="Your profile"
      desc="How you appear across the vault."
      footer={
        <div className="flex justify-end gap-2">
          <button className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted">Cancel</button>
          <button className="text-[12.5px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium">Save changes</button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full name"><TextInput defaultValue={user?.name || ''} /></Field>
        <Field label="Email"    ><TextInput type="email" defaultValue={user?.email || ''} readOnly /></Field>
        <Field label="Role"     ><TextInput defaultValue="Platform engineer" /></Field>
        <Field label="Time zone"><TextInput defaultValue="Asia/Singapore" /></Field>
      </div>
    </SettingsCard>
  );
}
