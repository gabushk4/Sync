const fs = require("fs");
const pool = require("../db");

module.exports = async function verifierQuota(req, res, next) {
  try {
    if (!req.file) return next(); // pas de fichier → rien à vérifier

    const id = req.params.idmembre_publique;
    const [rows] = await pool.query(
      "SELECT espace_utilise, quota_max FROM membres WHERE id_publique = ?",
      [id]
    );

    if (!rows.length) {
      fs.unlinkSync(req.file.path); // supprimer le fichier déjà uploadé
      return res.status(404).json({ message: "Membre introuvable" });
    }

    const { stockage_utilise, limite_stockage } = rows[0];

    if (stockage_utilise + req.file.size > limite_stockage) {
      fs.unlinkSync(req.file.path); // supprimer l’upload
      return res.status(403).json({ message: "Quota dépassé" });
    }

    next();
  } catch (err) {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    res.status(500).json({
      message: "Erreur lors de la vérification du quota",
      erreur: err.message,
    });
  }
};