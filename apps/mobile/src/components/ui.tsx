import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  bg: '#eef3f7',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  accent: '#0f766e',
  accentSoft: '#ccfbf1',
  warn: '#b45309',
  warnSoft: '#ffedd5',
  danger: '#b91c1c',
  dangerSoft: '#fee2e2',
  ok: '#15803d',
  okSoft: '#dcfce7',
  ink: '#0b1220',
};

type Tone = 'accent' | 'warn' | 'ok' | 'danger' | 'muted';

const toneBg: Record<Tone, string> = {
  accent: colors.accentSoft,
  warn: colors.warnSoft,
  ok: colors.okSoft,
  danger: colors.dangerSoft,
  muted: colors.line,
};

const toneFg: Record<Tone, string> = {
  accent: colors.accent,
  warn: colors.warn,
  ok: colors.ok,
  danger: colors.danger,
  muted: colors.muted,
};

export function statusTone(status: string): Tone {
  if (status === 'arriving') return 'warn';
  if (status === 'arrived') return 'ok';
  return 'muted';
}

export function fenceColor(status: string): string {
  if (status === 'arriving') return colors.warn;
  if (status === 'arrived') return colors.ok;
  return colors.accent;
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  testID,
  disabled,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled ? styles.disabled : null]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={styles.card}>
      {children}
    </View>
  );
}

export function Chip({ label, tone = 'accent' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.chip, { backgroundColor: toneBg[tone] }]}>
      <Text style={[styles.chipText, { color: toneFg[tone] }]}>{label}</Text>
    </View>
  );
}

export function Badge({ label, tone = 'muted' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: toneBg[tone] }]}>
      <Text style={[styles.badgeText, { color: toneFg[tone] }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` as const;
  return (
    <View style={styles.track} accessibilityRole="progressbar">
      <View style={[styles.fill, { width }]} />
    </View>
  );
}

export const layout = StyleSheet.create({
  scroll: { padding: 16, gap: 12, backgroundColor: colors.bg, paddingBottom: 32 },
  map: {
    height: 360,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#dbe4ee',
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  field: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  error: { color: colors.danger, fontWeight: '600' },
  warn: { color: colors.warn, fontWeight: '700' },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  note: { color: colors.muted, fontSize: 13 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabled: { opacity: 0.45 },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  chip: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontWeight: '800', fontSize: 13 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  track: { height: 8, borderRadius: 99, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 99, backgroundColor: colors.accent },
});
