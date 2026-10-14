import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Radii, Spacing } from '@/constants/theme';
import { ReportSignatureSection } from '@/features/reports/components/ReportSignatureSection';
import { SignatureCaptureModal } from '@/features/reports/components/SignatureCaptureModal';
import type { NewReportDraft, ReportPhoto, ReportSignature } from '@/types/report';
import {
  computeDraftContentDigest,
  formatDisplayDate,
  reconcileSignatureWithContent,
} from '@/utils/report-helpers';

type ReviewStepProps = {
  draft: NewReportDraft;
  onChangeSignature: (signature: ReportSignature | undefined) => void;
};

function ChecklistSummary({ draft }: { draft: NewReportDraft }) {
  const pass = draft.checklist.filter((item) => item.status === 'pass').length;
  const fail = draft.checklist.filter((item) => item.status === 'fail').length;
  const na = draft.checklist.filter((item) => item.status === 'na').length;
  return (
    <AppText variant="body" color="textSecondary">
      {pass} pass · {fail} fail · {na} N/A
    </AppText>
  );
}

export function ReviewStep({ draft, onChangeSignature }: ReviewStepProps) {
  const [captureOpen, setCaptureOpen] = useState(false);
  const contentDigest = computeDraftContentDigest(draft);
  const signature = reconcileSignatureWithContent(draft.signature, contentDigest);

  return (
    <View style={styles.stack}>
      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          CLIENT & EQUIPMENT
        </AppText>
        <AppText variant="subtitle">{draft.clientName.trim() || '—'}</AppText>
        {draft.clientContact.trim() ? (
          <AppText variant="body" color="textSecondary">
            {draft.clientContact.trim()}
          </AppText>
        ) : null}
        <AppText variant="body">{draft.equipmentName.trim() || '—'}</AppText>
        <AppText variant="caption" color="textMuted">
          Intervention {formatDisplayDate(draft.interventionDate)}
        </AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          PROBLEM
        </AppText>
        <AppText variant="body">{draft.problemDescription.trim() || '—'}</AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          CHECKLIST
        </AppText>
        <ChecklistSummary draft={draft} />
        {draft.checklist
          .filter((item) => item.status === 'fail')
          .map((item) => (
            <AppText key={item.id} variant="caption" color="danger">
              Fail — {item.label}
            </AppText>
          ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          OBSERVATIONS
        </AppText>
        <AppText variant="body">{draft.observations.trim() || '—'}</AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          IDENTIFIED ISSUES
        </AppText>
        {draft.identifiedIssues.filter((issue) => issue.trim()).length === 0 ? (
          <AppText variant="body" color="textMuted">
            None listed
          </AppText>
        ) : (
          draft.identifiedIssues
            .filter((issue) => issue.trim())
            .map((issue, index) => (
              <AppText key={`${issue}-${index}`} variant="body">
                • {issue.trim()}
              </AppText>
            ))
        )}
      </Card>

      <Card style={styles.section}>
        <AppText variant="label" color="textMuted">
          EVIDENCE PHOTOS
        </AppText>
        <AppText variant="body" color="textSecondary">
          {draft.photos.length === 0
            ? 'No photos attached'
            : `${draft.photos.filter((p) => p.category === 'before').length} before · ${
                draft.photos.filter((p) => p.category === 'after').length
              } after`}
        </AppText>
        {draft.photos.length > 0 ? (
          <View style={styles.photoRow}>
            {draft.photos.slice(0, 6).map((photo: ReportPhoto) => (
              <Image
                key={photo.id}
                source={{ uri: photo.uri }}
                style={styles.thumb}
                contentFit="cover"
              />
            ))}
          </View>
        ) : null}
      </Card>

      <ReportSignatureSection
        signature={signature}
        deferredSaveHint
        onCapture={() => setCaptureOpen(true)}
        onConfirmCurrent={() => {
          if (!signature) {
            return;
          }
          onChangeSignature({
            ...signature,
            contentDigest,
            needsReconfirmation: false,
          });
        }}
        onClear={() => onChangeSignature(undefined)}
      />

      <SignatureCaptureModal
        visible={captureOpen}
        contentDigest={contentDigest}
        initialSignerName={signature?.signerName ?? draft.clientName}
        onCancel={() => setCaptureOpen(false)}
        onConfirm={(signature) => {
          onChangeSignature(signature);
          setCaptureOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radii.sm,
  },
});
