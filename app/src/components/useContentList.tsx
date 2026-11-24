import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import AdminSearchBar from './AdminSearchBar';

export function useContentList<T extends { id: string }>(fetchPage: (offset: number, search: string) => Promise<{ items: T[]; error: unknown }>) {
  const [items, setItems] = useState<T[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void fetchPage(offset, search).then(({ items: page, error }) => {
      if (!active) return;
      if (error) { setFailed(true); return; }
      setItems(old => {
        const merged = new Map((offset ? old : []).map(item => [item.id, item]));
        for (const item of page.slice(0, 25)) merged.set(item.id, item);
        return Array.from(merged.values());
      });
      setMore(page.length > 25);
    }).catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchPage, offset, search, revision]);
  function reload() {
    setOffset(0);
    setRevision(n => n + 1);
  }
  return { items, loading, reload,
    searchControl: (placeholder: string) => <AdminSearchBar value={input} appliedSearch={search} placeholder={placeholder}
      filterActive={false} onChange={setInput} onSearch={() => { setSearch(input.trim()); reload(); }}
      onClearSearch={() => { setInput(''); setSearch(''); reload(); }} onClearFilters={reload} />,
    pageControl: (styles: any) => !loading && (more || failed) && <TouchableOpacity accessibilityRole="button"
      style={styles.outlineButton} onPress={() => failed ? setRevision(n => n + 1) : setOffset(n => n + 25)}>
      <Text style={styles.outlineButtonText}>{failed ? 'Retry loading list' : 'Load more'}</Text></TouchableOpacity>,
  };
}
