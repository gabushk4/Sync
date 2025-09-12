//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fs = require('fs')

//fonctions
const { generateSalt, hash, compare } = require("../../functions/pass");
const { generateIdWithQueue } = require("../../functions/idGen");
require("dotenv").config();
const { authentifierToken } = require("../../functions/authenticate");
const FactoriserTimestamp = require("../../functions/factoriserTimestamp");
const verifierPseudo = require("../../functions/verifierPseudo");
const {upload, uploadDir} = require('../../functions/upload')

//PDO
let { pool } = require("../../PDO");
const { formaterDateVersClient } = require("../../functions/formaterDateVersClient");
const { DateTime } = require("luxon");

//Pour developpement seulement
/* router.get("/", async (req, res, next) => {
  var sql = "SELECT * FROM membres";
  
  try {
    const [resultats] = await pool.query(sql)
    const membres = resultats.map((r) => {
        const date = new Date(r.temps_creation / 1)
        return {
          id_membre: r.id,
          pseudo: r.pseudo,
          telephone: r.telephone,
          fp_url: r.fp_url, 
          temps_creation: date.toLocaleString()
        }
    })
    res.status(200).json({
      compte: resultats.length,
      membres
     })
  } catch (err) {
    res.status(500).json({
      message: 'Une erreur au niveau de la base de donnée est survenue',
      erreur: err.message
    })
  }
  
})  */

router.post("/connexion", async (req, res, next) => {
  let sqlMdp = `
    SELECT mot_de_passe, salt  
      FROM membres m 
      INNER JOIN mot_de_passes mp 
        ON m.id = mp.id_membre
      WHERE m.id = ?
  `;
  let sqlPseudo = `
    SELECT id_publique, id FROM membres WHERE pseudo = ?
  `;
  const pseudo = req.body.pseudo;
  const mdp = req.body.mot_de_passe;
  try {
    const [resultatPseudo] = await pool.query(sqlPseudo, [pseudo]);
    if (resultatPseudo.length < 1)
      return res.status(401).json({ message: "Authentification échouée" });
    const idMembre = resultatPseudo[0].id;
    const idPublique = resultatPseudo[0].id_publique;

    const [resultatMdp] = await pool.query(sqlMdp, [idMembre]);
    const hash = {
      hashedPass: resultatMdp[0].mot_de_passe,
      salt: resultatMdp[0].salt,
    };
    if (!compare(mdp, hash))
      return res.status(401).json({ message: "Authentification échouée" });

    const membre = {
      id: idMembre,
      pseudo: pseudo,
    };
    //Changer le expires in et ajouter un refresh token
    const accessToken = jwt.sign(membre, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      cacheable: true,
      access_token: accessToken,
      timestamp_serveur: Date.now(),
      membre: {
        pseudo: membre.pseudo,
        id_publique: idPublique,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.post("/inscription", verifierPseudo, async (req, res, next) => {
  try {
    let idmembre = await generateIdWithQueue(10, true, true);
    let idPublique = await generateIdWithQueue(
      8,
      false,
      true,
      "M" + req.body.pseudo.substring(0, 3)
    );
    let salt = generateSalt(14);
    console.log("body", req.body);
    let { hashedPass: mdpHash } = hash(req.body.mot_de_passe, salt);
    let date = new Date(Date.now());

    let temps_creation = FactoriserTimestamp(date.toISOString());

    if (temps_creation == undefined)
      res
        .send(500)
        .json({ message: "incapable de générer un timestamp de création" });

    //verification du pseudo

    // Sauvegarde du membre
    var sql =
      "INSERT INTO membres (id, id_publique, pseudo, mot_de_passe, courriel, temps_creation, fuseau_horaire) VALUES (?, ?, ?, ?, ?, ?, ?)";
    await pool.query(sql, [
      idmembre,
      idPublique,
      req.body.pseudo,
      mdpHash,
      req.body.courriel,
      temps_creation,
      req.body.fuseau_horaire,
    ]);

    // Sauvegarde du salt
    sql = "INSERT INTO mot_de_passes (id_membre, salt) VALUES (?, ?)";
    await pool.query(sql, [idmembre, salt]);

    // Querie pour reponse
    res.status(201).json({
      message: "Membre créé",
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.get("/", authentifierToken, async (req, res) => {
  const id = req.membre.id;
  console.log('id_prive', id)
  var sql = `SELECT id_publique, pseudo, bio, courriel, i.url, temps_creation 
    FROM membres m 
      LEFT JOIN images i ON i.id = m.id_fp 
    WHERE m.id = ?`;
  try {
    const [resultat] = await pool.query(sql, [id]);

    if (resultat.length < 1) {
      return res.status(404).json({
        message: `Rien n'a été trouvé avec le id: ${id}`,
      });
    }

    const r = resultat[0];
    return res.status(200).json({
      id_publique: r.id_publique,
      pseudo: r.pseudo,
      bio:r.bio,
      courriel: r.courriel,
      fp_url: r.url,
      temps_creation: formaterDateVersClient(r.temps_creation),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.get("/fuseau_horaire", authentifierToken, async (req, res) => {
  const idMembre = req.membre.id;
  try {
    const [resultats] = await pool.query(
      `SELECT fuseau_horaire FROM membres WHERE id = ?`,
      [idMembre]
    );

    console.log("/fuseau_horaire", resultats);

    if (resultats.length === 0) {
      return res
        .status(404)
        .json({ message: `membre introuvable avec le id ${idMembre}` });
    }

    return res
      .status(200)
      .json({ fuseau_horaire: resultats[0].fuseau_horaire });
  } catch (err) {
    console.error("/fuseau_horaire", err.message);
    return res.status(500).json({ erreur: err, message: err.message });
  }
});

// PUT /fuseau_horaire → modifier le timezone du membre
router.put("/fuseau_horaire", authentifierToken, async (req, res) => {
  const membreId = req.membre.id;
  const { fuseau_horaire } = req.body;

  if (!fuseau_horaire) {
    return res.status(400).json({ erreur: "Fuseau horaire requis" });
  }

  try {
    await pool.query("UPDATE membres SET fuseau_horaire = ? WHERE id = ?", [
      fuseau_horaire,
      membreId,
    ]);

    res.status(201).json({ message: "Fuseau horaire mis à jour avec succès" });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});

router.get("/:idmembre_publique", authentifierToken, async (req, res) => {
  try {
    const idMembrePublique = req.params.idmembre_publique;

    // Vérification que l'ID est fourni
    if (!idMembrePublique) {
      return res.status(400).json({ message: "ID du membre manquant" });
    }

    // Requête SQL pour récupérer les infos du membre
    const sql =
      "SELECT pseudo, temps_creation, fuseau_horaire FROM membres WHERE id_publique = ?";
    const [resultat] = await pool.query(sql, [idMembrePublique]);

    if (resultat.length === 0) {
      return res
        .status(404)
        .json({ message: `rien a été trouvé avec le id ${idMembrePublique}` });
    }

    const membre = resultat[0];

    // Réponse avec les données trouvées
    res.status(200).json({
      id_publique: idMembrePublique,
      pseudo: membre.pseudo,
      bio: membre.bio,
      widgets: [],
      temps_creation: formaterDateVersClient(membre.temps_creation),
      fuseau_horaire: membre.fuseau_horaire,
    });
    
  } catch (err) {
    res.status(500).json({
      message: "Une erreur est survenue lors de la récupération du membre",
      erreur: err.message,
    });
  }
});

router.patch( '/:idmembre_publique', verifierPseudo, authentifierToken, (req, res, next) => {
    // Wrapper multer pour capturer les erreurs
    upload.single('image')(req, res, function (err) {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  async (req, res) => {
    const idPubliqueMembre = req.params.idmembre_publique;
    const updates = { ...req.body };

    try {
      // --- Gestion mot de passe ---
      if (updates.mot_de_passe) {
        const mdp = updates.mot_de_passe;
        const salt = generateSalt(14);
        const { hashedPass: mdpHash } = hash(mdp, salt);
        updates.mot_de_passe = mdpHash;

        await pool.query(
          `UPDATE mot_de_passes SET salt = ? WHERE id_membre = (SELECT id FROM membres WHERE id_publique = ?)`,
          [salt, idPubliqueMembre]
        );
      }

      // --- Gestion image ---
      if (req.file) {
        console.log('file détectée')
        const nouvEspace = req.file.size
        let diff = nouvEspace

        // 1. Récupérer l’ancienne image (id + url)
        const [rows] = await pool.query(`
          SELECT i.id, i.url
          FROM images i
          INNER JOIN membres m ON m.id_fp = i.id
          WHERE m.id_publique = ?
        `, [idPubliqueMembre]);

        const ancIdImage = rows[0]?.id
        const ancUrl = rows[0]?.url

        if (ancUrl) {
          const imageAnc = ancUrl.substring(ancUrl.indexOf('/')+1)
          const path = `${uploadDir}${imageAnc}`

          if (fs.existsSync(path)) {
            const ancEspace = fs.statSync(path).size
            diff = nouvEspace - ancEspace
            fs.unlinkSync(path)
          }

          // Supprimer l'ancienne entrée dans `images`
          await pool.query(`DELETE FROM images WHERE id = ?`, [ancIdImage])
        }

        // 2. Insérer la nouvelle image dans `images`
        const newId = await generateIdWithQueue(10, true, true, 'I')
        const newUrl = `/img/${req.file.filename}`
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          await conn.query(`INSERT INTO images (id, url) VALUES (?, ?)`, [newId, newUrl]);
          await conn.query(
            `UPDATE membres SET stockage_utilise = stockage_utilise + ? WHERE id_publique = ?`,
            [diff, idPubliqueMembre]
          );
          updates.id_fp = newId
          await conn.commit();
        } catch (err) {
          await conn.rollback(); // tout est annulé si erreur
          throw err;
        } finally {
          conn.release();
        }
      }

      // --- Aucun champ à mettre à jour ? ---
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Aucun champ à mettre à jour" });
      }

      // --- Mise à jour DB ---
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), idPubliqueMembre];
      console.log('fields', fields, 'values', values)
      await pool.query(`UPDATE membres SET ${fields} WHERE id_publique = ?`, values);

      return res.status(201).json({
        message: "Membre mis à jour",
        mises_à_jours: updates
      });

    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: "Erreur serveur lors de la mise à jour du membre",
        erreur: err.message,
      });
    }
  }
);

router.delete("/:idmembre_publique", async (req, res) => {
  const id = req.params.idmembre_publique;
  var sql = "DELETE FROM membres WHERE id_publique = ?";

  try {
    await pool.query(sql, [id]);
    res.status(200).json({
      message: "Membre supprimé",
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

module.exports = router;
