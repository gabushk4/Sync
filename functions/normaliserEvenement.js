export default function normaliserNouvelEvenement(body, membreId, debutSQL, finSQL) {
  return {
    id: null, // pas encore en DB
    id_publique: null, // sera généré plus tard
    createur_id: membreId,
    titre: body.titre || null,
    description: body.description || null,
    prive: body.prive !== undefined ? body.prive : true,
    regle_recurrence: body.regle_recurrence || null,
    debut: debutSQL,
    fin: finSQL,
    exceptions: body.exceptions || [] // si jamais tu permets de créer des exceptions dès la création
  };
}