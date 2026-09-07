import ToastAvertissement from "@/components/toastAvertissement"
import ToastErreur from "@/components/toastErreur"
import ToastSucces from "@/components/toastSucces"

const toastTypes = {warning: 'persoAvertissement', error: 'persoErreur', success: 'persoSucces'} 

const toastConfig = {
  persoSucces: (props : any) => <ToastSucces {...props}/>,
  persoErreur: (props : any) => <ToastErreur {...props}/>,
  persoAvertissement: (props : any) => <ToastAvertissement {...props}/>
}

export {toastConfig, toastTypes}