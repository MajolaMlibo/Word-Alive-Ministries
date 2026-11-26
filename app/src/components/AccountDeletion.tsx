import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';

function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useAccessibility();
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={{ paddingVertical: 12, opacity: disabled ? 0.6 : 1 }}>
    <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
  </TouchableOpacity>;
}

export function AccountDeletion({ userId }: { userId: string }) {
  const { colors } = useAccessibility();
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirm' | 'pending' | 'failed'>('loading');
  const [busy, setBusy] = useState(false);
  const [revision, refresh] = useState(0);
  useEffect(() => {
    let current = true;
    setStatus('loading');
    void supabase.from('account_deletion_requests').select('user_id').eq('user_id', userId).maybeSingle()
      .then(({ data, error }) => { if (current) setStatus(error ? 'failed' : data ? 'pending' : 'ready'); });
    return () => { current = false; };
  }, [userId, revision]);
  async function save(withdraw: boolean) {
    setBusy(true);
    const { error } = withdraw
      ? await supabase.from('account_deletion_requests').delete().eq('user_id', userId)
      : await supabase.rpc('request_account_deletion');
    setBusy(false);
    setStatus(error ? 'failed' : withdraw ? 'ready' : 'pending');
  }
  return <View style={{ padding: 16, backgroundColor: colors.surface }}>
    {status === 'ready' && <Action label="Request account deletion" onPress={() => setStatus('confirm')} />}
    {status === 'loading' && <Text style={{ color: colors.text }}>Checking account request…</Text>}
    {status === 'failed' && <Action label="Check deletion request again" onPress={() => refresh(n => n + 1)} />}
    {status === 'confirm' && <>
      <Text style={{ color: colors.text }}>Ask the church administrator to delete your Word Alive Ministries account and associated personal data, including your profile, reading progress, private notes and prayer requests. Your account stays active until the administrator processes the request.</Text>
      <Action label="Submit deletion request" disabled={busy} onPress={() => void save(false)} />
      <Action label="Keep my account" disabled={busy} onPress={() => setStatus('ready')} />
    </>}
    {status === 'pending' && <>
      <Text style={{ color: colors.text }}>Your account deletion request is awaiting administrator review.</Text>
      <Action label="Withdraw my request" disabled={busy} onPress={() => void save(true)} />
    </>}
  </View>;
}

export function PublicDeletionHelp({ onSignIn }: { onSignIn: () => void }) {
  const { colors } = useAccessibility();
  const contact = process.env.EXPO_PUBLIC_PRIVACY_CONTACT_EMAIL;
  return <View style={{ padding: 24, gap: 12, backgroundColor: colors.surface }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 22 }}>Delete your Word Alive Ministries account</Text>
    <Text style={{ color: colors.text }}>Sign in here to request deletion of your account, profile, reading history, private notes and prayers. The church administrator reviews the request. You can withdraw it before processing.</Text>
    <Action label="Sign in to request deletion" onPress={onSignIn} />
    {contact && <Text selectable style={{ color: colors.text }}>For help accessing your account, email {contact}.</Text>}
  </View>;
}

type Request = { member_id: string; email: string; requested_at: string };
export function DeletionQueue() {
  const { colors } = useAccessibility();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Request[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [revision, refresh] = useState(0);
  const [state, setState] = useState<'loading' | 'more' | 'done' | 'failed'>('loading');
  useEffect(() => {
    if (!open) return;
    let current = true;
    setState('loading');
    void supabase.rpc('pending_account_deletions', { after_user: cursor }).then(({ data, error }) => {
      if (!current) return;
      if (error) { setState('failed'); return; }
      const page: Request[] = data || [];
      setRows(old => [...(cursor ? old : []), ...page.slice(0, 25)]);
      setState(page.length > 25 ? 'more' : 'done');
    });
    return () => { current = false; };
  }, [open, cursor, revision]);
  return <View>
    <Action label={open ? 'Close deletion requests' : 'Review account deletion requests'} onPress={() => {
      setRows([]); setCursor(null); setState('loading'); setOpen(!open);
    }} />
    {open && <>
      {rows.map(row => <Text selectable key={row.member_id} style={{ color: colors.text, marginBottom: 8 }}>
        {row.email} · {new Date(row.requested_at).toLocaleDateString()}</Text>)}
      {state === 'loading' && <Text style={{ color: colors.text }}>Loading requests…</Text>}
      {state === 'done' && rows.length === 0 && <Text style={{ color: colors.text }}>No pending deletion requests.</Text>}
      {state === 'failed' && <Action label="Retry loading requests" onPress={() => refresh(n => n + 1)} />}
      {state === 'more' && <Action label="Load more requests" onPress={() => setCursor(rows[rows.length - 1].member_id)} />}
    </>}
  </View>;
}
