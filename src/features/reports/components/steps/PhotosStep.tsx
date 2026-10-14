import * as Device from 'expo-device';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Radii, Spacing, TouchTarget } from '@/constants/theme';
import { PhotoPreviewModal } from '@/features/reports/components/PhotoPreviewModal';
import { useTheme } from '@/hooks/use-theme';
import {
  MAX_PHOTOS_PER_REPORT,
  buildReportPhoto,
  persistPhotoFromUri,
} from '@/services/photo-storage';
import type { NewReportDraft, PhotoCategory, ReportPhoto } from '@/types/report';

type PhotosStepProps = {
  draft: NewReportDraft;
  error?: string;
  onChangePhotos: (photos: ReportPhoto[]) => void;
  onPhotoPersisted?: (uri: string) => void;
};

type CategorySectionProps = {
  title: string;
  category: PhotoCategory;
  photos: ReportPhoto[];
  remainingSlots: number;
  busy: boolean;
  onAdd: (category: PhotoCategory, source: 'camera' | 'library') => void;
  onCaptionChange: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
  onPreview: (photo: ReportPhoto) => void;
};

function CategorySection({
  title,
  category,
  photos,
  remainingSlots,
  busy,
  onAdd,
  onCaptionChange,
  onRemove,
  onPreview,
}: CategorySectionProps) {
  const theme = useTheme();
  const canAdd = remainingSlots > 0 && !busy;

  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {photos.length} photo{photos.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          label="Camera"
          variant="secondary"
          disabled={!canAdd}
          onPress={() => {
            void onAdd(category, 'camera');
          }}
          style={styles.actionButton}
        />
        <Button
          label="Library"
          variant="secondary"
          disabled={!canAdd}
          onPress={() => {
            void onAdd(category, 'library');
          }}
          style={styles.actionButton}
        />
      </View>

      {photos.length === 0 ? (
        <AppText variant="body" color="textMuted">
          No {category} photos yet. Photos are optional for drafts.
        </AppText>
      ) : (
        <View style={styles.list}>
          {photos.map((photo) => (
            <View
              key={photo.id}
              style={[styles.photoRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Preview ${category} photo`}
                onPress={() => onPreview(photo)}
                style={({ pressed }) => [styles.thumbWrap, pressed && styles.pressed]}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={120}
                />
              </Pressable>
              <View style={styles.photoMeta}>
                <Input
                  label="Caption"
                  value={photo.caption ?? ''}
                  onChangeText={(value) => onCaptionChange(photo.id, value)}
                  placeholder="Optional note"
                  maxLength={120}
                />
                <Button
                  label="Remove"
                  variant="ghost"
                  onPress={() => onRemove(photo.id)}
                  disabled={busy}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export function PhotosStep({ draft, error, onChangePhotos, onPhotoPersisted }: PhotosStepProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ReportPhoto | null>(null);

  const remainingSlots = Math.max(0, MAX_PHOTOS_PER_REPORT - draft.photos.length);
  const beforePhotos = draft.photos.filter((photo) => photo.category === 'before');
  const afterPhotos = draft.photos.filter((photo) => photo.category === 'after');

  const updateCaption = (id: string, caption: string) => {
    onChangePhotos(
      draft.photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo)),
    );
  };

  const removePhoto = (id: string) => {
    onChangePhotos(draft.photos.filter((photo) => photo.id !== id));
  };

  const showSimulatorCameraAlert = () => {
    Alert.alert(
      'Camera unavailable on Simulator',
      'Camera capture requires a physical iPhone. On the simulator, use Library to add before/after evidence photos instead.',
      [{ text: 'OK' }],
    );
  };

  const pickFromCamera = async (): Promise<ImagePicker.ImagePickerResult | null> => {
    // Simulators/emulators have no camera hardware — skip permission + launch.
    if (!Device.isDevice) {
      showSimulatorCameraAlert();
      return null;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Enable camera access in Settings to capture evidence photos, or use Library instead.',
      );
      return null;
    }

    try {
      return await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
    } catch {
      Alert.alert(
        'Camera could not open',
        'Something went wrong launching the camera. Try again, or use Library to add a photo.',
      );
      return null;
    }
  };

  const pickFromLibrary = async (): Promise<ImagePicker.ImagePickerResult | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo library permission needed',
        'Enable photo library access in Settings to attach existing photos.',
      );
      return null;
    }

    try {
      return await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: false,
      });
    } catch {
      Alert.alert(
        'Library could not open',
        'Something went wrong opening your photo library. Please try again.',
      );
      return null;
    }
  };

  const addFromPicker = async (category: PhotoCategory, source: 'camera' | 'library') => {
    if (remainingSlots <= 0) {
      Alert.alert('Photo limit', `You can attach up to ${MAX_PHOTOS_PER_REPORT} photos per report.`);
      return;
    }

    // Avoid permission prompts / busy state when camera hardware is absent.
    if (source === 'camera' && !Device.isDevice) {
      showSimulatorCameraAlert();
      return;
    }

    setBusy(true);
    try {
      const result = source === 'camera' ? await pickFromCamera() : await pickFromLibrary();
      if (!result || result.canceled || !result.assets[0]?.uri) {
        return;
      }

      try {
        const persistedUri = await persistPhotoFromUri(result.assets[0].uri);
        onPhotoPersisted?.(persistedUri);
        const nextPhoto = buildReportPhoto(persistedUri, category);
        onChangePhotos([...draft.photos, nextPhoto]);
      } catch {
        Alert.alert(
          'Could not save photo',
          'The photo was selected but could not be stored on this device. Please try again.',
        );
      }
    } catch {
      Alert.alert(
        'Could not add photo',
        source === 'camera'
          ? 'Camera capture failed. Try again on a physical iPhone, or use Library instead.'
          : 'Something went wrong while adding the photo. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.countBanner, { backgroundColor: theme.backgroundElement }]}>
        <AppText variant="bodyMedium">
          {draft.photos.length} / {MAX_PHOTOS_PER_REPORT} photos
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {remainingSlots === 0
            ? 'Limit reached'
            : `${remainingSlots} remaining · optional for drafts`}
        </AppText>
      </View>

      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}

      <CategorySection
        title="Before"
        category="before"
        photos={beforePhotos}
        remainingSlots={remainingSlots}
        busy={busy}
        onAdd={addFromPicker}
        onCaptionChange={updateCaption}
        onRemove={removePhoto}
        onPreview={setPreview}
      />

      <CategorySection
        title="After"
        category="after"
        photos={afterPhotos}
        remainingSlots={remainingSlots}
        busy={busy}
        onAdd={addFromPicker}
        onCaptionChange={updateCaption}
        onRemove={removePhoto}
        onPreview={setPreview}
      />

      <PhotoPreviewModal photo={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.four,
  },
  countBanner: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionButton: {
    flex: 1,
  },
  list: {
    gap: Spacing.three,
  },
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  photoMeta: {
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
