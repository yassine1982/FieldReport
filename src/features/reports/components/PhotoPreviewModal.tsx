import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Palette, Radii, Spacing, TouchTarget } from '@/constants/theme';
import type { ReportPhoto } from '@/types/report';

type PhotoPreviewModalProps = {
  photo: ReportPhoto | null;
  onClose: () => void;
};

export function PhotoPreviewModal({ photo, onClose }: PhotoPreviewModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={photo !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: Palette.overlay, paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo preview"
          onPress={onClose}
          style={styles.flex}>
          <View style={styles.content} pointerEvents="box-none">
            {photo ? (
              <>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.image}
                  contentFit="contain"
                  accessibilityLabel={photo.caption || `${photo.category} evidence photo`}
                />
                <View style={[styles.meta, { paddingBottom: Math.max(insets.bottom, Spacing.four) }]}>
                  <AppText variant="label" style={styles.lightText}>
                    {photo.category === 'before' ? 'BEFORE' : 'AFTER'}
                  </AppText>
                  {photo.caption ? (
                    <AppText variant="body" style={styles.lightText}>
                      {photo.caption}
                    </AppText>
                  ) : null}
                  <Button label="Close" variant="secondary" onPress={onClose} />
                </View>
              </>
            ) : null}
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  image: {
    width: '100%',
    flex: 1,
    borderRadius: Radii.md,
    minHeight: TouchTarget.min * 4,
  },
  meta: {
    gap: Spacing.two,
  },
  lightText: {
    color: Palette.white,
  },
});
