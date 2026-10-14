import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StepHeaderProps = {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
};

export function StepHeader({ step, totalSteps, title, subtitle }: StepHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <AppText variant="overline" color="primary">
        Step {step} of {totalSteps}
      </AppText>
      <AppText variant="title">{title}</AppText>
      <AppText variant="body" color="textSecondary">
        {subtitle}
      </AppText>
      <View style={styles.progressTrack}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const active = index < step;
          return (
            <View
              key={index}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: active ? theme.primary : theme.border,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: Radii.full,
  },
});
