const { DateTime } = require("luxon");
const { RRule, RRuleSet } = require("rrule");

function GenererOccurences(debut, fin, parents) {
  const occurences = [];
  for (const parent of parents) {
    const duree = DateTime.fromSQL(parent.fin,  {zone:'utc'}).diff(
      DateTime.fromSQL(parent.debut,  {zone:'utc'})
    );
    console.log('parent debut', parent.debut, 'fin', parent.fin, 'regle', parent.regle_recurrence)
    
    const regle = RRule.fromString(parent.regle_recurrence);
    console.log('trouver enfants entre ', debut, 'et', fin)
    const enfants = regle.between(debut.toJSDate(), fin.toJSDate(), true);
    console.log(enfants);
    const enfantsMap = enfants.map((jsDate) => {
      console.log(jsDate)
      const debutParent = DateTime.fromSQL(parent.debut,  {zone:'utc'})
      const debutOcc = DateTime.fromJSDate(jsDate, {zone:'utc'}).set({hour:debutParent.hour, minute:debutParent.minute})
      const finOcc = debutOcc.plus(duree);
      console.log('enfant debut', debutOcc, 'fin', finOcc)
      return {
        ...parent,
        debut: debutOcc.toSQL(),
        fin: finOcc.toSQL(),
      };
    });

    occurences.push(...enfantsMap);
  }
  return occurences;
}

module.exports = GenererOccurences;
