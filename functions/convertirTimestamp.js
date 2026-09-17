import { DateTime } from "luxon";
import i18n from "../i18n";
import { SUPPORTED_LANGUAGES } from "../locales/config";
import log from "./log";

function getCurrentLocale() {
    const language = i18n.resolvedLanguage || i18n.language || "fr";
    return SUPPORTED_LANGUAGES[language]?.locale || "fr-CA";
}

function getDateFormat(formatKey) {
    return i18n.t(formatKey, { ns: "formats" });
}

function translateRelativeTime(key, options) {
    return i18n.t(key, { ...options, ns: "formats" });
}

/**
 *
 * @param {string || DateTime || JSDate} timestamp
 * @returns {string} month and day depending on locale
 */
function convertirTimestampDateCourte(timestamp) {
    let dateTime;
    const locale = getCurrentLocale();
    if(timestamp instanceof Date)
        dateTime = DateTime.fromJSDate(timestamp).setLocale(locale)
    else if(typeof timestamp === 'string')
        dateTime = DateTime.fromISO(timestamp).setLocale(locale)
    else if(timestamp instanceof DateTime){
        dateTime = timestamp.setLocale(locale)
    }
    else{
        log('erreur convertirTimestampDateCourte')
        return '???'
    }

    return dateTime.toFormat(getDateFormat("dateShort"));
}



function convertirTimestampDateLongue(timestamp) {
    let dateTime;
    const locale = getCurrentLocale();

    if (timestamp instanceof Date) {
        dateTime = DateTime.fromJSDate(timestamp).setLocale(locale);
    } else if (DateTime.isDateTime(timestamp)) {
        dateTime = timestamp.setLocale(locale);
    } else {
        console.warn("Timestamp n'est pas une date ou un DateTime", typeof(timestamp));
        return '???';
    }

    return dateTime.toFormat(getDateFormat("dateLong"));
}

/**
 *
 * @param {JSDate || DateTime} timestamp
 * @returns
 */
function convertirTimestampHeure(timestamp) {
    let dateTime;
    const locale = getCurrentLocale();
    if(timestamp instanceof Date)
        dateTime = DateTime.fromJSDate(timestamp).setLocale(locale)
    else if(DateTime.isDateTime(timestamp) && timestamp.isValid){
        dateTime = timestamp.setLocale(locale)
    }
    else
        return '???'

    return dateTime.toFormat(getDateFormat("time"));
}
/**
 *
 * @param {DateTime} timestamp
 */
function convertToWhen(timestamp) {
    const diff = DateTime.now().diff(timestamp, 'minutes').minutes

    switch (true) {
        case diff < 5:
            return translateRelativeTime("justNow")
        case diff < 60:
            return translateRelativeTime("minutes", { count: Math.floor(diff) })
        case diff < 60 * 3:
            return translateRelativeTime("hours", { count: Math.floor(diff / 60) })
        case diff < 60 * 24:
            return translateRelativeTime("atTime", { time: convertirTimestampHeure(timestamp) })
        case diff < 60 * 48:
            return translateRelativeTime("yesterday")
        default:
            return convertirTimestampDateCourte(timestamp)
    }
}


export { convertirTimestampDateCourte, convertirTimestampDateLongue, convertirTimestampHeure, convertToWhen };
