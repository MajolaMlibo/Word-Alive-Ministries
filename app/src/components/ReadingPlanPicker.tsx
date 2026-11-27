import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReadingPlan } from '../services/database';
import {
  getMyReadingPlanMemberships,
  getPublishedReadingPlans,
  joinReadingPlan,
  leaveReadingPlan,
} from '../services/dailyReadingService';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';

type Props = {
  onMembershipChanged?: () => void | Promise<void>;
};

export default function ReadingPlanPicker({ onMembershipChanged }: Props) {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [activePlanIds, setActivePlanIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [plansResult, membershipsResult] = await Promise.all([
      getPublishedReadingPlans(appliedSearch),
      getMyReadingPlanMemberships(),
    ]);
    setLoading(false);

    if (plansResult.error) {
      console.warn('Unable to load Bible plans.', plansResult.error.message);
      setPlans([]);
      setError('Bible plans could not be loaded. Please try again.');
      return;
    }

    setPlans(plansResult.plans);
    if (membershipsResult.error) {
      console.warn('Unable to load Bible-plan membership.', membershipsResult.error.message);
      setActivePlanIds(new Set());
      setError('Sign in to join an optional Bible plan.');
      return;
    }
    setActivePlanIds(new Set(membershipsResult.memberships.map((membership) => membership.plan_id)));
  }, [appliedSearch]);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  const updateMembership = async (plan: ReadingPlan, shouldJoin: boolean) => {
    setActionPlanId(plan.id);
    setError(null);
    const result = shouldJoin ? await joinReadingPlan(plan.id) : await leaveReadingPlan(plan.id);
    setActionPlanId(null);
    if (result.error) {
      console.warn('Unable to update Bible-plan membership.', result.error.message);
      setError('Your plan selection could not be saved. Please try again.');
      return;
    }
    setActivePlanIds((current) => {
      const next = new Set(current);
      if (shouldJoin) next.add(plan.id); else next.delete(plan.id);
      return next;
    });
    await onMembershipChanged?.();
  };

  const planCountLabel = useMemo(() => {
    if (!appliedSearch) return 'Published plans';
    return `Search results for “${appliedSearch}”`;
  }, [appliedSearch]);

  return <View style={styles.card}>
    <View style={styles.headingRow}>
      <View style={styles.headingIcon}><Ionicons color="#FFFFFF" name="book-outline" size={20} /></View>
      <View style={styles.headingText}>
        <Text style={styles.title}>Bible plans</Text>
        <Text style={styles.hint}>Required plans are included for everyone. Join optional plans to add them to your calendar and Today tab.</Text>
      </View>
    </View>

    <View style={styles.searchRow}>
      <TextInput
        accessibilityLabel="Search Bible plans"
        autoCapitalize="words"
        onChangeText={setSearchInput}
        onSubmitEditing={() => setAppliedSearch(searchInput.trim())}
        placeholder="Search plan name"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        style={styles.searchInput}
        value={searchInput}
      />
      <TouchableOpacity accessibilityLabel="Search Bible plans" accessibilityRole="button" onPress={() => setAppliedSearch(searchInput.trim())} style={styles.searchButton}>
        <Ionicons color="#FFFFFF" name="search" size={20} />
      </TouchableOpacity>
    </View>

    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : (
      <>
        <Text style={styles.resultLabel}>{planCountLabel}{plans.length === 50 ? ' · showing the first 50; refine your search.' : ''}</Text>
        {plans.length ? plans.map((plan) => {
          const required = plan.enrollment_mode === 'required';
          const joined = activePlanIds.has(plan.id);
          const busy = actionPlanId === plan.id;
          return <View key={plan.id} style={styles.planCard}>
            <View style={styles.planHeading}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={[styles.badge, required ? styles.requiredBadge : styles.optionalBadge]}>{required ? 'Required' : 'Optional'}</Text>
            </View>
            <Text style={styles.planYear}>{plan.plan_year} plan</Text>
            {plan.description ? <Text numberOfLines={3} style={styles.description}>{plan.description}</Text> : null}
            {required ? <Text style={styles.included}>Included for every member</Text> : (
              <TouchableOpacity
                accessibilityLabel={`${joined ? 'Leave' : 'Join'} ${plan.name}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => {
                  if (joined) {
                    Alert.alert('Leave this plan?', 'Its readings will no longer appear in your calendar or Today tab. Your existing completion history is kept.', [
                      { text: 'Keep plan', style: 'cancel' },
                      { text: 'Leave plan', style: 'destructive', onPress: () => void updateMembership(plan, false) },
                    ]);
                  } else {
                    void updateMembership(plan, true);
                  }
                }}
                style={[styles.membershipButton, joined ? styles.leaveButton : styles.joinButton, busy && styles.disabledButton]}
              >
                <Text style={[styles.membershipButtonText, joined ? styles.leaveButtonText : styles.joinButtonText]}>{busy ? 'Saving…' : joined ? 'Leave plan' : 'Join plan'}</Text>
              </TouchableOpacity>
            )}
          </View>;
        }) : <Text style={styles.empty}>No published Bible plans match this search.</Text>}
      </>
    )}
  </View>;
}

function makeStyles(colors: any, fonts: any) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: 20, marginBottom: spacing.lg, padding: spacing.md },
    headingRow: { flexDirection: 'row' },
    headingIcon: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, height: 36, justifyContent: 'center', marginRight: spacing.sm, width: 36 },
    headingText: { flex: 1 },
    title: { color: colors.text, fontSize: fonts.subtitle, fontWeight: '800' },
    hint: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.45, marginTop: 2 },
    searchRow: { flexDirection: 'row', marginTop: spacing.md },
    searchInput: { backgroundColor: colors.background, borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, color: colors.text, flex: 1, fontSize: fonts.body, minHeight: 46, paddingHorizontal: spacing.sm },
    searchButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', marginLeft: spacing.xs, width: 48 },
    error: { color: colors.danger, fontSize: fonts.caption, lineHeight: fonts.caption * 1.4, marginTop: spacing.sm },
    loading: { marginTop: spacing.md },
    resultLabel: { color: colors.textMuted, fontSize: fonts.caption, fontWeight: '700', marginTop: spacing.md },
    planCard: { backgroundColor: colors.background, borderColor: colors.borderSoft, borderRadius: 14, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm },
    planHeading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
    planName: { color: colors.text, flex: 1, fontSize: fonts.body, fontWeight: '800', paddingRight: spacing.sm },
    badge: { borderRadius: 8, fontSize: fonts.caption, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
    requiredBadge: { backgroundColor: colors.accentSoft, color: colors.primary },
    optionalBadge: { backgroundColor: colors.borderSoft, color: colors.textMuted },
    planYear: { color: colors.textMuted, fontSize: fonts.caption, marginTop: 2 },
    description: { color: colors.text, fontSize: fonts.caption, lineHeight: fonts.caption * 1.45, marginTop: spacing.xs },
    included: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700', marginTop: spacing.sm },
    membershipButton: { alignItems: 'center', borderRadius: 10, marginTop: spacing.sm, minHeight: 40, justifyContent: 'center' },
    joinButton: { backgroundColor: colors.primary },
    leaveButton: { borderColor: colors.danger, borderWidth: 1 },
    disabledButton: { opacity: 0.6 },
    membershipButtonText: { fontSize: fonts.caption, fontWeight: '800' },
    joinButtonText: { color: '#FFFFFF' },
    leaveButtonText: { color: colors.danger },
    empty: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.45, marginTop: spacing.sm },
  });
}
