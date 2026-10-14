import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { Typography, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextVariant = keyof typeof Typography;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
  style?: StyleProp<TextStyle>;
};

export function AppText({
  variant = 'body',
  color = 'text',
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();

  return (
    <Text style={[Typography[variant], { color: theme[color] }, style]} {...rest}>
      {children}
    </Text>
  );
}
