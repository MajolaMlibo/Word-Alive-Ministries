import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdminSearchBar from './AdminSearchBar';
import { PrayerReply, PrayerRequestStatus, prayerStatusLabel } from '../services/database';
import { supabase } from '../services/supabase';

type InboxRow = { id: string; member_name: string; user_id: string; description: string; created_at: string };
type Props = { styles: any };
const pageSize = 25;

function Button({ label, press, disabled, styles }: Props & { label: string; press: () => void; disabled?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={press} style={styles.outlineButton}>
    <Text style={styles.outlineButtonText}>{label}</Text>
  </TouchableOpacity>;
}

function Conversation({ row, bucket, changed, styles }: Props & { row: InboxRow; bucket: PrayerRequestStatus; changed: () => void }) {
  const [replies, setReplies] = useState<PrayerReply[]>([]);
  const attempt = useRef<{ message: string; previous: string | null } | null>(null);
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, refresh] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    setFailed(false);
    void supabase.from('prayer_replies').select('id,author_name,created_at,body').eq('request_id', row.id)
      .order('created_at').order('id').then(({ data, error }) => {
        if (!active) return;
        setFailed(Boolean(error));
        setReplies(data ?? []);
        setReady(!error);
      });
    return () => { active = false; };
  }, [row.id, revision]);

  async function send() {
    if (!ready || busy || !draft.trim()) return;
    setBusy(true);
    const message = draft.trim();
    if (attempt.current?.message !== message) {
      attempt.current = { message, previous: replies[replies.length - 1]?.id ?? null };
    }
    const { error } = await supabase.rpc('send_prayer_reply', {
      target: row.id, message, previous_reply: attempt.current.previous,
    });
    setBusy(false);
    if (error) {
      if (error.code === 'P0001') attempt.current = null;
      setReady(false);
      refresh(value => value + 1);
      Alert.alert('Reply could not be confirmed', 'Your text is still here. Check the conversation before sending again.');
      return;
    }
    setDraft('');
    changed();
    Alert.alert('Reply sent', 'The member can read it under My requests.');
  }
  async function close() {
    setBusy(true);
    const { error } = await supabase.rpc('close_prayer_request', { target: row.id });
    setBusy(false);
    if (error) { Alert.alert('Unable to close request', 'Refresh and try again.'); return; }
    changed();
  }
  async function remove() {
    setBusy(true);
    const { data,error } = await supabase.from('prayer_requests').delete().eq('id',row.id).select('id').single();
    setBusy(false);
    if (error || !data) { Alert.alert('Unable to delete request'); return; }
    changed();
  }
  return <View style={styles.itemCard}>
    {replies.map(reply => <View key={reply.id} style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{reply.author_name} · {new Date(reply.created_at).toLocaleDateString()}</Text>
      <Text style={styles.itemDescription}>{reply.body}</Text>
    </View>)}
    {failed && <Button styles={styles} label="Retry loading replies" press={() => refresh(v => v + 1)} />}
    {!ready && !failed && <ActivityIndicator />}
    {bucket !== 'closed' && <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>Private reply to member</Text>
      <TextInput accessibilityLabel="Private reply to member" multiline maxLength={4000} editable={!busy}
        textAlignVertical="top" style={[styles.field, styles.textArea]} value={draft} onChangeText={setDraft} />
      <Button styles={styles} disabled={busy || !ready || !draft.trim()} label={busy ? 'Please wait…' : 'Send reply'} press={send} />
    </View>}
    {bucket === 'reviewed' && <Button styles={styles} disabled={busy} label="Close request" press={() =>
      Alert.alert('Close this request?', 'The member will still see the replies.', [{text:'Cancel'}, {text:'Close request',onPress:close}])} />}
    <Button styles={styles} disabled={busy} label="Delete request" press={() =>
      Alert.alert('Delete this request and its replies?', 'This is permanent.', [{text:'Cancel'}, {text:'Delete',style:'destructive',onPress:remove}])} />
  </View>;
}

export default function PrayerInbox({ styles }: Props) {
  const [bucket, setBucket] = useState<PrayerRequestStatus>('pending');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [cursor, setCursor] = useState<InboxRow | null>(null);
  const [more, setMore] = useState(false);
  const [selected, select] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, refresh] = useState(0);
  function restart() {
    select(null); setRows([]); setCursor(null); setMore(false); setBusy(true); refresh(v => v + 1);
  }
  useEffect(() => {
    let active = true;
    setBusy(true); setFailed(false);
    void supabase.rpc('prayer_inbox', { bucket, search_name: search, before_time: cursor?.created_at ?? null, before_id: cursor?.id ?? null })
      .then(({ data, error }) => {
        if (!active) return;
        setBusy(false); setFailed(Boolean(error));
        if (error) return;
        const batch: InboxRow[] = data ?? [];
        setMore(batch.length > pageSize);
        setRows(previous => (cursor ? previous : []).concat(batch.slice(0,pageSize)));
      });
    return () => { active = false; };
  }, [bucket, search, cursor, revision]);

  const groups = new Map<string, InboxRow[]>();
  for (const row of rows) {
    const group = groups.get(row.user_id);
    if (group) group.push(row);
    else groups.set(row.user_id,[row]);
  }
  const searchMembers = () => { setSearch(input.trim()); restart(); };
  return <View>

      <Text style={styles.listTitle}>Private prayer inbox</Text>
      <AdminSearchBar placeholder="Search by member name" value={input} appliedSearch={search}
        filterActive={bucket !== 'pending'} onChange={setInput} onSearch={searchMembers}
        onClearSearch={() => { setInput(''); setSearch(''); restart(); }}
        onClearFilters={() => { setBucket('pending'); restart(); }} />
      <View style={styles.statusPicker}>
        {(Object.keys(prayerStatusLabel) as PrayerRequestStatus[]).map(key => <TouchableOpacity
          key={key} accessibilityRole="button" accessibilityState={{selected:key === bucket}}
          onPress={() => {setBucket(key); restart();}} style={[styles.statusOption,key === bucket && styles.statusOptionActive]}>
          <Text style={[styles.statusOptionText,key === bucket && styles.statusOptionTextActive]}>{prayerStatusLabel[key]}</Text>
        </TouchableOpacity>)}
      </View>
      {Array.from(groups, ([id, group]) => <View key={id} style={styles.itemCard}>
        <Text style={styles.itemTitle}>{group[0].member_name}</Text>
        {group.map(row => <View key={row.id}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:selected === row.id}}
            onPress={() => select(selected === row.id ? null : row.id)} style={styles.fieldWrap}>
            <Text style={styles.itemMeta}>{new Date(row.created_at).toLocaleDateString()}</Text>
            <Text numberOfLines={selected === row.id ? undefined : 2} style={styles.itemDescription}>{row.description}</Text>
          </TouchableOpacity>
          {selected === row.id && <Conversation styles={styles} row={row} bucket={bucket} changed={restart} />}
        </View>)}
      </View>)}
      {busy && <ActivityIndicator />}
      {failed && <Button styles={styles} label="Retry loading requests" press={() => refresh(v => v + 1)} />}
      {!busy && !failed && !rows.length && <Text style={styles.panelHint}>No matching requests.</Text>}
      {!busy && !failed && more && <Button styles={styles} label="Load more" press={() => setCursor(rows[rows.length-1])} />}
  </View>;
}
