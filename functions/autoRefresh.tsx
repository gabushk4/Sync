import { AxiosInstance, AxiosResponse } from 'axios'
import { DateTime } from 'luxon'
import log from './log'
import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native'

type PostRequestCallback = (response: AxiosResponse) => void

interface AutoRefreshOptions {
    
    intervalMs?: number
    maxBackoffMs?: number
    onData?: (data: any) => void
    onPostRequest?: PostRequestCallback
    onError?: (error: any) => void
    extraParams?: Record<string, any>
}

/**
 * Polls a GET endpoint at a fixed interval and hands new data to `onData`.
 * Sends `last_checked` (the version from the previous answer) so the API only
 * returns the full payload when something changed (`has_changed`). Backs off
 * exponentially on temporary errors and stops on 401/403/404.
 * Starts polling as soon as it's constructed.
 */
class AutoRefresh {
    private api: AxiosInstance
    private url: string
    private intervalMsInit: number
    private intervalMs = 5000
    private maxBackoffMs = 30000
    private lastChecked: string | undefined = undefined
    private errorCount = 0
    private timer: ReturnType<typeof setTimeout> | null = null
    private stopped = true
    private inFlight = false
    private appStateSub: NativeEventSubscription | null = null
    private pausedByApp = false
    private dead = false            // arrêt définitif : 401/403/404 ou destroy()

    private onData?: (data: any) => void
    private onPostRequest?: PostRequestCallback
    private onError?: (error: any) => void
    private extraParams: Record<string, any>

    constructor(api: AxiosInstance, url: string, options: AutoRefreshOptions = {}) {
        this.api = api
        this.url = url

        //options
        this.intervalMsInit = options.intervalMs ?? 5000
        this.extraParams = {}
        this.setOptions(options)

        this.appStateSub = AppState.addEventListener('change', this.handleAppState)

        this.stopped = false

        this.refresh(true)
        this.timer = setInterval(() => this.refresh(), this.intervalMsInit)
    }

    /**
     * Applies options, keeping the current value of any option left out.
     * It used to reset every missing option: forceRefresh({ extraParams }) — called
     * on every date change in the home screen — wiped onData/onError, so new data
     * was fetched but never applied (events didn't show up after changing day/month).
     *
     * @param {AutoRefreshOptions} options
     * @returns {void}
     */
    private setOptions(options: AutoRefreshOptions) {
        this.intervalMs = options.intervalMs ?? this.intervalMs ?? 5000
        this.maxBackoffMs = options.maxBackoffMs ?? this.maxBackoffMs ?? 30000
        if (options.onData !== undefined) this.onData = options.onData
        if (options.onPostRequest !== undefined) this.onPostRequest = options.onPostRequest
        if (options.onError !== undefined) this.onError = options.onError
        if (options.extraParams !== undefined) {
            // New query (e.g. another day): the last version seen was for the old
            // range, so drop it and let the next poll get a full answer.
            this.extraParams = options.extraParams
            this.lastChecked = undefined
        }
    }

    private getBackoffDelay(): number {
        return Math.min(this.intervalMs * Math.pow(2, this.errorCount), this.maxBackoffMs)
    }

    private extractLastChecked(data: any): string | undefined{
        console.log(this.url, "last checked", data?.last_checked)
        if (data?.last_checked) {
            
            return data.last_checked
        }
        return undefined
    }

    /**
     * Runs one request (skipped if one is already in flight). Calls `onData`
     * when the API reports a change, `onError` on failure.
     *
     * @param {boolean} [forceRefresh=false] - Ask for the full payload even if unchanged.
     * @returns {Promise<void>}
     */
    private handleAppState = (status: AppStateStatus) => {
        if (this.dead) return

        if (status !== 'active') {
            // Passe en arrière-plan : on met en pause (sans toucher à `dead`)
            if (!this.stopped) {
                this.pausedByApp = true
                this.stop()
            }
        } else if (this.pausedByApp) {
            // Retour au premier plan : on rattrape tout de suite, puis on reprend le rythme
            this.pausedByApp = false
            this.refresh()        // pas de force : last_checked laisse le serveur dire s'il y a du neuf
            this.start()
        }
    }

    private requestId = 0
    private abortController: AbortController | null = null

    /** Change la plage et recharge immédiatement, sans cache de last_checked */
    setParams(extraParams: Record<string, any>) {
        this.extraParams = extraParams
        this.lastChecked = undefined          // la fenêtre a changé : on repart de zéro
        this.abortController?.abort()    // annule la requête en cours
        this.inFlight = false
        return this.refresh(true)
    }

    async refresh(forceRefresh = false): Promise<void> {
        if (this.inFlight && !forceRefresh) return
            this.inFlight = true

        const myId = ++this.requestId
        this.abortController = new AbortController()

        try {
            const params: Record<string, any> = { ...this.extraParams }
            if (this.lastChecked) params.last_checked = this.lastChecked
            params.force_refresh = forceRefresh

            const response = await this.api.get(this.url, {
                params,
                signal: this.abortController.signal,
            })

            // Réponse périmée : une requête plus récente a été lancée entre-temps
            if (myId !== this.requestId) return

            this.onPostRequest?.(response)

            if (response.data?.has_changed === true) {
                this.intervalMs = this.intervalMsInit
                this.errorCount = 0
                this.lastChecked = this.extractLastChecked(response.data)
                this.onData?.(response.data)
            }
        } catch (error: any) {
            if (error?.code === 'ERR_CANCELED') return   // annulation volontaire, pas une erreur
            if (myId !== this.requestId) return

            const status = error?.response?.status
            if (this.errorCount === 0) this.onError?.(error)
            if (status === 401 || status === 403 || status === 404) {
            this.kill()
            return
            }
            this.errorCount++
            this.intervalMs = this.getBackoffDelay()
            this.restart()
        } finally {
            if (myId === this.requestId) this.inFlight = false
        }
    }

    /**
     * Resumes polling (no-op if already running).
     *
     * @returns {void}
     */
    start(): void {
        if (!this.stopped) return // déjà en cours
        log("auto refreshed", this.url, 'started')
        this.stopped = false
        this.errorCount = 0
        this.timer = setInterval(() => this.refresh(), this.intervalMs)
    }

    /**
     * Stops polling. A request already in flight still completes.
     *
     * @returns {void}
     */
    private kill(): void {
        this.dead = true
        this.stop()
    }

    stop(): void {
        log("auto refreshed", this.url, 'stopped')
        this.stopped = true
        
        if (this.timer) clearInterval(this.timer)
        this.timer = null
    }

    /**
     * Stops then starts polling, picking up the current interval (e.g. after a backoff).
     *
     * @returns {void}
     */
    restart(): void{
        this.stop()
        this.start()
    }

    
    destroy(): void {
        this.dead = true
        this.appStateSub?.remove()
        this.appStateSub = null
        this.lastChecked = undefined
        this.stop()
    }
    
    /**
     * Fetches the full payload right away, optionally with new options (e.g.
     * another day's `extraParams` — the other options are kept), then resumes polling.
     *
     * @param {AutoRefreshOptions} [options] - Options to change; omitted ones are kept.
     * @returns {Promise<void>}
     */
    async forceRefresh(options?:AutoRefreshOptions): Promise<void> {
        this.stop()
        if(options)
            this.setOptions(options)
        this.refresh(true)
        this.start()
    }

    /**
     * @returns {boolean} Whether polling is stopped.
     */
    isPaused(): boolean {
        return this.stopped
    }

    /**
     * @returns {string | undefined} Version from the last answer that had changes.
     */
    getLastChecked(): string | undefined {
        return this.lastChecked
    }

    /**
     * Sets (or clears) a callback run after every successful request, changed or not.
     *
     * @param {PostRequestCallback | undefined} callback
     * @returns {void}
     */
    setPostRequest(callback: PostRequestCallback | undefined): void{
        this.onPostRequest = callback
    }
}

export default AutoRefresh