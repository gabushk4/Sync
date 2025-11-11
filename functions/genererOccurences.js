const { DateTime } = require("luxon");
const { RRule } = require("rrule");

function GenererOccurrences(debut, fin, parents) {
  const occurences = [];
  for (const parent of parents) {
    const duree = DateTime.fromSQL(parent.fin,  {zone:'utc'}).diff(
      DateTime.fromSQL(parent.debut,  {zone:'utc'})
    );
    //console.log('parent debut', parent.debut, 'fin', parent.fin, 'regle', parent.regle_recurrence, 'duree', duree)
    
    const regle = RRule.fromString(parent.regle_recurrence);
    //console.log('GenererOccurrences trouver enfants entre ', debut, 'et', fin)
    const enfants = regle.between(debut.toJSDate(), fin.toJSDate(), true);
    //console.log('GenererOccurrences enfants', enfants);
    const enfantsMap = enfants.map((jsDate) => {
      //console.log(jsDate)
      const debutParent = DateTime.fromSQL(parent.debut,  {zone:'utc'})
      const debutOcc = DateTime.fromJSDate(jsDate, {zone:'utc'}).set({hour:debutParent.hour, minute:debutParent.minute})
      const finOcc = debutOcc.plus(duree);
      //console.log('enfant debut', debutOcc, 'fin', finOcc)
      return {
        ...parent,
        debut: debutOcc.toFormat('yyyy-MM-dd HH:mm:ss'),
        fin: finOcc.toFormat('yyyy-MM-dd HH:mm:ss'),
        type:'recurrence',
        string:`evenements/recurrences/${parent.id_publique}`        
      };
    });
    
    occurences.push(...enfantsMap);
  }  
  return occurences;
}

module.exports = GenererOccurrences;
