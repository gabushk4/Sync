import log from "./log"

export default function TraduireRecurrence(regle){
    log('traduire rec', regle)
    switch(regle){
        case 'DAILY':
            return 'jours'
        case 'WEEKLY':
            return 'semaines'
        case 'MONTHLY':
            return 'mois'
        case 'YEARLY':
            return 'années'
        default:
            return ''
    }
}