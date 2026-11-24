import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import AdminSearchBar from './AdminSearchBar';
import { AppRole } from '../services/database';
import { supabase } from '../services/supabase';

type Member = { member_id: string; display_name: string; email: string; member_role: AppRole; prayer_access: boolean; directory_access: boolean };
const assignable: AppRole[] = ['member', 'admin', 'pastor'];
const filters = ['all', ...assignable, 'editor'] as const;
type Filter = typeof filters[number];
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const permissions = (role: AppRole, care: boolean, directory: boolean) => {
  if (role === 'pastor') return 'View the member directory, manage ministry content and read and reply to private prayers.';
  if (role === 'admin') return 'Manage ministry content.' + (directory ? ' Can view members.' : ' No directory access.') + (care ? ' Can read and reply to private prayers.' : ' No staff prayer access.');
  if (role === 'editor') return 'Legacy editor permissions.';
  return 'Use member features and view their own prayer requests.';
};

export default function MembersManager({ canEdit, styles, ownerId, onSelfChange, registerMemberBack }: { canEdit: boolean; styles: any; ownerId: string; onSelfChange: () => void; registerMemberBack: (action: (() => void) | null) => void }) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [total, setTotal] = useState<number | null>(null);
  const [rows, setRows] = useState<Member[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, refresh] = useState(0);
  const [selected, select] = useState<Member | null>(null);
  const [role, setRole] = useState<AppRole>('member');
  const [directory, setDirectory] = useState(false);
  const [care, setCare] = useState(false);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    if (!selected) return;
    registerMemberBack(() => { if (!saving) select(null); });
    return () => registerMemberBack(null);
  }, [selected, saving, registerMemberBack]);

  function restart() {
    select(null);
    setRows([]);
    setMore(false);
    setCursor(null);
    setLoading(true);
    refresh(n => n + 1);
  }
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void supabase.rpc(canEdit ? 'member_directory' : 'member_directory_names', { search_term: search, filter_role: filter === 'all' ? null : filter, after_id: cursor })
      .then(({ data, error: failure }) => {
        if (!active) return;
        setLoading(false);
        setError(Boolean(failure));
        if (failure) return;
        const page: Member[] = data ?? [];
        setMore(page.length > 25);
        setRows(old => (cursor ? old : []).concat(page.slice(0, 25)));
      });
    return () => { active = false; };
  }, [search, filter, cursor, revision, canEdit]);

  useEffect(() => {
    let active = true;
    void supabase.rpc('registered_member_count').then(({ data, error }) => {
      if (active) setTotal(error ? null : Number(data));
    });
    return () => { active = false; };
  }, [revision, canEdit]);

  const [progress, setProgress] = useState('Loading reading total…');
  useEffect(() => {
    if (!selected) return;
    let active = true;
    void supabase.rpc('member_reading_count', { target_member: selected.member_id }).then(({ data, error }) => {
      if (active) setProgress(error ? 'Reading total unavailable' : 'Completed readings: ' + data);
    });
    return () => { active = false; };
  }, [selected]);

  function open(member: Member) {
    setProgress('Loading reading total…');
    select(member);
    setRole(member.member_role);
    setCare(member.prayer_access);
    setDirectory(member.directory_access);
  }
  async function save(member: Member) {
    setSaving(true);
    const { error: failure } = await supabase.rpc('save_member_access', {
      target: member.member_id, expected_role: member.member_role, expected_prayer: member.prayer_access,
      expected_directory: member.directory_access, wanted_directory: directory,
      wanted_role: role, wanted_prayer: care,
    });
    setSaving(false);
    if (failure) {
      Alert.alert('Access change could not be confirmed', 'Reload this member and check their current access.',
        [{ text: 'Reload members', onPress: restart }]);
      return;
    }
    restart();
    if (member.member_id === ownerId) onSelfChange();
    Alert.alert('Member access saved');
  }
  function button(text: string, press: () => void, disabled = false) {
    return <TouchableOpacity accessibilityRole="button" disabled={disabled} style={styles.outlineButton} onPress={press}>
      <Text style={styles.outlineButtonText}>{text}</Text>
    </TouchableOpacity>;
  }
  function choice(text: string, chosen: boolean, press: () => void, disabled = false) {
    return <TouchableOpacity key={text} accessibilityRole="button" accessibilityState={{ selected: chosen, disabled }}
      onPress={press} disabled={disabled} style={[styles.statusOption, chosen && styles.statusOptionActive]}>
      <Text style={[styles.statusOptionText, chosen && styles.statusOptionTextActive]}>{label(text)}</Text>
    </TouchableOpacity>;
  }
  if (selected && !canEdit) return <View style={styles.itemCard}>
    <Text style={styles.listTitle}>{selected.display_name}</Text>
    <Text style={styles.itemMeta}>{progress}</Text>
  </View>;
  if (selected && canEdit) {
    const self = selected.member_id === ownerId;
    return <View style={styles.itemCard}>
      <Text style={styles.listTitle}>{selected.display_name}</Text>
      <Text style={styles.itemMeta}>{selected.email}</Text>
      <Text style={styles.itemMeta}>{progress}</Text>
      <Text style={styles.fieldLabel}>Role</Text>
      <View style={styles.statusPicker}>{assignable.map(next => choice(next, next === role, () => {
        setRole(next);
        setDirectory(self || next === 'pastor' || (next === 'admin' && selected.member_role === 'admin' && selected.directory_access));
        setCare(next === 'pastor' || (next === 'admin' && selected.member_role === 'admin' && selected.prayer_access));
      }, saving || (self && next !== 'admin')))}</View>
      {role === 'admin' && !self && <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Can view member directory</Text>
        <Switch accessibilityLabel="Can view member directory" value={directory} onValueChange={setDirectory} disabled={saving} />
      </View>}
      {role === 'admin' && <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Can read and reply to private prayers</Text>
        <Switch accessibilityLabel="Can read and reply to private prayers" value={care} onValueChange={setCare} disabled={saving} />
      </View>}
      <Text style={styles.panelHint}>{permissions(role, care, directory)}</Text>
      {button(saving ? 'Saving…' : 'Save changes', () => Alert.alert('Change member access?', [
        selected.display_name, selected.email,
        'Current: ' + label(selected.member_role) + '. ' + permissions(selected.member_role, selected.prayer_access, selected.directory_access),
        'After saving: ' + label(role) + '. ' + permissions(role, care, directory),
      ].join('\n'), [{ text: 'Cancel', style: 'cancel' }, { text: 'Save changes', onPress: () => void save(selected) }]),
      saving || (role === selected.member_role && care === selected.prayer_access && directory === selected.directory_access))}
    </View>;
  }
  const submit = () => { setSearch(input.trim()); restart(); };
  return <View>
    <Text style={styles.listTitle}>Members{total !== null ? ` (${total})` : ''}</Text>
    <AdminSearchBar placeholder={canEdit ? 'Search by name or email' : 'Search by name'} value={input} appliedSearch={search}
      filterActive={filter !== 'all'} onChange={setInput} onSearch={submit}
      onClearSearch={() => { setInput(''); setSearch(''); restart(); }}
      onClearFilters={() => { setFilter('all'); restart(); }} />
    <View style={styles.statusPicker}>{filters.map(item => choice(item, item === filter, () => { setFilter(item); restart(); }))}</View>
    {rows.map(member => <TouchableOpacity accessibilityRole="button" key={member.member_id} onPress={() => open(member)} style={styles.itemCard}>
      <Text style={styles.itemTitle}>{member.display_name}</Text>
      <Text style={styles.itemMeta}>{label(member.member_role)}</Text>
    </TouchableOpacity>)}
    {loading && <ActivityIndicator />}
    {error && button('Retry loading members', () => refresh(n => n + 1))}
    {!loading && !error && !rows.length && <Text style={styles.panelHint}>No matching members.</Text>}
    {!loading && !error && more && button('Load more', () => setCursor(rows[rows.length - 1].member_id))}
  </View>;
}
