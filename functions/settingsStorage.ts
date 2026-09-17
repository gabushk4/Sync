import AsyncStorage from '@react-native-async-storage/async-storage'

import { AppSettings, SettingsRepository } from '@/types/settings'

const SETTINGS_STORAGE_KEY = 'settings'

async function load(): Promise<Partial<AppSettings>> {
  const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)

  if (!stored) return {}

  try {
    const parsed: unknown = JSON.parse(stored)
    return parsed && typeof parsed === 'object'
      ? parsed as Partial<AppSettings>
      : {}
  } catch {
    return {}
  }
}

async function save(changes: Partial<AppSettings>): Promise<void> {
  const current = await load()
  await AsyncStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ ...current, ...changes }),
  )
}

export const asyncStorageSettingsRepository: SettingsRepository = {
  load,
  save,
}
