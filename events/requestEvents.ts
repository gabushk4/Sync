type Listener = (isFetching: boolean) => void

/**
 * Tells global loading indicators (components/requestStatus.tsx) whether the
 * app is waiting on the API. The requests in flight are counted by `track()` in
 * contextes/contexteAPI.tsx, which sets the state here.
 */
class RequestListener{
    private listeners = new Set<Listener>()
    private _isFetching = false

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
     * Sets whether at least one request is in flight.
     * User story 12: listeners are only notified when the state actually
     * changes, since track() calls this on every request.
     *
     * @param {boolean} fetching
     * @returns {void}
     */
    setFetching(fetching: boolean) {
        if (fetching === this._isFetching) return
        this._isFetching = fetching
        this.listeners.forEach(l => l(fetching));
    }

    /**
     * @returns {boolean} Whether at least one request is in flight.
     */
    get isFetching() {
        return this._isFetching
    }
};

export const requestListener = new RequestListener()
