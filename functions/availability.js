import { DateTime } from 'luxon'
import log from '@/functions/log'

const dateToMinutes = (datetime) => {

    let minutes = datetime?.hour * 60 + datetime?.minute
    //log("date (dt)", datetime, 'minutes', minutes)
    return minutes
}

const MINUTES = 24 * 60

/**
 * Fills with 0 at busy minutes; betwwen star and end of an event
 * @param {Array} bitmap filled with 1s
 * @param {Array} events [{Event}]
 */
const MINUTES_PER_DAY = 1440

const applyBusyTimes = (bitmap, events, date) => {
  const dayStart = date?.startOf('day')
  const dayEnd = date?.endOf('day')

  events.forEach(ev => {
    const debut = ev.debut
    const fin = ev.fin
    if (!debut || !fin) return

    // L'événement ne touche pas cette journée du tout → on l'ignore
    if (fin < dayStart || debut > dayEnd) return

    // Si l'événement a commencé avant minuit → occupé depuis 00:00
    const start = debut < dayStart ? 0 : dateToMinutes(debut)
    // Si l'événement se termine après cette journée → occupé jusqu'à minuit (1440)
    const end = fin > dayEnd ? MINUTES_PER_DAY : dateToMinutes(fin)

    bitmap.fill(0, start, Math.min(end, bitmap.length))
  })
}

/**
 * 
 * @param {Array} bitmap // 1 or 0 
 * @param {Array} dndRules [{start_time (minutes):, end_time (minutes)}]
 * @param {DateTime} date 
 */
const applyDndRules = (bitmap, dndRules, date) => {
  const dayBit = 1 << date.weekday % 7 // 0=Dim, 1=Lun...

  dndRules.forEach(rule => {
    if ((rule.days_of_week & dayBit) === 0) return // pas actif ce jour

    const start = rule.start_time // in minutes
    const end   = rule.end_time // in minutes

    if (end > start) {
      // Règle normale ex: 9h → 17h
      bitmap.fill(0, start, end)
    } else {
      // Règle overnight ex: 23h → 7h
      bitmap.fill(0, start, 1440)
      bitmap.fill(0, 0, end)
    }
  })
}

/**
 * 
 * @param {DateTime} date 
 * @param {number} minutes 
 * @returns 
 */
const minutesToTime = (date, minutes) => {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60

    const dt = DateTime.now().set({ day: date.day, hour: hour, minute: minute })
    
    return dt
}

export const getCommonFreeSlots = (
    userEvents,
    friendEvents,
    date,
    userDndRules  = null, // Soon to be 
    friendDndRules = null, // Soon to be
    minDuration = 60,  
) => {
  const bitmap = new Uint8Array(MINUTES).fill(1) // Filled with free times (1)

  // Events busy times
  applyBusyTimes(bitmap, userEvents, date) 
  applyBusyTimes(bitmap, friendEvents, date)

  // Do Not Disturb rules 
  if (userDndRules)   applyDndRules(bitmap, userDndRules, date)
  if (friendDndRules) applyDndRules(bitmap, friendDndRules, date)

  // lets find blob >= minDuration
  const slots = []
  let start = null
  let count = 0

  for (let i = 0; i < bitmap.length; i++) {
    if (bitmap[i] === 1 && i < bitmap.length - 1) {
      if (start === null) start = i
      count++
    } else { //encountered 0 now lets see if the slot is valid
      if (count >= minDuration) {
          //slot is long enough now lets push this availabilty
        slots.push({
            start: minutesToTime(date, start),
            end:   minutesToTime(date, start + count),
            duration: count,
        })
      }
      start = null
      count = 0
    }
  }
  //log('bitmap', bitmap)

  return slots
}