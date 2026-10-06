import { AxiosInstance, AxiosResponse } from 'axios'
import { DateTime } from 'luxon'
import log from './log'

type PostRequestCallback = (response: AxiosResponse) => void

interface AutoRefreshOptions {
    
    intervalMs?: number
    maxBackoffMs?: number
    onData?: (data: any) => void
    onPostRequest?: PostRequestCallback
    onError?: (error: any) => void
    /**
     * User story 12: called with `true` when a forced load (first load, or
     * forceRefresh, e.g. after changing day) starts and `false` when it ends, so
     * the screen can show a loader. Background polls don't trigger it.
     */
    onChargement?: (enCours: boolean) => void
    extraParams?: Record<string, any>
}

/**
 * Polls a GET endpoint at a fixed interval and hands new data to `onData`.
 * Sends `last_checked` (the version from the previous answer) so the API only
 * returns the full payload when something changed (`has_changed`). Backs off
 * exponentially on temporary errors and stops on 401/403/404.
 * Starts polling as soon as it's constructed.
 * Background polls are sent with `silencieux: true` so they don't show the
 * global loading indicator every few seconds (user story 12); forced loads do.
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

    private onData?: (data: any) => void
    private onPostRequest?: PostRequestCallback
    private onError?: (error: any) => void
    private onChargement?: (enCours: boolean) => void
    private extraParams: Record<string, any>

    constructor(api: AxiosInstance, url: string, options: AutoRefreshOptions = {}) {
        this.api = api
        this.url = url

        //options
        this.intervalMsInit = options.intervalMs ?? 5000
        this.extraParams = {}
        this.setOptions(options)

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
        if (options.onChargement !== undefined) this.onChargement = options.onChargement
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
     * when the API reports a change, `onError` on failure. A forced request also
     * calls `onChargement` before and after, and shows the global loading indicator.
     *
     * @param {boolean} [forceRefresh=false] - Ask for the full payload even if unchanged.
     * @returns {Promise<void>}
     */
    async refresh(forceRefresh = false): Promise<void> {
        //log('autoRefreshed', this.url, 'force refresh', forceRefresh, 'last_checked', this.lastChecked, 'with', this.extraParams)
        if (this.inFlight) return
        this.inFlight = true
        if (forceRefresh) this.onChargement?.(true)

        try {
            let params: Record<string, any> = { ...this.extraParams }

            if (this.lastChecked) params.last_checked = this.lastChecked
            
            params.force_refresh = forceRefresh
            
            const response = await this.api.get(this.url, {
                params,
                silencieux: !forceRefresh
            })
            
            this.onPostRequest?.(response)            
            
            if (response.data?.has_changed === true) {
                log("res", this.url, ":", response.data)
                this.intervalMs = this.intervalMsInit
                this.errorCount = 0
                
                this.lastChecked = this.extractLastChecked(response.data)

                this.onData?.(response.data)
            }

        } catch (error: any) {
            const status = error?.response?.status

            this.onError?.(error)

            // Erreurs permanentes : on arrête complètement, pas de retry
            if (status === 401 || status === 403 || status === 404) {
                this.stop()
                return
            }

            // Erreurs temporaires : backoff exponentiel avant de retenter
            this.errorCount++
            this.intervalMs = this.getBackoffDelay()
            this.restart()
        } finally {
            this.inFlight = false
            if (forceRefresh) this.onChargement?.(false)
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