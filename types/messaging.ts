import { DateTime } from "luxon"

export type Message = {
    id: string
    conversationId: string
    auteurId: string
    type: 'texte' | 'vocal'
    contenu?: string
    audioUrl?: string
    dureeSecondes?: number
    envoyeLe: DateTime
    lu: boolean
}

export type Conversation = {
    id: string
    ami: {
        id: string
        pseudo: string
        fp_url?: string
    }
    dernierMessage?:{
        type: 'texte' | 'vocal'
        contenu?: string
        envoyeLe: DateTime
        auteurId: string
    }
    nonLus: number
}

export type MessageBrut = Omit<Message,'envoyeLe'> & {envoyeLe: string}
export type ConversationBrute = Omit<Conversation,'dernierMessage'> & {
    dernierMessage?: Omit<NonNullable<Conversation['dernierMessage']>,'envoyeLe'> & { envoyeLe: string}
}
