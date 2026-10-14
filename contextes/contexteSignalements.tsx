import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'

export type ErreurCapturee = {
  id: string
  horodatage: string
  titre: string
  message: string
  code?: string
  statut?: number
  stack?: string
}

type SignalementsContextValue = {
  erreursCapturees: ErreurCapturee[]
  retirerErreursCapturees: (ids: string[]) => void
}

const SignalementsContext = createContext<SignalementsContextValue | undefined>(undefined)
const erreursEnMemoire: ErreurCapturee[] = []
const abonnements = new Set<(erreurs: ErreurCapturee[]) => void>()
const erreursDejaCapturees = new WeakSet<object>()
let sequence = 0

function notifierAbonnes() {
  abonnements.forEach((abonne) => abonne([...erreursEnMemoire]))
}

/** Captures unexpected caught errors without sending anything to the server. */
export function capturerErreurPourSignalement(error: any, titre?: string) {
  const statut = error?.response?.status ?? error?.status
  if (error?.deconnecte || statut === 304 || (statut >= 400 && statut < 500)) return
  if (error && typeof error === 'object') {
    if (erreursDejaCapturees.has(error)) return
    erreursDejaCapturees.add(error)
  } else if (typeof error !== 'string') {
    return
  }

  const message = typeof error === 'string'
    ? error
    : error?.response?.data?.message ?? error?.message ?? String(error)

  erreursEnMemoire.unshift({
    id: `${Date.now()}-${++sequence}`,
    horodatage: new Date().toISOString(),
    titre: String(titre ?? error?.name ?? 'Erreur').slice(0, 160),
    message: String(message).slice(0, 600),
    code: error?.code ? String(error.code).slice(0, 80) : undefined,
    statut: typeof statut === 'number' ? statut : undefined,
    stack: typeof error?.stack === 'string' ? error.stack.split('\n').slice(0, 5).join('\n').slice(0, 900) : undefined,
  })

  if (erreursEnMemoire.length > 10) erreursEnMemoire.length = 10
  notifierAbonnes()
}

export function retirerErreursCapturees(ids: string[]) {
  const idsASupprimer = new Set(ids)
  for (let index = erreursEnMemoire.length - 1; index >= 0; index -= 1) {
    if (idsASupprimer.has(erreursEnMemoire[index].id)) erreursEnMemoire.splice(index, 1)
  }
  notifierAbonnes()
}

export function SignalementsProvider({ children }: { children: ReactNode }) {
  const [erreursCapturees, setErreursCapturees] = useState<ErreurCapturee[]>([...erreursEnMemoire])

  useEffect(() => {
    const abonne = (erreurs: ErreurCapturee[]) => setErreursCapturees(erreurs)
    abonnements.add(abonne)
    return () => { abonnements.delete(abonne) }
  }, [])

  return (
    <SignalementsContext.Provider value={{ erreursCapturees, retirerErreursCapturees }}>
      {children}
    </SignalementsContext.Provider>
  )
}

export function useSignalements() {
  const context = useContext(SignalementsContext)
  if (!context) throw new Error('useSignalements must be used within SignalementsProvider')
  return context
}
