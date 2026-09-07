import Toast, {ToastShowParams} from 'react-native-toast-message';

const queue: ToastShowParams[] = [];
let isShowing = false;

function processQueue() {
    if (queue.length === 0) {
        isShowing = false;
        return;
    }

    isShowing = true;
    const config = queue.shift();

    // On intercepte onHide pour enchaîner sur le prochain toast de la queue,
    // tout en respectant le onHide original de l'appelant (s'il y en a un).
    const originalOnHide = config?.onHide;

    Toast.show({
        ...config,
        onHide: () => {
            if (originalOnHide) originalOnHide();
            processQueue();
        },
    });
}

const ToastAbs = {
    show(config = {}) {
        queue.push(config);
        if (!isShowing) {
            processQueue();
        }
    },

    hide() {
        // Vide le toast affiché ET la queue en attente
        queue.length = 0;
        isShowing = false;
        Toast.hide();
    },
};

export default ToastAbs;