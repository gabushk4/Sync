import { getTimeZones } from '@vvo/tzdb'
import * as Localization from 'expo-localization'

export type TimezoneOption = {
  value: string
  title: string
}

export function getDeviceTimezone(): string {
  const timezone = Localization.getCalendars()[0]?.timeZone
  return timezone && getTimeZones({ includeUtc: true }).some(item => item.name === timezone)
    ? timezone
    : 'Etc/UTC'
} 

export function getAvailableTimezones(): TimezoneOption[] {
  return getTimeZones({ includeUtc: true }).map(timeZone => ({
    value: timeZone.name,
    title: `${timeZone.alternativeName} (${timeZone.name})`,
  }))
}