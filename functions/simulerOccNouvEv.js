const GenererOccurrences = require("./genererOccurences");

function simulerOccurrencesNouvelEvenement(nouvelEv, fenetreDebutSQL, fenetreFinSQL) {
  if (!nouvelEv.regle_recurrence) {
    // Cas NON récurrent → retourne juste l’event brut
    return [nouvelEv];
  }

  return GenererOccurrences(fenetreDebutSQL, fenetreFinSQL, nouvelEv);
}

module.exports = simulerOccurrencesNouvelEvenement