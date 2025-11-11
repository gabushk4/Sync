const { formaterDateVersClient } = require("./formaterDateVersClient");

function retourConflit(res, e) {
    return res.status(409).json({
        message: 'Un évènement existe déjà',
        evenement: {
            id_publique: e.id_publique,
            debut: formaterDateVersClient(e.debut),
            fin: formaterDateVersClient(e.fin),
            privilege_membre: e.privilege,
            fuseau_horaire: e.fuseau_horaire,
            type:e.type,
            url:{
                method:'GET',
                string: e.string??`/evenements/${e.id_publique}`
            }
        }
    });
}

module.exports = retourConflit