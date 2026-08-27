import { DateTime } from 'luxon';
import log from './log';

/* function convertirUTCversLocale(dateUTC, timezone){
  //log('convertirUTCversLocale: dateUTC', dateUTC, 'timezone', timezone)

  const dtLocal = DateTime.fromISO(dateUTC, { zone: 'utc' }).setZone(timezone);
  
  //log('dateLocale ISO', dtLocal.toISO());

  return dtLocal; // Retourne un DateTime
}

function convertirLocalVersUTC(dateLocale,){
    //log('convertirLocalversUTC: dateLocal', dateLocale,)

    const dateUTC = dateLocale.toUTC() 

    //log('dateUTC', DateTime.fromJSDate(dateUTC).toISO())

    return dateUTC //retourne un DateTime
} */

function convertirUTCversLocale(dateUTC: string | DateTime, timezone = 'local') : DateTime | undefined {
  if (!dateUTC) {
    log('DateUTC est undefined:', dateUTC)
    throw Error('convertirUTCversLocale: DateUTC est undefined')
  }
  let dt: DateTime | null = null;

  if (typeof dateUTC === 'string') {
    dt = DateTime.fromISO(dateUTC, { zone:'utc' });
    if(!dt.isValid)
      dt = DateTime.fromSQL(dateUTC, {zone: 'utc'})
  } else if (DateTime.isDateTime(dateUTC)) {
    dt = dateUTC.setZone('utc');
  } else if (dateUTC instanceof Date) {
    dt = DateTime.fromJSDate(dateUTC, { zone: 'utc' });
  } else {
    console.warn("convertirUTCversLocale: type de dateUTC inattendu", typeof dateUTC);
    throw Error('convertirUTCversLocale: type de dateUTC inattendu')
  }

  const dtLocale = dt.setZone(timezone)

  //log('convertirUTCversLocale: dateUTC', dt, 'timezone', timezone, 'dtLocal', dtLocale)

  return dtLocale
}

function convertirLocalVersUTC(dateLocale: string | DateTime | undefined) {
  let dt: DateTime | string | undefined = dateLocale;
  if (!dateLocale) throw "convertirLocalVersUTC date locale est undefined";

  if(typeof dateLocale == 'string'){
    dt = DateTime.fromSQL(dateLocale)
    if(!DateTime.isDateTime(dt))
      dt = DateTime.fromISO(dateLocale)
  }
  if(DateTime.isDateTime(dt))
    return dt.toUTC();
  
  return null
}

export {convertirUTCversLocale, convertirLocalVersUTC}