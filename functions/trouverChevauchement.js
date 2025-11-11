function trouverChevauchement(occurrences, debutSQL, finSQL) {
  console.log("trouver chevauchement occurences: ", occurrences, "debutSQL", debutSQL, "fiinSQL", finSQL)
  return occurrences.find(o => (o.debut < finSQL && o.fin > debutSQL)) || null;
}

module.exports = trouverChevauchement