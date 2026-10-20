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
    // un jour férié ne rend pas la personne occupée
    if (ev?.jour_ferie) continue
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

/**
 * Free slots shared by the member and a friend on `date`: the minutes where
 * neither has an event (nor a do-not-disturb rule), grouped into slots of at
 * least `minDuration` minutes.
 *
 * @author Philip — rectification for a more conventional display: today's elapsed hours are kept, marked
 *   `passe` (shown greyed out) instead of disappearing; a slot crossing the
 *   current hour is split in two
 * @param {Array} userEvents - Member's events (local DateTimes).
 * @param {Array} friendEvents - Friend's events (local DateTimes).
 * @param {DateTime} date - Day to compute.
 * @param {Array | null} [userDndRules] - Member's do-not-disturb rules.
 * @param {Array | null} [friendDndRules] - Friend's do-not-disturb rules.
 * @param {number} [minDuration=60] - Shortest slot kept, in minutes.
 * @returns {Array<{ start: DateTime, end: DateTime, duration: number, passe?: boolean }>}
 */
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

  // Today: the hours already elapsed (before the current hour, which stays
  // bookable) are kept but marked `passe`, so they show greyed out instead of
  // disappearing. A slot crossing that limit is split in two.
  const now = DateTime.now()
  if (!date.hasSame(now, 'day')) return slots

  const coupure = minutesSinceStartOfDay(now.startOf('hour'), dayStart)
  const MIN_MORCEAU = 15 // a past / current piece shorter than this isn't worth a block
  const resultat = []
  for (const slot of slots) {
    const debut = minutesSinceStartOfDay(slot.start, dayStart)
    const fin = debut + slot.duration
    if (fin <= coupure) {
      resultat.push({ ...slot, passe: true })
    } else if (debut >= coupure) {
      resultat.push(slot)
    } else {
      if (coupure - debut >= MIN_MORCEAU)
        resultat.push({ start: slot.start, end: minutesToTime(date, coupure), duration: coupure - debut, passe: true })
      if (fin - coupure >= MIN_MORCEAU)
        resultat.push({ start: minutesToTime(date, coupure), end: slot.end, duration: fin - coupure })
    }
  }
  return resultat
}

/**
 * Shared availability over the already-loaded sliding window (seven days on
 * the home timeline). This is intentionally bounded: for a window from Oct 14
 * through Oct 20, compute Oct 14 00:00 up to Oct 21 00:00, even when the member
 * is viewing Oct 16. Adjacent daily slots are joined across midnight so the
 * timeline presents one continuous selectable range.
 */
export const getCommonFreeSlotsSurPlage = (
  userEvents,
  friendEvents,
  debut,
  nombreJours = 7,
  userDndRules = null,
  friendDndRules = null,
  minDuration = 60,
) => {
  const slots = Array.from({ length: nombreJours }, (_, index) =>
    getCommonFreeSlots(
      userEvents,
      friendEvents,
      debut.plus({ days: index }),
      userDndRules,
      friendDndRules,
      minDuration,
    )
  ).flat().sort((a, b) => a.start.toMillis() - b.start.toMillis())
  const maintenant = DateTime.now()

  return slots.reduce((fusionnes, slot) => {
    const precedent = fusionnes[fusionnes.length - 1]
    const slotPasse = Boolean(slot.passe) || slot.end <= maintenant
    const precedentPasse = Boolean(precedent?.passe) || Boolean(precedent && precedent.end <= maintenant)
    if (precedent && precedent.end.toMillis() === slot.start.toMillis()
        && precedentPasse === slotPasse) {
      precedent.end = slot.end
      precedent.duration += slot.duration
      if (slotPasse) precedent.passe = true
    } else {
      fusionnes.push({ ...slot, ...(slotPasse ? { passe: true } : {}) })
    }
    return fusionnes
  }, [])
}
