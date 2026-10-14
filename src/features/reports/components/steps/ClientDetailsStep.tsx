import { StyleSheet, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Spacing } from '@/constants/theme';
import type { Step1Errors } from '@/features/reports/utils/validation';
import type { NewReportDraft } from '@/types/report';

type ClientDetailsStepProps = {
  draft: NewReportDraft;
  errors: Step1Errors;
  onChange: <K extends keyof NewReportDraft>(key: K, value: NewReportDraft[K]) => void;
};

export function ClientDetailsStep({ draft, errors, onChange }: ClientDetailsStepProps) {
  return (
    <View style={styles.form}>
      <Input
        label="Client name"
        value={draft.clientName}
        onChangeText={(value) => onChange('clientName', value)}
        placeholder="Acme Industrial HVAC"
        autoCapitalize="words"
        returnKeyType="next"
        error={errors.clientName}
      />
      <Input
        label="Client contact (optional)"
        value={draft.clientContact}
        onChangeText={(value) => onChange('clientContact', value)}
        placeholder="Name, phone, or email"
        autoCapitalize="sentences"
        returnKeyType="next"
      />
      <Input
        label="Equipment name or ID"
        value={draft.equipmentName}
        onChangeText={(value) => onChange('equipmentName', value)}
        placeholder="RTU-12 / Chiller CH-04"
        autoCapitalize="characters"
        returnKeyType="next"
        error={errors.equipmentName}
      />
      <Input
        label="Intervention date"
        value={draft.interventionDate}
        onChangeText={(value) => onChange('interventionDate', value)}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        returnKeyType="next"
        error={errors.interventionDate}
      />
      <Input
        label="Problem description"
        value={draft.problemDescription}
        onChangeText={(value) => onChange('problemDescription', value)}
        placeholder="What issue was reported or observed?"
        multiline
        textAlignVertical="top"
        style={styles.multiline}
        error={errors.problemDescription}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.four,
  },
  multiline: {
    minHeight: 120,
    paddingTop: Spacing.three,
  },
});
