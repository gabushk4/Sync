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
    extraParams?: Record<string, any>
}

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

    private setOptions(options: AutoRefreshOptions) {
        this.intervalMs = options.intervalMs ?? 5000
        this.maxBackoffMs = options.maxBackoffMs ?? 30000
        this.onData = options.onData
        this.onPostRequest = options.onPostRequest
        this.onError = options.onError
        this.extraParams = options.extraParams ?? {}
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

    async refresh(forceRefresh = false): Promise<void> {
        //log('autoRefreshed', this.url, 'force refresh', forceRefresh, 'last_checked', this.lastChecked, 'with', this.extraParams)
        if (this.inFlight) return
        this.inFlight = true

        try {
            let params: Record<string, any> = { ...this.extraParams }

            if (this.lastChecked) params.last_checked = this.lastChecked
            
            params.force_refresh = forceRefresh
            
            const response = await this.api.get(this.url, {
                params
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
        }
    }

    start(): void {
        if (!this.stopped) return // déjà en cours
        log("auto refreshed", this.url, 'started')
        this.stopped = false
        this.errorCount = 0
        this.timer = setInterval(() => this.refresh(), this.intervalMs)
    }

    stop(): void {
        log("auto refreshed", this.url, 'stopped')
        this.stopped = true
        if (this.timer) clearInterval(this.timer)
        this.timer = null
    }

    restart(): void{
        this.stop()
        this.start()
    }

    async forceRefresh(options?:AutoRefreshOptions): Promise<void> {
        this.stop()
        if(options)
            this.setOptions(options)
        this.refresh(true)
        this.start()
    }

    isPaused(): boolean {
        return this.stopped
    }

    getLastChecked(): string | undefined {
        return this.lastChecked
    }

    setPostRequest(callback: PostRequestCallback | undefined): void{
        this.onPostRequest = callback
    }
}

export default AutoRefresh