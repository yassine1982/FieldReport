import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/constants/theme';
import {
  ReportPdfError,
  canExportReportPdf,
  previewReportPdf,
  shareReportPdf,
} from '@/services/report-pdf';
import type { Report } from '@/types/report';

type ReportPdfActionsProps = {
  report: Report;
};

function errorMessage(error: unknown): string {
  if (error instanceof ReportPdfError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Something went wrong while preparing the PDF.';
}

export function ReportPdfActions({ report }: ReportPdfActionsProps) {
  const [busyAction, setBusyAction] = useState<'preview' | 'share' | null>(null);
  const canExport = canExportReportPdf(report);
  const isBusy = busyAction !== null;

  const runAction = async (action: 'preview' | 'share') => {
    if (!canExport) {
      Alert.alert(
        'PDF unavailable',
        'Complete this report before exporting a client-ready PDF.',
      );
      return;
    }

    setBusyAction(action);
    try {
      if (action === 'preview') {
        await previewReportPdf(report);
      } else {
        await shareReportPdf(report);
      }
    } catch (error) {
      Alert.alert(action === 'preview' ? 'Preview failed' : 'Share failed', errorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View style={styles.stack}>
      <AppText variant="label" color="textMuted">
        PDF EXPORT
      </AppText>
      {canExport ? (
        <AppText variant="caption" color="textSecondary">
          Generate a printable A4 report from the saved data on this device.
        </AppText>
      ) : (
        <AppText variant="caption" color="warning">
          Complete this report to enable PDF preview and sharing.
        </AppText>
      )}
      <Button
        label="Preview PDF"
        variant="secondary"
        loading={busyAction === 'preview'}
        disabled={!canExport || (isBusy && busyAction !== 'preview')}
        onPress={() => void runAction('preview')}
      />
      <Button
        label="Share PDF"
        loading={busyAction === 'share'}
        disabled={!canExport || (isBusy && busyAction !== 'share')}
        onPress={() => void runAction('share')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
});
