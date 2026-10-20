import { DateTime } from 'luxon';
import { calculerTrous } from '../functions/trousHoraire';
import { heuresVersDate, positionHeures } from '../functions/positionTimeline';

const zone = 'America/Montreal';
const d = (iso) => DateTime.fromISO(iso, { zone });

describe('calculerTrous', () => {
  const debut = d('2026-10-20T00:00:00');
  const fin = debut.plus({ days: 1 });
  const passe = d('2026-10-19T00:00:00');

  test('events fusionnes : trous autour', () => {
    const ev = [
      { debut: d('2026-10-20T09:00'), fin: d('2026-10-20T11:00') },
      { debut: d('2026-10-20T10:00'), fin: d('2026-10-20T12:00') },
    ];
    const trous = calculerTrous(ev, debut, fin, passe);
    expect(trous.map((t) => [t.debut.toFormat('HH:mm'), t.fin.toFormat('HH:mm'), t.passe]))
      .toEqual([['00:00', '09:00', false], ['12:00', '00:00', false]]);
  });

  test('trou coupe a maintenant', () => {
    const trous = calculerTrous([], debut, fin, d('2026-10-20T14:30'));
    expect(trous).toHaveLength(2);
    expect(trous[0].passe).toBe(true);
    expect(trous[1].debut.toFormat('HH:mm')).toBe('14:30');
    expect(trous[1].passe).toBe(false);
  });
});

describe('heuresVersDate', () => {
  const debut = d('2026-10-20T00:00:00');
  test('arrondi 15 min et jour suivant', () => {
    expect(heuresVersDate(21.12, debut, 'floor').toFormat('dd HH:mm')).toBe('20 21:00');
    expect(heuresVersDate(24 + 23.1, debut, 'round').toFormat('dd HH:mm')).toBe('21 23:00');
  });
  test('inverse de positionHeures', () => {
    const date = d('2026-10-22T07:45');
    expect(heuresVersDate(positionHeures(date, debut), debut).toISO()).toBe(date.toISO());
  });
});
