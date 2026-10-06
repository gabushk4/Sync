type Listener = (isFetching: boolean) => void

/**
 * Tracks whether the app is waiting on the API, for global loading indicators
 * (see components/requestStatus.tsx). Fed by the axios interceptors in
 * contextes/contexteAPI.tsx.
 *
 * User story 12: this used to hold a single boolean, so with two requests in
 * flight the first one to finish reported "not fetching" while the second was
 * still running. It now counts the requests in flight.
 */
class RequestListener{
    private listeners = new Set<Listener>()
    private enCours = 0

    /**
     * Registers a listener called with the new state every time it changes.
     *
     * @param {Listener} listener - Receives `true` while at least one request is in flight.
     * @returns {() => void} Unsubscribes the listener.
     */
    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener) };
    }

    /**
     * Records that a request started (`true`) or finished (`false`).
     * Every `true` must be matched by exactly one `false`.
     *
     * @param {boolean} fetching
     * @returns {void}
     */
    setFetching(fetching: boolean) {
        const avant = this.isFetching
        // Clamped at 0 so an unmatched `false` can't leave the counter negative
        // and hide the next real request.
        this.enCours = Math.max(0, this.enCours + (fetching ? 1 : -1))
        if (this.isFetching !== avant)
            this.listeners.forEach(l => l(this.isFetching));
    }

    /**
     * @returns {boolean} Whether at least one request is in flight.
     */
    get isFetching() {
        return this.enCours > 0
    }
};

export const requestListener = new RequestListener()
