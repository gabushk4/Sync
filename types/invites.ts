export type InviterUrl = string | undefined
export type SupprimerUrl = {
    string: string;
    params?: Record<string, any>
}
    | undefined
export type Participant = {
    id: string;
    fp_url: string;
    pseudo: string;
    privilege: 'editeur' | 'lecteur';
    statut: 'en_attente' | 'acceptee' | 'refusee',
    temps_amitie?: string;
}