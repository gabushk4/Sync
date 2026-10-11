import { DateTime } from 'luxon';

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

function convertUTCToLocal(dateUTC: string | DateTime, timezone = 'local'): DateTime {
    if (!dateUTC) {
        throw new Error('convertUTCToLocal: dateUTC est undefined')
    }

    let dt: DateTime

    if (typeof dateUTC === 'string') {
        dt = DateTime.fromISO(dateUTC, { zone: 'utc' })
        if (!dt.isValid) {
            dt = DateTime.fromSQL(dateUTC, { zone: 'utc' })
        }
    } else if (DateTime.isDateTime(dateUTC)) {
        dt = dateUTC.setZone('utc')
    } else {
        throw new Error('convertUTCToLocal: type de dateUTC inattendu')
    }

    if (!dt.isValid) {
        throw new Error(`convertUTCToLocal: date invalide (${dt.invalidReason}: ${dt.invalidExplanation})`)
    }

    return dt.setZone(timezone)
}

function convertLocalToUTC(dateLocale: string | DateTime | undefined): DateTime {
    if (!dateLocale) throw new Error("convertLocalToUTC: date locale est undefined")

    let dt: DateTime

    if (typeof dateLocale === 'string') {
        dt = DateTime.fromSQL(dateLocale)
        if (!dt.isValid) {
            dt = DateTime.fromISO(dateLocale)
        }
    } else {
        dt = dateLocale
    }

    if (!dt.isValid) {
        throw new Error(`convertLocalToUTC: date invalide (${dt.invalidReason}: ${dt.invalidExplanation})`)
    }

    return dt.toUTC()
}

export { convertLocalToUTC, convertUTCToLocal };

