import { DateTime } from 'luxon'

const minutesSinceStartOfDay = (dt, dayStart) =>
  Math.round(dt.diff(dayStart, 'minutes').minutes)

/**
 * Fills with 0 at busy minutes; betwwen star and end of an event
 * @param {Array} bitmap filled with 1s
 * @param {Array} events [{Event}]
 */
const applyBusyTimes = (bitmap, events, date) => {
  if (!date) return
  const dayStart = date?.startOf('day')
  const dayEnd = date?.endOf('day')

  for (const ev of events ?? []) {
    const debut = ev?.debut
    const fin = ev?.fin
    if (!debut || !fin) continue

    // L'événement ne touche pas cette journée
    if (fin.toMillis() < dayStart.toMillis() || debut.toMillis() > dayEnd.toMillis()) continue

    // Commencé avant minuit → occupé depuis 0
    const start = debut < dayStart ? 0 : minutesSinceStartOfDay(debut, dayStart)
    // Fini après cette journée → occupé jusqu'à la fin du bitmap
    const end = fin > dayEnd ? bitmap.length : minutesSinceStartOfDay(fin, dayStart)

    bitmap.fill(0, start, Math.min(end, bitmap.length))
  }
}

/**
 * 
 * @param {Array} bitmap // 1 or 0 
 * @param {Array} dndRules [{start_time (minutes):, end_time (minutes)}]
 * @param {DateTime} date 
 */
const applyDndRules = (bitmap, dndRules, date) => {
  const dayBit = 1 << (date.weekday % 7)          // 0 = dimanche
  const prevBit = 1 << ((date.weekday + 6) % 7)   // jour précédent

  for (const rule of dndRules) {
    const { start_time: start, end_time: end } = rule
    const overnight = end <= start

    if (rule.days_of_week & dayBit) {
      if (!overnight) bitmap.fill(0, start, end)
      else bitmap.fill(0, start, bitmap.length)   // soirée d'aujourd'hui
    }
    // Fin d'une règle overnight commencée hier soir
    if (overnight && (rule.days_of_week & prevBit)) {
      bitmap.fill(0, 0, end)
    }
  }
}

/**
 * 
 * @param {DateTime} date 
 * @param {number} minutes 
 * @returns 
 */
const minutesToTime = (date, minutes) => {    

  const dt = date.startOf('day').plus({minutes: minutes})
  
  return dt
}

export const getCommonFreeSlots = (
  userEvents,
  friendEvents,
  date,
  userDndRules = null,
  friendDndRules = null,
  minDuration = 60,
) => {
  if (!date) return []

  const dayStart = date.startOf('day')
  const total = Math.round(dayStart.plus({ days: 1 }).diff(dayStart, 'minutes').minutes)
  const bitmap = new Uint8Array(total).fill(1)

  // Nathan (common availabilities): today's already elapsed minutes can't be
  // offered as a new meeting slot.
  const now = DateTime.now()
  if (date?.hasSame(now, 'day')) {
    bitmap.fill(0, 0, Math.min(total, minutesSinceStartOfDay(now, dayStart)))
  }

  applyBusyTimes(bitmap, userEvents, date)
  applyBusyTimes(bitmap, friendEvents, date)

  if (userDndRules) applyDndRules(bitmap, userDndRules, date)
  if (friendDndRules) applyDndRules(bitmap, friendDndRules, date)

  const slots = []
  let start = null

  // <= total : le dernier tour ferme un créneau encore ouvert
  for (let i = 0; i <= total; i++) {
    const free = i < total && bitmap[i] === 1
    if (free) {
      if (start === null) start = i
    } else if (start !== null) {
      const duration = i - start
      if (duration >= minDuration) {
        slots.push({
          start: minutesToTime(date, start),
          end: minutesToTime(date, i),
          duration,
        })
      }
      start = null
    }
  }

  return slots
}
