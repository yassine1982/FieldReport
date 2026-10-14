import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Radii, Spacing } from '@/constants/theme';
import { PhotoPreviewModal } from '@/features/reports/components/PhotoPreviewModal';
import { useTheme } from '@/hooks/use-theme';
import { photoFileExists } from '@/services/photo-storage';
import type { PhotoCategory, ReportPhoto } from '@/types/report';

type ReportPhotosSectionProps = {
  photos: ReportPhoto[];
};

const CATEGORIES: { category: PhotoCategory; label: string; letter: string; tone: 'before' | 'after' }[] =
  [
    { category: 'before', label: 'Before', letter: 'B', tone: 'before' },
    { category: 'after', label: 'After', letter: 'A', tone: 'after' },
  ];

export function ReportPhotosSection({ photos }: ReportPhotosSectionProps) {
  const theme = useTheme();
  const [preview, setPreview] = useState<ReportPhoto | null>(null);
  const countLabel = photos.length === 1 ? '1 photo' : `${photos.length} photos`;

  const tileColors = {
    before: { background: theme.backgroundElement, foreground: theme.primary },
    after: { background: theme.successLight, foreground: theme.success },
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <AppText variant="subtitle">Evidence</AppText>
        <View style={[styles.meta, { backgroundColor: theme.surface }]}>
          <AppText variant="caption" color="textSecondary">
            {countLabel}
          </AppText>
        </View>
      </View>
      <View style={styles.row}>
        {CATEGORIES.map((item) => {
          const categoryPhotos = photos.filter((photo) => photo.category === item.category);
          const colors = tileColors[item.tone];
          if (categoryPhotos.length === 0) {
            return (
              <View key={item.category} style={styles.tileWrap}>
                <View style={[styles.tile, { backgroundColor: colors.background }]}>
                  <AppText variant="subtitle" style={{ color: colors.foreground }}>
                    {item.letter}
                  </AppText>
                </View>
                <AppText variant="caption" color="textSecondary">
                  {item.label}
                </AppText>
              </View>
            );
          }

          return categoryPhotos.map((photo) => {
            const missing = !photoFileExists(photo.uri);
            return (
              <Pressable
                key={photo.id}
                accessibilityRole="button"
                accessibilityLabel={photo.caption || `${item.label} evidence photo`}
                disabled={missing}
                onPress={() => setPreview(photo)}
                style={({ pressed }) => [styles.tileWrap, pressed && styles.pressed]}>
                <View style={[styles.tile, { backgroundColor: colors.background }]}>
                  {missing ? (
                    <AppText variant="caption" style={{ color: colors.foreground }}>
                      Missing
                    </AppText>
                  ) : (
                    <Image source={{ uri: photo.uri }} style={styles.image} contentFit="cover" />
                  )}
                </View>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          });
        })}
      </View>
      <PhotoPreviewModal photo={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meta: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tileWrap: {
    width: 84,
    alignItems: 'center',
    gap: Spacing.two,
  },
  tile: {
    width: 84,
    height: 84,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.88,
  },
});
