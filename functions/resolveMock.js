import { DateTime } from "luxon";

const now = DateTime.now()

const mockRegistry = {
    'GET /users/me': () => ({
        id: 'mock-user-1',
        name: 'Dev Testeur',
        email: 'dev@test.local',
    }),    

    'GET /evenements/': () => ({
        has_changed: true,
        evenements: [
        { id_publique: '1', titre: 'Soirée jeux', debut: now.set({hour:17, minute: 0, second: 0, millisecond: 0}), fin:now.set({hour:20, minute: 0, second: 0, millisecond: 0})},
        { id_publique: '2', titre: 'Brunch', debut: now.set({hour:10, minute: 0, second: 0, millisecond: 0}), fin: now.set({hour:12, minute: 30, second: 0, millisecond: 0})},
    ]}),

    'GET /evenements/amis': () => ({
        has_changed:true,
        resultat:
        [
        {
            id_publique: 'ami-1', pseudo: 'ami 1', fp_url: undefined, evenements: [
                { id_publique: 'a1-1', titre: 'bidon', debut: now.set({ hour: 11, minute: 0, second: 0, millisecond: 0 }), fin: now.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }) },
                { id_publique: 'a1-2', titre: 'bidon', debut: now.set({ hour: 16, minute: 0, second: 0, millisecond: 0 }), fin: now.set({ hour: 18, minute: 0, second: 0, millisecond: 0 }) },
            ]
        },
        {
            id_publique: 'ami-2', pseudo: 'ami 2', fp_url: undefined, evenements: [
                { id_publique: 'a2-2', titre: 'travail bidon', debut: now.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }), fin: now.set({ hour: 21, minute: 0, second: 0, millisecond: 0 }) },
            ]
        },
    ]}),

    'POST /evenements': (body) => ({
        id: 'mock-new-' + Date.now(),
        ...body,
        createdAt: new Date().toISOString(),
    }),

    // pattern dynamique pour les routes avec params
    'GET /membres/:id': (params) => ({
        id: params.id,
        name: `Mock User ${params.id}`,
    }),

    'GET /notifications': () => ([
        { id: 1, type: 'amis', message: 'demande dami bidon', statut: 'lue' },
        { id: 1, type: 'evenements', message:'invitation bidon', statut: 'lue'}
    ]),

    'GET /amis': () => ([
        {id:1, pseudo: 'marilou', fp_url: 'undefined', temps_amitie: now.minus({ years: 3 }) },
        {id:2, pseudo: 'ali', fp_url:'undefined', temps_amitie: now.minus({years:4})}
    ]),

    // --- Story #1 (Isma): messagerie — rafraichissement partiel périodique ---
    'GET /conversations': () => ({
        has_changed: true,
        conversations: [
            {
                id: 'conv-1',
                ami: { id: 'ami-1', pseudo: 'marilou', fp_url: undefined },
                dernierMessage: { type: 'texte', contenu: 'on se rejoint à 18h?', envoyeLe: now.minus({ minutes: 12 }).toISO(), auteurId: 'ami-1' },
                nonLus: 1,
            },
            {
                id: 'conv-2',
                ami: { id: 'ami-2', pseudo: 'ali', fp_url: undefined },
                dernierMessage: { type: 'vocal', envoyeLe: now.minus({ hours: 3 }).toISO(), auteurId: 'Mmoc1234' },
                nonLus: 0,
            },
        ],
    }),

    'POST /conversations': (body) => ({
        id: `conv-${body?.ami_id ?? 'nouv'}`,
        existante: false,
    }),

    // --- Story #16 (Isma): messages vocaux (type 'vocal' géré ci-dessous) ---
    'GET /conversations/:id/messages': (params) => ({
        has_changed: true,
        messages: [
            { id: 'msg-1', conversationId: params.id, auteurId: 'ami-1', type: 'texte', contenu: 'allo!', envoyeLe: now.minus({ hours: 1 }).toISO(), lu: true },
            { id: 'msg-2', conversationId: params.id, auteurId: 'Mmoc1234', type: 'texte', contenu: 'salut ça va?', envoyeLe: now.minus({ minutes: 40 }).toISO(), lu: true },
            { id: 'msg-3', conversationId: params.id, auteurId: 'ami-1', type: 'vocal', audioUrl: undefined, dureeSecondes: 7, envoyeLe: now.minus({ minutes: 12 }).toISO(), lu: false },
        ],
    }),

    'POST /conversations/:id/messages': (params, body) => ({
        message: {
            id: `msg-${Date.now()}`,
            conversationId: params.id,
            auteurId: 'Mmoc1234',
            type: body?.type ?? 'texte',
            contenu: body?.contenu,
            envoyeLe: DateTime.now().toUTC().toISO({ includeOffset: false }),
            lu: false,
        },
    }),

    // --- Story #7 (Isma): import .ics ---
    'POST /evenements/import': (body) => ({
        importes: body?.evenements?.length ?? 0,
    }),
};

export function resolveMock(method, url, body) {
  const path = new URL(url, 'http://mock').pathname; // normalise
  const key = `${method} ${path}`;

  if (mockRegistry[key]) return mockRegistry[key](body);

  // matching dynamique simple : cherche une clé avec :param qui match la forme
  const dynamicMatch = Object.keys(mockRegistry).find(k => {
    const [m, pattern] = k.split(' ');
    if (m !== method) return false;
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return false;
    return patternParts.every((p, i) => p.startsWith(':') || p === pathParts[i]);
  });

  if (dynamicMatch) {
    const patternParts = dynamicMatch.split(' ')[1].split('/');
    const pathParts = path.split('/');
    const params = {};
    patternParts.forEach((p, i) => {
      if (p.startsWith(':')) params[p.slice(1)] = pathParts[i];
    });
    return mockRegistry[dynamicMatch](params, body);
  }

  console.warn(`Pas de mock défini pour ${key}`);
  return null; // ou throw, selon si tu veux forcer à définir tous les mocks
}
