import {DateTime} from 'luxon'
import log from "./log"

/**
 * Retourne la date de maintenant selon la timezone de l'appareil
 * @returns DateTime
 */
function getNowUTC(){
    let now = new DateTime.now().toUTC() /* - (new Date().getTimezoneOffset() * 60000) */
    //log(now.hour, ':', now.minute)
  
    return now
}

function getOffsetTimezone(timeZone, date = DateTime.now()) {
  if(!date.isValid){
    log('getOffsetTimezone date n\'est pas un DateTime')
    return 0
  }    

    const dt = date.setZone(timeZone); // Convertir la date en objet Luxon et définir le fuseau horaire
    const offset = dt.offset; // Offset en minutes
    //log(`Offset pour ${timeZone} :`, offset, "minutes", 'heures', offset/60);

    return offset * 60 * 1000
}  

function getNowLocale(timezone) {
  try {
    const now = DateTime.now().setZone(timezone);
    //log('heure locale', fuseauHoraire, now.toISO());
    return now //DateTime
  } catch (error) {
    //log('erreur dans getNowLocale()', error);
    throw error;
  }
}

export {getNowUTC, getNowLocale, getOffsetTimezone}