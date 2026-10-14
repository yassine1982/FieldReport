import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Spacing } from '@/constants/theme';

type WizardFooterProps = {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  loading?: boolean;
  disableNext?: boolean;
};

export function WizardFooter({
  onBack,
  onNext,
  nextLabel = 'Continue',
  backLabel = 'Back',
  loading = false,
  disableNext = false,
}: WizardFooterProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Button label={backLabel} variant="secondary" onPress={onBack} style={styles.half} />
      ) : null}
      <Button
        label={nextLabel}
        onPress={onNext}
        loading={loading}
        disabled={disableNext}
        style={onBack ? styles.half : styles.full}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  half: {
    flex: 1,
  },
  full: {
    flex: 1,
  },
});
