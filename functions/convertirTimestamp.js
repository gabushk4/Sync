import { DateTime } from "luxon";
import { Platform } from "react-native";
import log from "./log";

function customToFormat(dt, format){

    if(Platform.OS !== 'ios'){
        return dt.toFormat(format)
    }

    const moisAbr = [
        'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
        'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
    ]

    switch(format){
        case 'ccc d LLL yyyy':
            return `${dt.weekdayShort}. ${dt.day} ${moisAbr[dt.month-1]} ${dt.year}`
        case 'd LLL':
            return `${dt.day} ${moisAbr[dt.month-1]}`
        default:
            log('erreur customToFormat')
            return `1er janv. 1970`
    }
}

/**
 * 
 * @param {string || DateTime || JSDate} timestamp 
 * @returns {string} jour mois (19 fev.)
 */
function convertirTimestampDateCourte(timestamp) {
    //log('timestamp', timestamp)
    let dateTime;
    if(timestamp instanceof Date)
        dateTime = DateTime.fromJSDate(timestamp).setLocale('fr')
    else if(typeof timestamp === 'string')
        dateTime = DateTime.fromISO(timestamp).setLocale('fr')
    else if(timestamp instanceof DateTime){
        dateTime = timestamp.setLocale('fr')
    }    
    else{ 
        log('erreur convertirTimestampDateCourte')
        return '???'
    }
    
    return customToFormat(dateTime, 'd LLL');
}



function convertirTimestampDateLongue(timestamp) {
    let dateTime;

    if (timestamp instanceof Date) {
        dateTime = DateTime.fromJSDate(timestamp).setLocale('fr');
    } else if (DateTime.isDateTime(timestamp)) {
        dateTime = timestamp.setLocale('fr-CA');
    } else {
        console.warn("Timestamp n'est pas une date ou un DateTime", typeof(timestamp));
        return '???';
    }

    //log("Formatage :", dateTime.toFormat("ccc d LLL yyyy"), "| isValid:", dateTime.isValid, "| locale:", dateTime.locale);

    //log("monthLong:", dateTime.monthShort, "| monthShort:", dateTime.toFormat("LLL"));

    const format = Platform.OS === 'android' ? 'ccc d LLL yyyy' : 'ccc. d LLL yyyy'

    return customToFormat(dateTime, 'ccc d LLL yyyy'); 
    // Exemple : "lun. 3 juin 2024"
}

/**
 * 
 * @param {JSDate || DateTime} timestamp 
 * @returns 
 */
function convertirTimestampHeure(timestamp) {
    let dateTime;
    if(timestamp instanceof Date)
        dateTime = DateTime.fromJSDate(timestamp).setLocale('fr')
    else if(DateTime.isDateTime(timestamp) && timestamp.isValid){
        dateTime = timestamp.setLocale('fr')     
    }
    else
        return '???'

    const heures = dateTime.toFormat('HH');
    const minutes = dateTime.toFormat('mm');
    //log('DateTime', dateTime.toISO(), '→ heure', heures, ':', minutes);

    return `${heures}:${minutes}`;
}
/**
 * 
 * @param {DateTime} timestamp 
 */
function convertirTimestampQuand(timestamp) {
    const diff = DateTime.now().diff(timestamp, 'minutes').minutes
    
    switch (true) {
        case diff < 5:
            return "à l'instant"
        case diff < 60:            
            return `il y a ${Math.floor(diff)} minutes`
        case diff < 60 * 3:
            return `il y a ${Math.floor(diff/60)} heures`
        case diff < 60 * 24:
            return `à ${convertirTimestampHeure(timestamp)}`
        case diff < 60 * 48:
            return `hier`
        default:
            return convertirTimestampDateCourte(timestamp)
    }
}


export {convertirTimestampDateCourte, convertirTimestampDateLongue, convertirTimestampHeure, convertirTimestampQuand}
    