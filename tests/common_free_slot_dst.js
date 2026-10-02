import assert from 'node:assert/strict'
import { DateTime } from 'luxon'
import { getCommonFreeSlots } from '../functions/availability.js'

const zone = 'America/Montreal'
const fmt = s => `${s.start.toFormat('HH:mm')} → ${s.end.toFormat('HH:mm')} (${s.duration} min)`

// Jour de changement d'heure : 25 h
{
  const d = DateTime.fromISO('2026-11-01T00:00:00', { zone })
  const ev = [{
    debut: DateTime.fromISO('2026-11-01T14:00:00', { zone }),
    fin:   DateTime.fromISO('2026-11-01T15:00:00', { zone }),
  }]
  const slots = getCommonFreeSlots(ev, [], d)
  console.log('DST    ', slots.map(fmt))
  assert.equal(slots.length, 2)
  assert.equal(slots[0].end.toFormat('HH:mm'), '14:00')
  assert.equal(slots[1].start.toFormat('HH:mm'), '15:00')
  assert.equal(slots[0].duration, 900)
  assert.equal(slots[1].duration, 540)
}

// Jour normal sans événement : un seul créneau de 24 h
{
  const d = DateTime.fromISO('2026-10-01T00:00:00', { zone })
  const slots = getCommonFreeSlots([], [], d)
  assert.equal(slots.length, 1)
  assert.equal(slots[0].duration, 1440)
  assert.equal(slots[0].start.toISODate(), '2026-10-01')   // attrape le bug de minutesToTime
}

// Événement de la veille : doit être ignoré
{
  const d = DateTime.fromISO('2026-10-02T00:00:00', { zone })
  const ev = [{
    debut: DateTime.fromISO('2026-10-01T10:00:00', { zone }),
    fin:   DateTime.fromISO('2026-10-01T11:00:00', { zone }),
  }]
  const slots = getCommonFreeSlots(ev, [], d)
  assert.equal(slots.length, 1)
  assert.equal(slots[0].duration, 1440)
}

console.log('OK')