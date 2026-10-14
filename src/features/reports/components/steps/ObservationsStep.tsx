import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Step3Errors } from '@/features/reports/utils/validation';
import type { NewReportDraft } from '@/types/report';

type ObservationsStepProps = {
  draft: NewReportDraft;
  errors: Step3Errors;
  onChangeObservations: (value: string) => void;
  onChangeIssue: (index: number, value: string) => void;
  onAddIssue: () => void;
  onRemoveIssue: (index: number) => void;
};

export function ObservationsStep({
  draft,
  errors,
  onChangeObservations,
  onChangeIssue,
  onAddIssue,
  onRemoveIssue,
}: ObservationsStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.form}>
      <Input
        label="Technician observations"
        value={draft.observations}
        onChangeText={onChangeObservations}
        placeholder="Summarize findings, actions taken, and recommendations."
        multiline
        textAlignVertical="top"
        style={styles.multiline}
        error={errors.observations}
      />

      <View style={styles.issuesHeader}>
        <AppText variant="subtitle">Identified issues</AppText>
        <AppText variant="caption" color="textSecondary">
          Optional — add each issue on its own row.
        </AppText>
      </View>

      {errors.identifiedIssues ? (
        <AppText variant="caption" color="danger">
          {errors.identifiedIssues}
        </AppText>
      ) : null}

      {draft.identifiedIssues.length === 0 ? (
        <AppText variant="body" color="textMuted">
          No issues added yet.
        </AppText>
      ) : (
        <View style={styles.issues}>
          {draft.identifiedIssues.map((issue, index) => (
            <View key={`issue-${index}`} style={styles.issueRow}>
              <View style={styles.issueInput}>
                <Input
                  label={`Issue ${index + 1}`}
                  value={issue}
                  onChangeText={(value) => onChangeIssue(index, value)}
                  placeholder="Describe the issue"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove issue ${index + 1}`}
                onPress={() => onRemoveIssue(index)}
                style={({ pressed }) => [
                  styles.remove,
                  { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}>
                <AppText variant="label" color="danger">
                  Remove
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Button label="Add issue" variant="secondary" onPress={onAddIssue} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.four,
  },
  multiline: {
    minHeight: 140,
    paddingTop: Spacing.three,
  },
  issuesHeader: {
    gap: Spacing.one,
  },
  issues: {
    gap: Spacing.three,
  },
  issueRow: {
    gap: Spacing.two,
  },
  issueInput: {
    flex: 1,
  },
  remove: {
    alignSelf: 'flex-start',
    minHeight: TouchTarget.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
