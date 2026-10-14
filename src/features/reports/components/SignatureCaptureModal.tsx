import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Palette, Spacing } from '@/constants/theme';
import {
  SignaturePad,
  type SignaturePadHandle,
} from '@/features/reports/components/SignaturePad';
import { useTheme } from '@/hooks/use-theme';
import {
  buildReportSignature,
  persistSignatureFromUri,
} from '@/services/signature-storage';
import { DEFAULT_SIGNATURE_CONSENT_LABEL } from '@/types/company';
import type { ReportSignature } from '@/types/report';

export type SignatureCaptureResult = ReportSignature;

type SignatureCaptureModalProps = {
  visible: boolean;
  contentDigest: string;
  initialSignerName?: string;
  onCancel: () => void;
  onConfirm: (signature: SignatureCaptureResult) => void;
};

type SignatureCaptureFormProps = {
  contentDigest: string;
  initialSignerName: string;
  onCancel: () => void;
  onConfirm: (signature: SignatureCaptureResult) => void;
};

function SignatureCaptureForm({
  contentDigest,
  initialSignerName,
  onCancel,
  onConfirm,
}: SignatureCaptureFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padRef = useRef<SignaturePadHandle>(null);
  const captureViewRef = useRef<View>(null);
  const [signerName, setSignerName] = useState(initialSignerName);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleClear = () => {
    padRef.current?.clear();
  };

  const handleUndo = () => {
    padRef.current?.undo();
  };

  const handleConfirm = useCallback(async () => {
    if (isEmpty || padRef.current?.isEmpty()) {
      Alert.alert('Signature required', 'Please sign in the box before confirming.');
      return;
    }

    if (!captureViewRef.current) {
      Alert.alert('Capture failed', 'Could not capture the signature. Please try again.');
      return;
    }

    setSaving(true);
    try {
      const tmpUri = await captureRef(captureViewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      if (!tmpUri) {
        throw new Error('Empty capture');
      }

      const persistentUri = await persistSignatureFromUri(tmpUri);
      const signature = buildReportSignature({
        uri: persistentUri,
        contentDigest,
        signerName,
        consentLabel: DEFAULT_SIGNATURE_CONSENT_LABEL,
      });
      onConfirm(signature);
    } catch {
      Alert.alert(
        'Could not save signature',
        'The signature image could not be stored on this device. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [contentDigest, isEmpty, onConfirm, signerName]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header scrolls independently — the pad is intentionally outside any ScrollView. */}
      <ScrollView
        style={styles.headerScroll}
        contentContainerStyle={[
          styles.headerContent,
          { paddingTop: Math.max(insets.top, Spacing.four) },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        <AppText variant="title">Client signature</AppText>
        <AppText variant="body" color="textSecondary">
          Capture a touch signature as part of this intervention report. This is not a qualified
          electronic signature or legal certification.
        </AppText>

        <Input
          label="Signer name (optional)"
          value={signerName}
          onChangeText={setSignerName}
          placeholder="Client or site contact"
          autoCapitalize="words"
          maxLength={80}
        />
      </ScrollView>

      <View style={styles.padSection}>
        <AppText variant="label" color="textMuted">
          SIGN HERE
        </AppText>
        <View
          ref={captureViewRef}
          collapsable={false}
          style={[
            styles.captureWrap,
            {
              backgroundColor: Palette.white,
              borderColor: theme.border,
            },
          ]}>
          <SignaturePad
            ref={padRef}
            height={220}
            strokeColor={Palette.text}
            onDrawingChange={setIsEmpty}
          />
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, Spacing.five) },
        ]}>
        <AppText variant="caption" color="textMuted">
          {DEFAULT_SIGNATURE_CONSENT_LABEL}
        </AppText>

        <View style={styles.row}>
          <Button label="Undo" variant="secondary" onPress={handleUndo} style={styles.half} />
          <Button label="Clear" variant="ghost" onPress={handleClear} style={styles.half} />
        </View>

        <View style={styles.actions}>
          <Button
            label="Confirm signature"
            onPress={() => void handleConfirm()}
            loading={saving}
            disabled={isEmpty}
          />
          <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function SignatureCaptureModal({
  visible,
  contentDigest,
  initialSignerName = '',
  onCancel,
  onConfirm,
}: SignatureCaptureModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}>
      {/* Modals need their own root for gesture-handler gestures to work. */}
      <GestureHandlerRootView style={styles.flex}>
        {visible ? (
          <SignatureCaptureForm
            key={`${contentDigest}:${initialSignerName}`}
            contentDigest={contentDigest}
            initialSignerName={initialSignerName}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  headerContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  padSection: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    flexShrink: 0,
  },
  captureWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    padding: Spacing.one,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  half: {
    flex: 1,
  },
  actions: {
    gap: Spacing.two,
  },
});
