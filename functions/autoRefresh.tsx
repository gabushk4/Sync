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

    start(): void {
        if (!this.stopped) return // déjà en cours
        log("auto refreshed", this.url, 'started')
        this.stopped = false
        this.errorCount = 0
        this.timer = setInterval(() => this.refresh(), this.intervalMs)
    }

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