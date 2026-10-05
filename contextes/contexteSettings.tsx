import { asyncStorageSettingsRepository } from '@/functions/settingsStorage'
import { getDeviceTimezone } from '@/functions/timezones'
import { changeAppLocale } from '@/locales/initLocale'
import {
    AppSettings,
    DEFAULT_SETTINGS,
    SettingKey,
    SettingsRepository,
} from '@/types/settings'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

type SettingsContextValue = {
  settings: AppSettings
  hydrated: boolean
  setSetting: <K extends SettingKey>(key: K, value: AppSettings[K]) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

type SettingsProviderProps = {
  children: ReactNode
  repository?: SettingsRepository
}

export function SettingsProvider({
  children,
  repository = asyncStorageSettingsRepository,
}: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let active = true

    repository.load()
      .then(saved => {
        if (active) {
          const timezone = saved.timezone && saved.timezone !== 'local'
            ? saved.timezone
            : getDeviceTimezone()
          const newSettings = { ...DEFAULT_SETTINGS, ...saved, timezone }
          setSettings(newSettings)

          if (!saved.timezone || saved.timezone === 'local') {
            repository.save({ timezone })
          }
        }
      })
      .finally(() => {
        if (active) setHydrated(true)
      })

    return () => {
      active = false
    }
  }, [repository])

  async function setSetting<K extends SettingKey>(key: K, value: AppSettings[K]) {
    setSettings(current => ({ ...current, [key]: value }))
    await repository.save({ [key]: value })
    if (key === 'language') await changeAppLocale(value)
  }

  return (
    <SettingsContext.Provider value={{ settings, hydrated, setSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside a SettingsProvider')
  return context
}