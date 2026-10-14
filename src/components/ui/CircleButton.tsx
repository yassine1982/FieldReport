import { Pressable, StyleSheet, Text } from 'react-native';

import { TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CircleButtonProps = {
  glyph: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export function CircleButton({ glyph, accessibilityLabel, onPress }: CircleButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.surface,
          shadowColor: theme.cardShadow,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <Text style={[styles.glyph, { color: theme.text }]}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: TouchTarget.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  glyph: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '500',
  },
});
