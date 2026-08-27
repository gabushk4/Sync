import log from "@/functions/log"

type Listener = () => void

let listeners: Listener[] = []

export const modalEvents = {
    onClose: (listener:Listener) => {
        listeners.push(listener)
        return () => {listeners = listeners.filter(l => l !== listener)}
    },
    emitClosing: () => {
        log("emit closing")
        listeners.forEach(l => l())
    }
}