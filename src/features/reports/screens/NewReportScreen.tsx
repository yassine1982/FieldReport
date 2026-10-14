import { router, useNavigation, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useReports } from '@/context/ReportsContext';
import { createDefaultChecklist } from '@/data/default-checklist';
import { ChecklistStep } from '@/features/reports/components/steps/ChecklistStep';
import { ClientDetailsStep } from '@/features/reports/components/steps/ClientDetailsStep';
import { ObservationsStep } from '@/features/reports/components/steps/ObservationsStep';
import { PhotosStep } from '@/features/reports/components/steps/PhotosStep';
import { ReviewStep } from '@/features/reports/components/steps/ReviewStep';
import { StepHeader } from '@/features/reports/components/StepHeader';
import { WizardFooter } from '@/features/reports/components/WizardFooter';
import {
  hasErrors,
  inferWizardStep,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  type Step1Errors,
  type Step2Errors,
  type Step3Errors,
  type Step4Errors,
} from '@/features/reports/utils/validation';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deletePhotoFiles } from '@/services/photo-storage';
import { deleteSignatureFiles } from '@/services/signature-storage';
import type {
  ChecklistItemStatus,
  NewReportDraft,
  Report,
  ReportSignature,
} from '@/types/report';
import {
  buildReport,
  isDraftDirty,
  photoUris,
  reportToDraft,
  serializeDraft,
  signatureUri,
  todayIsoDate,
} from '@/utils/report-helpers';

const TOTAL_STEPS = 5;

function createInitialDraft(): NewReportDraft {
  return {
    clientName: '',
    clientContact: '',
    equipmentName: '',
    interventionDate: todayIsoDate(),
    problemDescription: '',
    checklist: createDefaultChecklist(),
    observations: '',
    identifiedIssues: [],
    photos: [],
    signature: undefined,
  };
}

type NewReportScreenProps = {
  reportId?: string;
};

type ReportWizardProps = {
  initialReport?: Report;
};

function ReportWizard({ initialReport }: ReportWizardProps) {
  const navigation = useNavigation();
  const { saveReport } = useReports();

  const seedDraft = initialReport ? reportToDraft(initialReport) : createInitialDraft();
  const seedStep =
    initialReport?.status === 'draft' ? inferWizardStep(seedDraft) : 1;

  const [step, setStep] = useState(seedStep);
  const [draft, setDraft] = useState<NewReportDraft>(seedDraft);
  const [baseline, setBaseline] = useState(() => serializeDraft(seedDraft));
  const [existingMeta, setExistingMeta] = useState<Pick<Report, 'id' | 'createdAt'> | null>(
    initialReport ? { id: initialReport.id, createdAt: initialReport.createdAt } : null,
  );
  const [originalStatus, setOriginalStatus] = useState<Report['status'] | null>(
    initialReport?.status ?? null,
  );
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [step3Errors, setStep3Errors] = useState<Step3Errors>({});
  const [step4Errors, setStep4Errors] = useState<Step4Errors>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingComplete, setSavingComplete] = useState(false);

  const allowLeaveRef = useRef(false);
  /** URIs copied into app storage during this wizard session (not yet committed by a save). */
  const sessionPersistedUrisRef = useRef<Set<string>>(new Set());
  /** Photo URIs that belong to the last successfully saved version of this report. */
  const committedUrisRef = useRef<Set<string>>(new Set(photoUris(seedDraft.photos)));
  /** Signature URIs captured this session before an explicit save. */
  const sessionSignatureUrisRef = useRef<Set<string>>(new Set());
  const committedSignatureUriRef = useRef<string | undefined>(signatureUri(seedDraft.signature));

  const dirty = isDraftDirty(draft, baseline);

  const cleanupOrphanSessionMedia = useCallback(async () => {
    const orphanPhotos = [...sessionPersistedUrisRef.current].filter(
      (uri) => !committedUrisRef.current.has(uri),
    );
    if (orphanPhotos.length > 0) {
      await deletePhotoFiles(orphanPhotos);
    }
    sessionPersistedUrisRef.current.clear();

    const orphanSignatures = [...sessionSignatureUrisRef.current].filter(
      (uri) => uri !== committedSignatureUriRef.current,
    );
    if (orphanSignatures.length > 0) {
      await deleteSignatureFiles(orphanSignatures);
    }
    sessionSignatureUrisRef.current.clear();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current || !dirty) {
        if (allowLeaveRef.current && !dirty) {
          // Saved leave — keep committed files.
          return;
        }
        if (!dirty) {
          void cleanupOrphanSessionMedia();
        }
        return;
      }

      event.preventDefault();

      Alert.alert('Discard changes?', 'You have unsaved changes. Leave without saving?', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await cleanupOrphanSessionMedia();
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            })();
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, dirty, cleanupOrphanSessionMedia]);

  const leaveWizard = useCallback(
    (href?: Href) => {
      allowLeaveRef.current = true;
      if (href) {
        router.replace(href);
        return;
      }
      if (navigation.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/reports');
    },
    [navigation],
  );

  const stepCopy = useMemo(() => {
    const editingCompleted = originalStatus === 'completed';
    switch (step) {
      case 1:
        return {
          title: 'Client & equipment',
          subtitle: 'Capture who you visited and what you worked on.',
        };
      case 2:
        return {
          title: 'Inspection checklist',
          subtitle: 'Mark each item Pass, Fail, or N/A.',
        };
      case 3:
        return {
          title: 'Observations',
          subtitle: 'Record findings and any identified issues.',
        };
      case 4:
        return {
          title: 'Photos & evidence',
          subtitle: 'Add optional before and after photos. You can skip this for drafts.',
        };
      default:
        return {
          title: editingCompleted ? 'Review & update' : 'Review & save',
          subtitle: editingCompleted
            ? 'Confirm details, then save your changes.'
            : 'Confirm details, save a draft, or mark the report completed.',
        };
    }
  }, [step, originalStatus]);

  const updateDraft = <K extends keyof NewReportDraft>(key: K, value: NewReportDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const requestLeave = () => {
    if (!dirty) {
      void cleanupOrphanSessionMedia().then(() => leaveWizard());
      return;
    }
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'You have unsaved changes. Leave without saving?', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void cleanupOrphanSessionMedia().then(() => leaveWizard('/reports'));
        },
      },
    ]);
  };

  const handleSignatureChange = (signature: ReportSignature | undefined) => {
    const previousUri = signatureUri(draft.signature);
    const nextUri = signatureUri(signature);

    if (
      previousUri &&
      previousUri !== nextUri &&
      previousUri !== committedSignatureUriRef.current &&
      sessionSignatureUrisRef.current.has(previousUri)
    ) {
      // Previous was a session-only signature — safe to delete immediately if replaced/removed.
      void deleteSignatureFiles([previousUri]);
      sessionSignatureUrisRef.current.delete(previousUri);
    }

    if (nextUri && nextUri !== committedSignatureUriRef.current) {
      sessionSignatureUrisRef.current.add(nextUri);
    }

    updateDraft('signature', signature);
  };

  const goNext = () => {
    if (step === 1) {
      const errors = validateStep1(draft);
      setStep1Errors(errors);
      if (hasErrors(errors)) {
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const errors = validateStep2(draft.checklist);
      setStep2Errors(errors);
      if (hasErrors(errors)) {
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const errors = validateStep3(draft);
      setStep3Errors(errors);
      if (hasErrors(errors)) {
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      const errors = validateStep4(draft);
      setStep4Errors(errors);
      if (hasErrors(errors)) {
        return;
      }
      setStep(5);
    }
  };

  const goBack = () => {
    setStep((current) => Math.max(1, current - 1));
  };

  const persistReport = async (status: Report['status']) => {
    const report = buildReport(draft, {
      status,
      existing: existingMeta ?? undefined,
    });
    const saved = await saveReport(report);
    setExistingMeta({ id: saved.id, createdAt: saved.createdAt });
    setOriginalStatus(status);
    setBaseline(serializeDraft(draft));
    committedUrisRef.current = new Set(photoUris(draft.photos));
    sessionPersistedUrisRef.current.clear();
    committedSignatureUriRef.current = signatureUri(draft.signature);
    sessionSignatureUrisRef.current.clear();
    return saved;
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const photosSnapshot = draft.photos;
    try {
      const report = await persistReport('draft');
      Alert.alert('Draft saved', 'You can resume this report later from the Reports list.', [
        {
          text: 'Continue editing',
          style: 'cancel',
        },
        {
          text: 'View draft',
          onPress: () =>
            leaveWizard({ pathname: '/report/[id]', params: { id: report.id } }),
        },
        {
          text: 'Done',
          onPress: () => leaveWizard('/reports'),
        },
      ]);
    } catch {
      // Newly copied session files remain in the in-memory draft for retry.
      // Only delete copies that somehow aren't referenced by the draft anymore.
      const draftUris = new Set(photoUris(photosSnapshot));
      const stray = [...sessionPersistedUrisRef.current].filter((uri) => !draftUris.has(uri));
      if (stray.length > 0) {
        await deletePhotoFiles(stray);
        stray.forEach((uri) => sessionPersistedUrisRef.current.delete(uri));
      }
      Alert.alert('Save failed', 'Could not save the draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveCompleted = async () => {
    const errors1 = validateStep1(draft);
    const errors2 = validateStep2(draft.checklist);
    const errors3 = validateStep3(draft);
    const errors4 = validateStep4(draft);
    setStep1Errors(errors1);
    setStep2Errors(errors2);
    setStep3Errors(errors3);
    setStep4Errors(errors4);

    if (hasErrors(errors1)) {
      setStep(1);
      Alert.alert('Missing details', 'Complete client and equipment details before finishing.');
      return;
    }
    if (hasErrors(errors2)) {
      setStep(2);
      Alert.alert('Checklist incomplete', 'Set Pass, Fail, or N/A for every checklist item.');
      return;
    }
    if (hasErrors(errors3)) {
      setStep(3);
      Alert.alert('Observations needed', 'Add observations before finishing this report.');
      return;
    }
    if (hasErrors(errors4)) {
      setStep(4);
      Alert.alert('Too many photos', errors4.photos ?? 'Reduce the number of photos.');
      return;
    }

    setSavingComplete(true);
    const photosSnapshot = draft.photos;
    try {
      const wasCompleted = originalStatus === 'completed';
      const report = await persistReport('completed');
      Alert.alert(
        wasCompleted ? 'Report updated' : 'Report saved',
        wasCompleted
          ? 'Your changes were saved on this device.'
          : 'Your intervention report was saved on this device.',
        [
          {
            text: 'View report',
            onPress: () =>
              leaveWizard({ pathname: '/report/[id]', params: { id: report.id } }),
          },
          {
            text: 'Done',
            onPress: () => leaveWizard('/reports'),
          },
        ],
      );
    } catch {
      const draftUris = new Set(photoUris(photosSnapshot));
      const stray = [...sessionPersistedUrisRef.current].filter((uri) => !draftUris.has(uri));
      if (stray.length > 0) {
        await deletePhotoFiles(stray);
        stray.forEach((uri) => sessionPersistedUrisRef.current.delete(uri));
      }
      Alert.alert('Save failed', 'Could not save the report. Please try again.');
    } finally {
      setSavingComplete(false);
    }
  };

  const isEditingCompleted = originalStatus === 'completed';
  const nextLabel =
    step === 5 ? (isEditingCompleted ? 'Save changes' : 'Mark completed') : 'Continue';
  const showSaveDraft = !isEditingCompleted;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <Screen>
        <View style={styles.topBar}>
          <Button label="Cancel" variant="ghost" onPress={requestLeave} />
          {showSaveDraft ? (
            <Button
              label="Save draft"
              variant="secondary"
              onPress={() => void handleSaveDraft()}
              loading={savingDraft}
              disabled={savingComplete}
            />
          ) : null}
        </View>

        <StepHeader
          step={step}
          totalSteps={TOTAL_STEPS}
          title={stepCopy.title}
          subtitle={stepCopy.subtitle}
        />

        {step === 1 ? (
          <ClientDetailsStep draft={draft} errors={step1Errors} onChange={updateDraft} />
        ) : null}

        {step === 2 ? (
          <ChecklistStep
            checklist={draft.checklist}
            error={step2Errors.checklist}
            onChangeStatus={(id, status: Exclude<ChecklistItemStatus, 'pending'>) => {
              setDraft((current) => ({
                ...current,
                checklist: current.checklist.map((item) =>
                  item.id === id ? { ...item, status } : item,
                ),
              }));
            }}
          />
        ) : null}

        {step === 3 ? (
          <ObservationsStep
            draft={draft}
            errors={step3Errors}
            onChangeObservations={(value) => updateDraft('observations', value)}
            onChangeIssue={(index, value) => {
              setDraft((current) => ({
                ...current,
                identifiedIssues: current.identifiedIssues.map((issue, i) =>
                  i === index ? value : issue,
                ),
              }));
            }}
            onAddIssue={() => {
              setDraft((current) => ({
                ...current,
                identifiedIssues: [...current.identifiedIssues, ''],
              }));
            }}
            onRemoveIssue={(index) => {
              setDraft((current) => ({
                ...current,
                identifiedIssues: current.identifiedIssues.filter((_, i) => i !== index),
              }));
            }}
          />
        ) : null}

        {step === 4 ? (
          <PhotosStep
            draft={draft}
            error={step4Errors.photos}
            onChangePhotos={(photos) => {
              const nextUris = new Set(photoUris(photos));
              const removedSession = [...sessionPersistedUrisRef.current].filter(
                (uri) => !nextUris.has(uri) && !committedUrisRef.current.has(uri),
              );
              if (removedSession.length > 0) {
                void deletePhotoFiles(removedSession);
                removedSession.forEach((uri) => sessionPersistedUrisRef.current.delete(uri));
              }
              updateDraft('photos', photos);
            }}
            onPhotoPersisted={(uri) => {
              sessionPersistedUrisRef.current.add(uri);
            }}
          />
        ) : null}

        {step === 5 ? (
          <ReviewStep draft={draft} onChangeSignature={handleSignatureChange} />
        ) : null}

        <WizardFooter
          onBack={step > 1 ? goBack : undefined}
          onNext={step === 5 ? () => void handleSaveCompleted() : goNext}
          nextLabel={nextLabel}
          loading={savingComplete}
          disableNext={savingDraft}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function NewReportScreen({ reportId }: NewReportScreenProps) {
  const theme = useTheme();
  const { getReport, loading: reportsLoading } = useReports();

  if (!reportId) {
    return <ReportWizard />;
  }

  const existingReport = getReport(reportId);

  if (reportsLoading && !existingReport) {
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

  if (!existingReport) {
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

  return <ReportWizard key={existingReport.id} initialReport={existingReport} />;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -Spacing.two,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.eight,
  },
});
