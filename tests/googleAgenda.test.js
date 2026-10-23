import { extraireProgression } from '../functions/googleAgenda';

/**
 * Le suivi d'import repose sur un flux SSE (text/event-stream) : le serveur
 * envoie `event: status` puis `data: {…}`, et des commentaires `: keep-alive`
 * toutes les 25 s. On vérifie ici que l'app lit correctement ces blocs.
 */
describe('extraireProgression (flux SSE)', () => {
    const bloc = (statut, done, total) =>
        `event: status\ndata: ${JSON.stringify({
            groupId: 'google-groupe-1',
            total,
            done,
            statut,
            jobs: [
                {
                    id: 'import-1',
                    groupId: 'google-groupe-1',
                    lane: 'google-9',
                    label: 'Agenda de test',
                    done: done >= 1,
                    success: done >= 1 ? true : null,
                    error: null,
                },
            ],
        })}\n\n`;

    test('lit un bloc "status" et expose la progression', () => {
        const [progression] = extraireProgression(bloc('en_cours', 0, 1));
        expect(progression.statut).toBe('en_cours');
        expect(progression.total).toBe(1);
        expect(progression.done).toBe(0);
        expect(progression.jobs[0].label).toBe('Agenda de test');
    });

    test('lit plusieurs blocs d\'un coup', () => {
        const progressions = extraireProgression(bloc('en_cours', 0, 2) + bloc('termine', 2, 2));
        expect(progressions).toHaveLength(2);
        expect(progressions[1].statut).toBe('termine');
        expect(progressions[1].done).toBe(2);
    });

    test('ignore les commentaires de maintien de connexion', () => {
        const progressions = extraireProgression(': keep-alive\n\n');
        expect(progressions).toHaveLength(0);
    });

    test('ignore un bloc tronqué (JSON invalide) sans lever d\'erreur', () => {
        const progressions = extraireProgression('event: status\ndata: {"groupId": "a", "tot');
        expect(progressions).toHaveLength(0);
    });

    test('ignore un bloc sans donnée', () => {
        expect(extraireProgression('event: status\n\n')).toHaveLength(0);
    });
});
