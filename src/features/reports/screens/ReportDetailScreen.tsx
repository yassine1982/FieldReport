import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useReports } from '@/context/ReportsContext';
import { ReportPdfActions } from '@/features/reports/components/ReportPdfActions';
import { ReportPhotosSection } from '@/features/reports/components/ReportPhotosSection';
import { ReportSignatureSection } from '@/features/reports/components/ReportSignatureSection';
import { SignatureCaptureModal } from '@/features/reports/components/SignatureCaptureModal';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteSignatureFile } from '@/services/signature-storage';
import type { Report, ReportSignature } from '@/types/report';
import {
  computeReportContentDigest,
  displayClientName,
  formatDisplayDate,
  reconcileSignatureWithContent,
  signatureUri,
} from '@/utils/report-helpers';

type ReportDetailScreenProps = {
  reportId: string;
};

function checklistStatusLabel(status: string): string {
  switch (status) {
    case 'pass':
      return 'Pass';
    case 'fail':
      return 'Fail';
    case 'na':
      return 'N/A';
    default:
      return 'Pending';
  }
}

export function ReportDetailScreen({ reportId }: ReportDetailScreenProps) {
  const theme = useTheme();
  const { getReport, saveReport, loading } = useReports();
  const report = getReport(reportId);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  if (loading && !report) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
          <AppText variant="body" color="textSecondary">
            Loading report…
          </AppText>
        </View>
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen>
        <EmptyState
          title="Report not found"
          message="This report may have been removed or is unavailable on this device."
        />
        <Button label="Back to reports" onPress={() => router.replace('/reports')} />
      </Screen>
    );
  }

  const isDraft = report.status === 'draft';
  const contentDigest = computeReportContentDigest(report);
  const signature = reconcileSignatureWithContent(report.signature, contentDigest);
  const editHref = {
    pathname: '/report/new' as const,
    params: { id: report.id },
  };

  const persistSignatureUpdate = async (
    nextSignature: ReportSignature | undefined,
    successTitle: string,
    successMessage: string,
  ) => {
    setSavingSignature(true);
    try {
      const updated: Report = {
        ...report,
        updatedAt: new Date().toISOString(),
        signature: nextSignature
          ? reconcileSignatureWithContent(nextSignature, contentDigest)
          : undefined,
      };
      await saveReport(updated);
      Alert.alert(successTitle, successMessage);
    } catch {
      Alert.alert('Save failed', 'Could not update the signature on this report.');
    } finally {
      setSavingSignature(false);
    }
  };

  const requestSignatureSave = (signature: ReportSignature) => {
    const previousUri = signatureUri(report.signature);
    Alert.alert(
      'Save signature?',
      'This updates the existing report on this device. No duplicate report will be created.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            if (signature.uri && signature.uri !== previousUri) {
              void deleteSignatureFile(signature.uri);
            }
          },
        },
        {
          text: 'Save',
          onPress: () => {
            void persistSignatureUpdate(
              signature,
              'Signature saved',
              'The client signature is now part of this intervention report.',
            );
          },
        },
      ],
    );
  };

  const requestConfirmSignature = () => {
    if (!signature) {
      return;
    }
    Alert.alert(
      'Confirm signature?',
      'Confirm that the existing signature still applies to the updated report content.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            void persistSignatureUpdate(
              {
                ...signature,
                contentDigest,
                needsReconfirmation: false,
              },
              'Signature confirmed',
              'The signature is marked current for this report content.',
            );
          },
        },
      ],
    );
  };

  const requestClearSignature = () => {
    Alert.alert('Remove signature?', 'The signature will be removed from this saved report.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void persistSignatureUpdate(
            undefined,
            'Signature removed',
            'This report is no longer marked as signed.',
          );
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <StatusBadge status={report.status} />
        <AppText variant="brand">{displayClientName(report.clientName)}</AppText>
        <AppText variant="body" color="textSecondary">
          {report.equipmentName.trim() || 'No equipment listed'}
        </AppText>
        <AppText variant="caption" color="textMuted">
          Intervention {formatDisplayDate(report.interventionDate)}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          label={isDraft ? 'Resume draft' : 'Edit report'}
          onPress={() => router.push(editHref)}
        />
        <ReportPdfActions report={report} />
        <Button label="Back to reports" variant="secondary" onPress={() => router.back()} />
      </View>

      {report.clientContact ? (
        <Card style={styles.section}>
          <AppText variant="label" color="textMuted">
            CONTACT
          </AppText>
          <AppText variant="body">{report.clientContact}</AppText>
        </Card>
      ) : null}

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          PROBLEM
        </AppText>
        <AppText variant="body">
          {report.problemDescription.trim() || (isDraft ? 'Not filled in yet' : '—')}
        </AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          CHECKLIST
        </AppText>
        {report.checklist.map((item) => (
          <View key={item.id} style={styles.checklistRow}>
            <AppText variant="body" style={styles.checklistLabel}>
              {item.label}
            </AppText>
            <AppText
              variant="label"
              color={
                item.status === 'pass'
                  ? 'success'
                  : item.status === 'fail'
                    ? 'danger'
                    : 'textMuted'
              }>
              {checklistStatusLabel(item.status)}
            </AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          OBSERVATIONS
        </AppText>
        <AppText variant="body">
          {report.observations.trim() || (isDraft ? 'Not filled in yet' : '—')}
        </AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          IDENTIFIED ISSUES
        </AppText>
        {report.identifiedIssues.length === 0 ? (
          <AppText variant="body" color="textMuted">
            None listed
          </AppText>
        ) : (
          report.identifiedIssues.map((issue, index) => (
            <AppText key={`${issue}-${index}`} variant="body">
              • {issue}
            </AppText>
          ))
        )}
      </Card>

      <ReportPhotosSection photos={report.photos ?? []} />

      <ReportSignatureSection
        signature={signature}
        busy={savingSignature}
        onCapture={() => setCaptureOpen(true)}
        onConfirmCurrent={requestConfirmSignature}
        onClear={requestClearSignature}
      />

      <AppText variant="caption" color="textMuted">
        Created {formatDisplayDate(report.createdAt.slice(0, 10))} · Updated{' '}
        {formatDisplayDate(report.updatedAt.slice(0, 10))}
      </AppText>

      <SignatureCaptureModal
        visible={captureOpen}
        contentDigest={contentDigest}
        initialSignerName={signature?.signerName ?? report.clientName}
        onCancel={() => setCaptureOpen(false)}
        onConfirm={(signature) => {
          setCaptureOpen(false);
          requestSignatureSave(signature);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.eight,
  },
  header: {
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  checklistLabel: {
    flex: 1,
  },
});
