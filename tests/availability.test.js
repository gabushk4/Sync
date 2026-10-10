import { DateTime } from 'luxon';
import { getCommonFreeSlots } from '../functions/availability.js';

const zone = 'America/Montreal';

describe('getCommonFreeSlots', () => {
  test('jour de changement heure (25 h) : 2 creneaux autour evenement', () => {
    const d = DateTime.fromISO('2026-11-01T00:00:00', { zone });
    const ev = [
      {
        debut: DateTime.fromISO('2026-11-01T14:00:00', { zone }),
        fin: DateTime.fromISO('2026-11-01T15:00:00', { zone }),
      },
    ];
    const slots = getCommonFreeSlots(ev, [], d);
    expect(slots).toHaveLength(2);
    expect(slots[0].end.toFormat('HH:mm')).toBe('14:00');
    expect(slots[1].start.toFormat('HH:mm')).toBe('15:00');
    expect(slots[0].duration).toBe(900);
    expect(slots[1].duration).toBe(540);
  });

  test('jour normal sans evenement : un seul creneau de 24 h', () => {
    const d = DateTime.fromISO('2026-10-01T00:00:00', { zone });
    const slots = getCommonFreeSlots([], [], d);
    expect(slots).toHaveLength(1);
    expect(slots[0].duration).toBe(1440);
    expect(slots[0].start.toISODate()).toBe('2026-10-01');
  });

  test('evenement de la veille : ignore', () => {
    const d = DateTime.fromISO('2026-10-02T00:00:00', { zone });
    const ev = [
      {
        debut: DateTime.fromISO('2026-10-01T10:00:00', { zone }),
        fin: DateTime.fromISO('2026-10-01T11:00:00', { zone }),
      },
    ];
    const slots = getCommonFreeSlots(ev, [], d);
    expect(slots).toHaveLength(1);
    expect(slots[0].duration).toBe(1440);
  });
});
