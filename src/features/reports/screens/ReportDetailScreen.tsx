import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CircleButton } from '@/components/ui/CircleButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useReports } from '@/context/ReportsContext';
import { ReportPdfActions } from '@/features/reports/components/ReportPdfActions';
import { ReportPhotosSection } from '@/features/reports/components/ReportPhotosSection';
import { ReportSignatureSection } from '@/features/reports/components/ReportSignatureSection';
import { SignatureCaptureModal } from '@/features/reports/components/SignatureCaptureModal';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteSignatureFile, signatureUriToDiscard } from '@/services/signature-storage';
import type { ChecklistItemStatus, Report, ReportSignature } from '@/types/report';
import {
  computeReportContentDigest,
  displayClientName,
  formatCalendarDate,
  formatDisplayDate,
  reconcileSignatureWithContent,
  reportReference,
  signatureUri,
} from '@/utils/report-helpers';

type ReportDetailScreenProps = {
  reportId: string;
};

function checklistStatusLabel(status: ChecklistItemStatus | string): string {
  switch (status) {
    case 'pass':
      return 'Pass';
    case 'fail':
      return 'Issue found';
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

  const discardUncommittedSignature = (candidateUri: string | undefined) => {
    const orphan = signatureUriToDiscard(candidateUri, signatureUri(report.signature));
    if (orphan) {
      void deleteSignatureFile(orphan);
    }
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
      discardUncommittedSignature(nextSignature?.uri);
      Alert.alert('Save failed', 'Could not update the signature on this report.');
    } finally {
      setSavingSignature(false);
    }
  };

  const requestSignatureSave = (signature: ReportSignature) => {
    Alert.alert(
      'Save signature?',
      'This updates the existing report on this device. No duplicate report will be created.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            discardUncommittedSignature(signature.uri);
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
      {
        cancelable: true,
        onDismiss: () => {
          discardUncommittedSignature(signature.uri);
        },
      },
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

  const reference = reportReference(report.id);
  const locationLine = [report.clientContact?.trim(), formatCalendarDate(report.interventionDate)]
    .filter(Boolean)
    .join(' · ');
  const checklistCount =
    report.checklist.length === 1 ? '1 item' : `${report.checklist.length} items`;

  const openMenu = () => {
    Alert.alert(displayClientName(report.clientName), reference, [
      {
        text: isDraft ? 'Resume draft' : 'Edit report',
        onPress: () => router.push(editHref),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <View style={styles.nav}>
        <CircleButton
          glyph="‹"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace('/reports');
          }}
        />
        <View style={styles.navCopy}>
          <AppText variant="subtitle">Report details</AppText>
        </View>
        <AppText variant="caption" color="textMuted">
          {reference}
        </AppText>
        <CircleButton glyph="⋯" accessibilityLabel="More actions" onPress={openMenu} />
      </View>

      <Card style={styles.summary}>
        <View style={styles.summaryTop}>
          <AppText variant="caption" color="textMuted">
            {reference}
          </AppText>
          <StatusBadge status={report.status} />
        </View>
        <AppText variant="title">{displayClientName(report.clientName)}</AppText>
        <AppText variant="body" color="textSecondary">
          {locationLine}
        </AppText>
        <AppText variant="bodyMedium">{report.equipmentName.trim() || 'No equipment listed'}</AppText>
      </Card>

      <View style={styles.block}>
        <View style={styles.blockHeading}>
          <AppText variant="subtitle">Inspection checklist</AppText>
          <View style={[styles.meta, { backgroundColor: theme.surface }]}>
            <AppText variant="caption" color="textSecondary">
              {checklistCount}
            </AppText>
          </View>
        </View>
        <Card style={styles.section}>
          {report.checklist.map((item, index) => {
            const tone =
              item.status === 'pass' ? 'success' : item.status === 'fail' ? 'danger' : 'muted';
            const pillColor =
              tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.textMuted;
            const pillBackground =
              tone === 'success'
                ? theme.successLight
                : tone === 'danger'
                  ? theme.dangerLight
                  : theme.background;
            return (
              <View
                key={item.id}
                style={[
                  styles.checklistRow,
                  index < report.checklist.length - 1 && {
                    borderBottomColor: theme.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}>
                <AppText variant="body" style={styles.checklistLabel}>
                  {item.label}
                </AppText>
                <View style={[styles.pill, { backgroundColor: pillBackground }]}>
                  <AppText variant="caption" style={{ color: pillColor }}>
                    {checklistStatusLabel(item.status)}
                  </AppText>
                </View>
              </View>
            );
          })}
        </Card>
      </View>

      <ReportPhotosSection photos={report.photos ?? []} />

      <ReportPdfActions report={report} />

      <Card style={styles.section}>
        <AppText variant="subtitle">Problem</AppText>
        <AppText variant="body">
          {report.problemDescription.trim() || (isDraft ? 'Not filled in yet' : '—')}
        </AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Observations</AppText>
        <AppText variant="body">
          {report.observations.trim() || (isDraft ? 'Not filled in yet' : '—')}
        </AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Identified issues</AppText>
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
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  navCopy: {
    flex: 1,
  },
  summary: {
    gap: Spacing.two,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  block: {
    gap: Spacing.three,
  },
  blockHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meta: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  checklistLabel: {
    flex: 1,
  },
  pill: {
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
