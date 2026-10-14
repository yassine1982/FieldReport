import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * On web, return a stable light scheme during SSR/hydration, then the real scheme.
 * useSyncExternalStore avoids setState-in-effect lint issues from the starter template.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (!hasHydrated) {
    return 'light';
  }

  return colorScheme;
}
