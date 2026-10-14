import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Radii, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChecklistItem, ChecklistItemStatus } from '@/types/report';

type ChecklistStepProps = {
  checklist: ChecklistItem[];
  error?: string;
  onChangeStatus: (id: string, status: Exclude<ChecklistItemStatus, 'pending'>) => void;
};

const OPTIONS: { status: Exclude<ChecklistItemStatus, 'pending'>; label: string }[] = [
  { status: 'pass', label: 'Pass' },
  { status: 'fail', label: 'Fail' },
  { status: 'na', label: 'N/A' },
];

export function ChecklistStep({ checklist, error, onChangeStatus }: ChecklistStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
      {checklist.map((item) => (
        <Card key={item.id} style={styles.item}>
          <AppText variant="bodyMedium">{item.label}</AppText>
          <View style={styles.options}>
            {OPTIONS.map((option) => {
              const selected = item.status === option.status;
              const selectedColor =
                option.status === 'pass'
                  ? theme.success
                  : option.status === 'fail'
                    ? theme.danger
                    : theme.textSecondary;
              return (
                <Pressable
                  key={option.status}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item.label}: ${option.label}`}
                  onPress={() => onChangeStatus(item.id, option.status)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: selected ? selectedColor : theme.border,
                      backgroundColor: selected ? `${selectedColor}22` : theme.surface,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}>
                  <AppText
                    variant="label"
                    style={{ color: selected ? selectedColor : theme.textSecondary }}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  item: {
    gap: Spacing.three,
  },
  options: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  option: {
    flex: 1,
    minHeight: TouchTarget.min,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
