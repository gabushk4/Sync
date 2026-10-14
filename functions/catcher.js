import ToastAbs from "@/abstractions/toastAbs"
import { toastTypes } from "@/constants/toastConfig"
import i18n from "../i18n"
import log from "./log"
import { capturerErreurPourSignalement } from "@/contextes/contexteSignalements"

export default function catcher(error, titre){
    //const {ouvirModal} = useModal()
  log(`catcher ${titre}`, error?.response?.data, error?.code)
    // Session expired / signed out: contexteAPI already sends the member to the
    // login screen and flags the error, so there's nothing useful to show.
    if (error?.deconnecte) return
    const status = error?.response?.status ?? error?.status
    capturerErreurPourSignalement(error, titre)
    const errorKey = String(status ?? error?.code ?? 'default')
    const fallback = i18n.t('default', { ns: 'errors', returnObjects: true })
    const localized = i18n.t(errorKey, { ns: 'errors', returnObjects: true })
    const hasLocalizedError = i18n.exists(errorKey, { ns: 'errors' })
  const details = hasLocalizedError && typeof localized === 'object' ? localized : fallback
  const errorTitle = hasLocalizedError ? details.title : (titre ?? details.title)
    const errorMessage = error?.response?.data?.message ?? details.message ?? error?.message

    if (status === 304) {
      return
    }

    if(error?.response){
      log('Erreur serveur', /* error.response.data */)
        ToastAbs.show({
          type:toastTypes.error,
          text1:errorTitle,
          text2:errorMessage,
          position:'top',
          autoHide:false
        })
        //TODO ajouter au contexte logs
    }else{  
      log('catcher toast erreur')      
      ToastAbs.show({
        type:toastTypes.error,
        text1:errorTitle,
        text2:errorMessage,
        position:'top',
        autoHide:false
      })
      //TODO ajouter le titre et le message au contexte logs
    }
}
