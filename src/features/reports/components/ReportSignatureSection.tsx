import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Palette, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signatureFileExists } from '@/services/signature-storage';
import type { ReportSignature } from '@/types/report';
import { formatDisplayDateTime } from '@/utils/report-helpers';

type ReportSignatureSectionProps = {
  signature?: ReportSignature;
  onCapture: () => void;
  onConfirmCurrent?: () => void;
  onClear?: () => void;
  busy?: boolean;
  /** When true, explain that changes save with the report (wizard). */
  deferredSaveHint?: boolean;
};

export function ReportSignatureSection({
  signature,
  onCapture,
  onConfirmCurrent,
  onClear,
  busy = false,
  deferredSaveHint = false,
}: ReportSignatureSectionProps) {
  const theme = useTheme();
  const hasFile = Boolean(signature?.uri) && signatureFileExists(signature?.uri);
  const needsReconfirmation = Boolean(signature?.needsReconfirmation);
  const isCurrent = hasFile && !needsReconfirmation;

  return (
    <Card style={styles.section}>
      <AppText variant="label" color="textMuted">
        CLIENT SIGNATURE
      </AppText>

      {!signature || !hasFile ? (
        <>
          <AppText variant="body" color="textSecondary">
            No signature captured yet. Signatures are stored as part of this intervention report —
            not as a qualified electronic signature.
          </AppText>
          <Button
            label="Add signature"
            variant="secondary"
            onPress={onCapture}
            disabled={busy}
          />
        </>
      ) : (
        <>
          <View
            style={[
              styles.preview,
              { borderColor: theme.border, backgroundColor: Palette.white },
            ]}>
            <Image
              source={{ uri: signature.uri }}
              style={styles.image}
              contentFit="contain"
              accessibilityLabel="Client signature"
            />
          </View>

          {signature.signerName ? (
            <AppText variant="body">Signed by {signature.signerName}</AppText>
          ) : (
            <AppText variant="body" color="textMuted">
              Signer name not provided
            </AppText>
          )}
          <AppText variant="caption" color="textMuted">
            {formatDisplayDateTime(signature.signedAt)}
          </AppText>

          {isCurrent ? (
            <AppText variant="caption" color="success">
              Signature is current for the saved report content.
            </AppText>
          ) : (
            <AppText variant="caption" color="warning">
              Report content changed after signing. Confirm the signature still applies, or capture
              a new one.
            </AppText>
          )}

          <AppText variant="caption" color="textMuted">
            {signature.consentLabel}
          </AppText>

          <View style={styles.actions}>
            {needsReconfirmation && onConfirmCurrent ? (
              <Button
                label="Confirm still applies"
                onPress={onConfirmCurrent}
                disabled={busy}
              />
            ) : null}
            <Button
              label="Replace signature"
              variant="secondary"
              onPress={onCapture}
              disabled={busy}
            />
            {onClear ? (
              <Button label="Remove signature" variant="ghost" onPress={onClear} disabled={busy} />
            ) : null}
          </View>
        </>
      )}

      {deferredSaveHint ? (
        <AppText variant="caption" color="textMuted">
          Signature changes are kept with this draft until you save the report.
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  preview: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.two,
    minHeight: 120,
  },
  image: {
    width: '100%',
    height: 120,
  },
  actions: {
    gap: Spacing.two,
  },
});
