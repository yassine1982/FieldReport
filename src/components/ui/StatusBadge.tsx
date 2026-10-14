import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReportStatus } from '@/types/report';

const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: 'Draft',
  completed: 'Completed',
};

type StatusBadgeProps = {
  status: ReportStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const theme = useTheme();
  const color = status === 'completed' ? theme.success : theme.warning;
  const backgroundColor = status === 'completed' ? theme.successLight : theme.warningLight;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <AppText variant="label" style={{ color }}>
        {STATUS_LABEL[status]}
      </AppText>
    </View>
  );
}

export { STATUS_LABEL };

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
