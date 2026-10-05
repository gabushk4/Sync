import { DateTime } from "luxon";
import i18n from "../i18n";
import { SUPPORTED_LANGUAGES } from "../locales/config";
import enFormats from "../locales/en/formats.json";
import frFormats from "../locales/fr/formats.json";
import log from "./log";

const formats = { fr: frFormats, en: enFormats };

function getCurrentLocale() {
    const language = i18n.resolvedLanguage || i18n.language || "fr";
    return SUPPORTED_LANGUAGES[language]?.locale || "fr-CA";
}

function getDateFormat(formatKey) {
    const language = i18n.resolvedLanguage || i18n.language || "fr";
    return formats[language]?.[formatKey] || formats.fr[formatKey];
}

function formatDate(dateTime, formatKey) {
    const language = i18n.resolvedLanguage || i18n.language || "fr";
    const languageFormats = formats[language] || formats.fr;
    const month = languageFormats.monthsShort[dateTime.month - 1];

    if (formatKey === "dateShort") {
        return language === "en"
            ? `${month} ${dateTime.day}`
            : `${dateTime.day} ${month}`;
    }

    const weekday = languageFormats.weekdaysShort[dateTime.weekday - 1];
    return language === "en"
        ? `${weekday}, ${month} ${dateTime.day}, ${dateTime.year}`
        : `${weekday} ${dateTime.day} ${month} ${dateTime.year}`;
}

function translateRelativeTime(key, options) {
    return i18n.t(`formats:${key}`, options);
}

function toDateTime(timestamp) {
    if (DateTime.isDateTime(timestamp)) {
        return timestamp;
    }

    if (timestamp instanceof Date) {
        return DateTime.fromJSDate(timestamp);
    }

    if (typeof timestamp === "string") {
        const fromISO = DateTime.fromISO(timestamp);
        if (fromISO.isValid) return fromISO;

        const fromSQL = DateTime.fromSQL(timestamp);
        if (fromSQL.isValid) return fromSQL;
    }

    return null;
}

/**
 *
 * @param {string || DateTime || JSDate} timestamp
 * @returns {string} month and day depending on locale
 */
function convertirTimestampDateCourte(timestamp) {
    const dateTime = toDateTime(timestamp)?.setLocale(getCurrentLocale());
    if (!dateTime?.isValid) {
        log('erreur convertirTimestampDateCourte')
        return '???'
    }

    return formatDate(dateTime, "dateShort");
}



function convertirTimestampDateLongue(timestamp) {
    const dateTime = toDateTime(timestamp)?.setLocale(getCurrentLocale());
    if (!dateTime?.isValid) {
        console.warn("Timestamp n'est pas une date ou un DateTime", typeof(timestamp));
        return '???';
    }

    return formatDate(dateTime, "dateLong");
}

/**
 *
 * @param {JSDate || DateTime} timestamp
 * @returns
 */
function convertirTimestampHeure(timestamp) {
    const dateTime = toDateTime(timestamp)?.setLocale(getCurrentLocale());
    if (!dateTime?.isValid)
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
