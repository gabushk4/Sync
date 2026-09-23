// TODO: functions/settingsStorage, functions/timezones and types/settings don't exist yet.
// Real implementation commented out until those files are created.
// import { asyncStorageSettingsRepository } from '@/functions/settingsStorage'
// import { getDeviceTimezone } from '@/functions/timezones'
// import { changeAppLocale } from '@/locales/initLocale'
// import {
//     AppSettings,
//     DEFAULT_SETTINGS,
//     SettingKey,
//     SettingsRepository,
// } from '@/types/settings'
import { DEFAULT_LANGUAGE } from '@/locales/config'
import { ReactNode, createContext, useContext } from 'react'

type AppSettings = {
  language: string
  timezone: string
}

type SettingsContextValue = {
  settings: AppSettings
  hydrated: boolean
  setSetting: (key: keyof AppSettings, value: string) => Promise<void>
}

const DEFAULT_SETTINGS: AppSettings = {
  language: DEFAULT_LANGUAGE,
  timezone: 'local',
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

type SettingsProviderProps = {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  // TODO: replace with the real implementation (persistence + timezone) once
  // functions/settingsStorage, functions/timezones and types/settings are created.
  const value: SettingsContextValue = {
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    setSetting: async () => {},
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

/* export function SettingsProvider({
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
} */

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside a SettingsProvider')
  return context
}
