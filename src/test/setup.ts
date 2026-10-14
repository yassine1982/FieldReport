import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { resetStorageOperations } from '@/services/storage-operation';
import { resetMockFiles } from '@/test/expo-file-system-mock';

Object.defineProperty(Platform, 'OS', {
  configurable: true,
  get: () => 'ios',
});

beforeEach(async () => {
  resetMockFiles();
  resetStorageOperations();
  await AsyncStorage.clear();
});
