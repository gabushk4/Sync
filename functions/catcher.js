import ToastAbs from "@/abstractions/toastAbs"
import log from "./log"
import { useModal } from "../contextes/contexteModals"
import {toastTypes} from "@/constants/toastConfig"

export default function catcher(error, titre='erreur'){   
    //const {ouvirModal} = useModal()
    log(`catcher ${titre}`, error.response?.data, error.code)
    // Session expired / signed out: contexteAPI already sends the member to the
    // login screen, so there's nothing useful to show.
    if (error?.deconnecte) return
    let message = ''

    if(error.status === 403){
      titre = 'erreur d\'accès'
      message = 'il faut te déconnecter et te reconnecter'
    }else if(error.status === 304) return
    else {
      switch (error.code) {
        case 'ECONNABORTED':
            titre='erreur réseau'
            message='connexion lente'
          break;
        case 'ENOTFOUND':
        case 'ECONNREFUSED':
        case 'EHOSTUNREACH':
            titre='erreur serveur'
            message='le serveur ne repond pas; il a surement planté on travail là-dessus'
          break;
        case 'ERR_BAD_REQUEST':
          // Axios uses this code for every 4xx, not only 409: only call it a
          // conflict when it is one (it labelled e.g. a 401 "conflit détecté").
          if (error.status === 409) {
            titre='conflit détecté'
            message='un évènement est en conflit'
          } else {
            titre='requête refusée'
            message=error.response?.data?.message ?? ''
          }
          //ouvirModal('detailsEvenement', evenementEnConflit)
          break;
        case 'ERR_NETWORK':
          titre="aucune connexion"
          message="il semble que l'app n'arrive pas à se connecter a internet"
          break;
        case 'ERR_BAD_RESPONSE':
          log('bad response', error.status)
          if(error.status == 502){
            titre="problème avec le serveur"
            message="le serveur est à plat; contactes-moi par instagram pour plus d'infos"
          }
          break;
        default:
          if (error.response) {
            log('erreur avec response')
            titre='introuvable'
            message=error.response.data.message

          } else {
            log("erreur inconnue :", error.message);
            titre = titre
            message=error.message
          }
          break;
        }
    }
    //log("titre", titre, "message", message)
    if(error.response){
      log('Erreur serveur', /* error.response.data */)
        ToastAbs.show({
          type:toastTypes.error,
          text1:titre,
          text2:error.response.data.message??message,
          position:'top',
          autoHide:false
        })
        //TODO ajouter au contexte logs
    }else{  
      log('catcher toast erreur')      
      ToastAbs.show({
        type:toastTypes.error,
        text1:titre,
        text2:message,
        position:'top',
        autoHide:false
      })
      //TODO ajouter le titre et le message au contexte logs
    }
}