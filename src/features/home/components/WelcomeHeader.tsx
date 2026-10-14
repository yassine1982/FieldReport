import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { loadCompanyProfile } from '@/services/company-storage';

function greetingForHour(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function WelcomeHeader() {
  const theme = useTheme();
  const [technicianName, setTechnicianName] = useState('');

  useEffect(() => {
    let cancelled = false;
    void loadCompanyProfile()
      .then((profile) => {
        if (!cancelled) {
          setTechnicianName(profile?.technicianName?.trim() ?? '');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTechnicianName('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = technicianName.split(/\s+/)[0] ?? '';
  const greeting = greetingForHour(new Date().getHours());
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '';

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText style={styles.brand}>FieldReport</AppText>
        <AppText variant="body" color="textSecondary">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </AppText>
      </View>
      {initial ? (
        <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
          <AppText variant="subtitle" color="primary">
            {initial}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  brand: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
