import Toast, {ToastShowParams as ToastShowParamsBase} from 'react-native-toast-message';

// `text3` is an extra muted line shown by the custom warning toast (components/toastAvertissement.js).
type ToastShowParams = ToastShowParamsBase & { text3?: string };

/** react-native-toast-message's default display time (ms). */
const DUREE_PAR_DEFAUT = 4000
/** Extra time for the hide animation before the watchdog moves on (ms). */
const MARGE_ANIMATION = 800

const queue: ToastShowParams[] = [];
let isShowing = false;
// Whether the toast on screen stays until dismissed (autoHide: false).
let courantPersistant = false;
// Identifies the toast on screen, so a late onHide / watchdog of an older one is ignored.
let idCourant = 0;
let surveillant: ReturnType<typeof setTimeout> | null = null;

/**
 * Shows the next queued toast. Toasts are chained through their onHide, with a
 * watchdog as a fallback: a toast shown by the modals' own <Toast/> never calls
 * onHide when that modal closes first (e.g. the conflict screen), which used to
 * leave the queue stuck — every later toast was queued and never shown (e.g.
 * "the event must have a name" after creating a multi-day event).
 *
 * @author Philip — rectification for a more conventional display:
 *   every message is shown, none stays stuck behind a closed screen
 * @returns {void}
 */
function processQueue() {
    if (surveillant) clearTimeout(surveillant);
    surveillant = null;

    if (queue.length === 0) {
        isShowing = false;
        courantPersistant = false;
        return;
    }

    isShowing = true;
    const config = queue.shift() as ToastShowParams;
    const id = ++idCourant;
    courantPersistant = config.autoHide === false;

    // On intercepte onHide pour enchaîner sur le prochain toast de la queue,
    // tout en respectant le onHide original de l'appelant (s'il y en a un).
    const originalOnHide = config.onHide;

    Toast.show({
        ...config,
        onHide: () => {
            if (originalOnHide) originalOnHide();
            if (id === idCourant) processQueue();
        },
    });

    if (!courantPersistant) {
        surveillant = setTimeout(() => {
            if (id === idCourant) processQueue();
        }, (config.visibilityTime ?? DUREE_PAR_DEFAUT) + MARGE_ANIMATION);
    }
}

const ToastAbs = {
    /**
     * Shows a toast, after the ones already waiting. A toast that stays until
     * dismissed (autoHide: false, e.g. server errors) is replaced right away
     * instead of holding every later message back.
     *
     * @param {ToastShowParams} config
     * @returns {void}
     */
    show(config: ToastShowParams) {
        queue.push(config);
        if (!isShowing || courantPersistant) {
            processQueue();
        }
    },

    hide() {
        // Vide le toast affiché ET la queue en attente
        queue.length = 0;
        isShowing = false;
        courantPersistant = false;
        idCourant++;
        if (surveillant) clearTimeout(surveillant);
        surveillant = null;
        Toast.hide();
    },
};

export default ToastAbs;
