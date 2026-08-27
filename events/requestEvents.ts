type Listener = (isFetching: boolean) => void

class RequestListener{
    private listeners = new Set<Listener>()
    private _isFetching = false

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener) };
    }

    setFetching(fetching: boolean) {
        this._isFetching = fetching
        this.listeners.forEach(l => l(fetching));
    }

    get isFetching() {
        return this._isFetching
    }
};

export const requestListener = new RequestListener() 