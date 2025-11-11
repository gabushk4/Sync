let {pool} = require('../PDO')
const retourConflit  = require('./retourConflit');
const simulerOccurrencesNouvelEvenement = require('./simulerOccNouvEv');
const simulerOccurrencesParentsAvecExceptions = require('./simulerOccParentsExceptions');
const trouverChevauchement = require('./trouverChevauchement');
 
async function verifierDisponibilite(req, res, next) {
  const ev = {
    ...req.body,
    createur_id: req.membre.id,
    debut: req.debutSQL,
    fin: req.finSQL
  };

  //console.log('nouvel evenement:', ev)

  try {
    //Vérification simple : événements non récurrents
    const [simples] = await pool.query(`
      SELECT e.id_publique, e.debut, e.fin
      FROM evenements e
      LEFT JOIN participants_evenements p ON p.id_evenement = e.id
      WHERE (e.createur_id = ? OR p.id_membre = ?)
        AND e.regle_recurrence IS NULL
        AND e.debut < ?
        AND e.fin > ?
    `, [ev.createur_id, ev.createur_id, ev.fin, ev.debut]);

    if (simples.length > 0) {
      return retourConflit(res, simples[0]);
    }

    //Charger les parents récurrents
    const [parents] = await pool.query(`
      SELECT id, id_publique, debut, fin, regle_recurrence
      FROM evenements
      WHERE createur_id = ?
        AND regle_recurrence IS NOT NULL
        AND debut <= ?
    `, [ev.createur_id, ev.fin]);

    //console.log('verifier dispo parents', parents)

    //Charger leurs exceptions
    const parentIds = parents.map(p => p.id);
    const [exceptions] = parentIds.length === 0 
      ? [[]] 
      : await pool.query(`
          SELECT *
          FROM evenements_exceptions
          WHERE id_parent IN (${parentIds.map(() => '?').join(',')}) 
        `, parentIds);
    //console.log('verifier dispo exceptions: ', exceptions)

    //Définir fenêtre de génération
    const fenetreDebut = ev.debut;
    const fenetreFin = ev.fin;

    //Générer occurrences parents et appliquer exceptions
    const occParents = simulerOccurrencesParentsAvecExceptions(parents, fenetreDebut, fenetreFin, exceptions);

    //console.log("verifier dispo occParents:", occParents)
    // Vérifier conflit même si le nouvel événement n’est pas récurrent
    let conflit = trouverChevauchement(occParents, ev.debut, ev.fin);
    if (conflit) return retourConflit(res, conflit);

    // 7) Si le nouvel événement est récurrent, générer ses occurrences et vérifier chevauchement
    if (ev.regle_recurrence) {
      const occNew = simulerOccurrencesNouvelEvenement(ev, fenetreDebut, fenetreFin);
      conflit = trouverChevauchement([...occParents, ...occNew], ev.debut, ev.fin);
      if (conflit) return retourConflit(res, conflit);
    }

    return next();
  } catch (err) {
    return res.status(500).json({ erreur: err.message });
  }
}
module.exports = {verifierDisponibilite}