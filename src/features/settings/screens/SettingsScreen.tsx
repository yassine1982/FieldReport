import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  EMPTY_COMPANY_PROFILE_INPUT,
  type CompanyProfile,
  type CompanyProfileInput,
} from '@/types/company';
import {
  deleteLogoFile,
  hasCompanyBrandingName,
  loadCompanyProfile,
  logoUriToDiscardOnLeave,
  persistLogoFromUri,
  profileToInput,
  upsertCompanyProfile,
  validateCompanyProfileInput,
  type CompanyProfileErrors,
} from '@/services/company-storage';

export function SettingsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingLogo, setPickingLogo] = useState(false);
  const [savedProfile, setSavedProfile] = useState<CompanyProfile | null>(null);
  const [input, setInput] = useState<CompanyProfileInput>(EMPTY_COMPANY_PROFILE_INPUT);
  const [errors, setErrors] = useState<CompanyProfileErrors>({});
  const [sessionLogoUri, setSessionLogoUri] = useState<string | undefined>();
  const sessionLogoUriRef = useRef<string | undefined>(undefined);
  const savedLogoUriRef = useRef<string | undefined>(undefined);
  const saveInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const pending = logoUriToDiscardOnLeave({
        sessionLogoUri: sessionLogoUriRef.current,
        savedLogoUri: savedLogoUriRef.current,
        saveInFlight: saveInFlightRef.current,
      });
      if (pending) {
        void deleteLogoFile(pending);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const profile = await loadCompanyProfile();
        if (cancelled) {
          return;
        }
        savedLogoUriRef.current = profile?.logoUri;
        sessionLogoUriRef.current = undefined;
        setSavedProfile(profile);
        setInput(profileToInput(profile));
        setSessionLogoUri(undefined);
        setErrors({});
      } catch {
        if (!cancelled) {
          Alert.alert('Load failed', 'Could not load company settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof CompanyProfileInput>(
    key: K,
    value: CompanyProfileInput[K],
  ) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const handlePickLogo = async () => {
    setPickingLogo(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Allow photo library access to choose a company logo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const persistentUri = await persistLogoFromUri(result.assets[0].uri);
      const previousPending = logoUriToDiscardOnLeave({
        sessionLogoUri: sessionLogoUriRef.current,
        savedLogoUri: savedLogoUriRef.current,
        saveInFlight: false,
      });
      sessionLogoUriRef.current = persistentUri;
      if (previousPending && previousPending !== persistentUri) {
        void deleteLogoFile(previousPending);
      }
      setSessionLogoUri(persistentUri);
      updateField('logoUri', persistentUri);
      setErrors((current) => {
        const next = { ...current };
        delete next.logo;
        return next;
      });
    } catch {
      Alert.alert('Logo failed', 'Could not store the selected logo. Please try again.');
    } finally {
      setPickingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    const pending = logoUriToDiscardOnLeave({
      sessionLogoUri: sessionLogoUriRef.current,
      savedLogoUri: savedLogoUriRef.current,
      saveInFlight: false,
    });
    if (pending) {
      void deleteLogoFile(pending);
    }
    sessionLogoUriRef.current = undefined;
    updateField('logoUri', undefined);
    setSessionLogoUri(undefined);
  };

  const handleSave = async () => {
    const nextErrors = validateCompanyProfileInput(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const profile = await upsertCompanyProfile(input, savedProfile);
      savedLogoUriRef.current = profile.logoUri;
      sessionLogoUriRef.current = undefined;
      setSavedProfile(profile);
      setInput(profileToInput(profile));
      setSessionLogoUri(undefined);
      Alert.alert(
        'Settings saved',
        hasCompanyBrandingName(profile)
          ? 'Company branding will appear on new PDF exports.'
          : 'Saved. Add a company name for full PDF branding (a fallback name is used until then).',
      );
    } catch {
      if (!mountedRef.current) {
        const pending = logoUriToDiscardOnLeave({
          sessionLogoUri: sessionLogoUriRef.current,
          savedLogoUri: savedLogoUriRef.current,
          saveInFlight: false,
        });
        if (pending) {
          void deleteLogoFile(pending);
        }
        sessionLogoUriRef.current = undefined;
      }
      Alert.alert('Save failed', 'Could not save company settings. Please try again.');
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="brand">Settings</AppText>
        <AppText variant="body" color="textSecondary">
          Local company profile used for branded PDF exports. Stored only on this device.
        </AppText>
      </View>

      <Card style={styles.section}>
        <AppText variant="subtitle">Company branding</AppText>
        <AppText variant="caption" color="textMuted">
          Company name is recommended before generating a branded PDF. If unset, PDFs use
          “Independent technician”.
        </AppText>

        <Input
          label="Company name"
          value={input.companyName}
          onChangeText={(value) => updateField('companyName', value)}
          placeholder="Your business name"
          error={errors.companyName}
          autoCapitalize="words"
          editable={!loading}
        />

        <View style={styles.logoBlock}>
          <AppText variant="label" color="textMuted">
            LOGO
          </AppText>
          {input.logoUri ? (
            <View
              style={[
                styles.logoPreview,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}>
              <Image
                source={{ uri: input.logoUri }}
                style={styles.logoImage}
                contentFit="contain"
                accessibilityLabel="Company logo"
              />
            </View>
          ) : (
            <AppText variant="body" color="textMuted">
              No logo selected
            </AppText>
          )}
          {errors.logo ? (
            <AppText variant="caption" color="danger">
              {errors.logo}
            </AppText>
          ) : null}
          <View style={styles.row}>
            <Button
              label={input.logoUri ? 'Replace logo' : 'Choose logo'}
              variant="secondary"
              onPress={() => void handlePickLogo()}
              loading={pickingLogo}
              disabled={loading || saving}
              style={styles.flex}
            />
            {input.logoUri ? (
              <Button
                label="Remove"
                variant="ghost"
                onPress={handleRemoveLogo}
                disabled={loading || saving || pickingLogo}
              />
            ) : null}
          </View>
          {sessionLogoUri ? (
            <AppText variant="caption" color="textMuted">
              New logo will be kept when you save settings.
            </AppText>
          ) : null}
        </View>

        <Input
          label="Contact email"
          value={input.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="optional"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
          editable={!loading}
        />
        <Input
          label="Phone"
          value={input.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="optional"
          keyboardType="phone-pad"
          error={errors.phone}
          editable={!loading}
        />
        <Input
          label="Address"
          value={input.address}
          onChangeText={(value) => updateField('address', value)}
          placeholder="optional"
          multiline
          editable={!loading}
        />
        <Input
          label="Website"
          value={input.website}
          onChangeText={(value) => updateField('website', value)}
          placeholder="optional"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={errors.website}
          editable={!loading}
        />
        <Input
          label="Technician name"
          value={input.technicianName}
          onChangeText={(value) => updateField('technicianName', value)}
          placeholder="optional — shown on PDFs"
          autoCapitalize="words"
          editable={!loading}
        />

        <Button
          label="Save company profile"
          onPress={() => void handleSave()}
          loading={saving}
          disabled={loading || pickingLogo}
        />
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Account &amp; sync</AppText>
        <AppText variant="body" color="textSecondary" style={styles.copy}>
          Authentication, cloud sync, and subscriptions remain out of scope for this milestone.
          Everything stays local-first on this device.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  copy: {
    marginTop: Spacing.one,
  },
  logoBlock: {
    gap: Spacing.two,
  },
  logoPreview: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.three,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: 72,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
});
