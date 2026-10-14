import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Radii, Spacing, TouchTarget } from '@/constants/theme';
import { PhotoPreviewModal } from '@/features/reports/components/PhotoPreviewModal';
import { useTheme } from '@/hooks/use-theme';
import { photoFileExists } from '@/services/photo-storage';
import type { PhotoCategory, ReportPhoto } from '@/types/report';

type ReportPhotosSectionProps = {
  photos: ReportPhoto[];
};

function CategoryGallery({
  title,
  category,
  photos,
  onPreview,
}: {
  title: string;
  category: PhotoCategory;
  photos: ReportPhoto[];
  onPreview: (photo: ReportPhoto) => void;
}) {
  const theme = useTheme();
  const items = photos.filter((photo) => photo.category === category);

  return (
    <Card style={styles.section}>
      <View style={styles.header}>
        <AppText variant="label" color="textMuted">
          {title}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {items.length}
        </AppText>
      </View>

      {items.length === 0 ? (
        <AppText variant="body" color="textMuted">
          None attached
        </AppText>
      ) : (
        <View style={styles.grid}>
          {items.map((photo) => {
            const missing = !photoFileExists(photo.uri);
            return (
              <Pressable
                key={photo.id}
                accessibilityRole="button"
                accessibilityLabel={photo.caption || `${category} evidence photo`}
                disabled={missing}
                onPress={() => onPreview(photo)}
                style={({ pressed }) => [
                  styles.tile,
                  { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                {missing ? (
                  <View style={styles.missing}>
                    <AppText variant="caption" color="textMuted">
                      Missing file
                    </AppText>
                  </View>
                ) : (
                  <Image source={{ uri: photo.uri }} style={styles.image} contentFit="cover" />
                )}
                {photo.caption ? (
                  <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                    {photo.caption}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

export function ReportPhotosSection({ photos }: ReportPhotosSectionProps) {
  const [preview, setPreview] = useState<ReportPhoto | null>(null);

  return (
    <View style={styles.stack}>
      <AppText variant="label" color="textMuted">
        EVIDENCE PHOTOS
      </AppText>
      <CategoryGallery
        title="BEFORE"
        category="before"
        photos={photos}
        onPreview={setPreview}
      />
      <CategoryGallery title="AFTER" category="after" photos={photos} onPreview={setPreview} />
      <PhotoPreviewModal photo={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    minHeight: TouchTarget.min * 2,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  missing: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.88,
  },
});
