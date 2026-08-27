import log from "@/functions/log";

type Listener = () => void

let listeners: Listener[] = [];

export const authEvents = {
  onUnauthorized(listener: Listener) {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },
  emitUnauthorized() {
    log('emit unauthorized')
    listeners.forEach(l => l());
  },
};