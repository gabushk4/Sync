const { DateTime } = require('luxon');

/**
 * Vérifie et retourne une date au format ISO UTC valide
 * @param {string} dateStr - La date en entrée (chaîne ISO)
 * @returns {string|null} - Date ISO UTC ou null si invalide
 */
function verifierEtFormaterDateUTC(dateStr) {
  const dt = DateTime.fromSQL(dateStr, { zone: 'utc' });
  if (!dt.isValid)throw new Error(`Date passée invalide : ${dateStr}`);
  return dt.toSQL({includeOffset:false}); // ex: "2025-05-18 23:59:59"
}

function formaterDates(req, res, next){
  try {
    const {debut, fin} = req.body

    if(!debut || !fin){
      return res.status(400).json({erreur: 'données manquantes', message:'debut et fin sont requis'})
    }else if(DateTime.fromISO(fin).toMillis() < DateTime.fromISO(debut).toMillis()){
      return res.status(400).json({erreur: 'données invalides', message:'la fin de l\'évènement vient avant le début'})
    }
    
    req.debutSQL = verifierEtFormaterDateUTC(debut)
    req.finSQL = verifierEtFormaterDateUTC(fin)

    next()
  } catch (error) {
    res.status(500).json({erreur:error, message:error.message})
  } 
  
}

module.exports = {formaterDates}