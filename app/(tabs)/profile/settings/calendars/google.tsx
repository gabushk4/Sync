import Container from '@/abstractions/container';
import ToastAbs from '@/abstractions/toastAbs';
import Radius from '@/constants/Radius';
import { toastTypes } from '@/constants/toastConfig';
import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import catcher from '@/functions/catcher';
import {
    type CalendrierGoogle,
    type CompteGoogle,
    type ProgressionImport,
    chargerCalendriersGoogle,
    chargerComptesGoogle,
    chargerConfigGoogle,
    connecterCompteGoogle,
    deconnecterCompteGoogle,
    resynchroniserCalendrierGoogle,
    selectionnerCalendriersGoogle,
    suivreImportGoogle,
} from '@/functions/googleAgenda';
import { ConfigurationOAuthInvalide, demanderCodeGoogle } from '@/functions/googleOAuth';
import Icon from '@react-native-vector-icons/ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Écran « Google Agenda » : linker un compte Google, choisir les calendriers à
 * importer, puis suivre l'import en temps réel.
 *
 * Le serveur reste maître de la liaison (il détient le secret OAuth) : l'app
 * récupère un code d'autorisation, l'API l'échange et chiffre le jeton.
 * La sélection passe par PUT /calendriers/google, qui est idempotent : le
 * tableau envoyé fait foi, un calendrier non envoyé est désactivé et ses événements
 * supprimés de façon soft.
 *
 * @returns {JSX.Element} Écran de gestion des calendriers Google.
 * @author Gabriel Pereira Levesque | S2 2026 - US 19
 */
export default function GoogleAgendaScreen() : JSX.Element  {
    const { t } = useTranslation('calendar');
    const { api } = useAPI();
    const { colors } = usePalette();
    const { fonts } = useFont();

    const [chargement, setChargement] = useState(true);
    const [comptes, setComptes] = useState<CompteGoogle[]>([]);
    const [calendriers, setCalendriers] = useState<CalendrierGoogle[]>([]);
    const [selection, setSelection] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<null | 'connexion' | 'enregistrement' | 'deconnexion'>(null);
    const [progression, setProgression] = useState<ProgressionImport | null>(null);

    // permet d'arrêter le suivi de l'import quand on quitte l'écran
    const arreterSuivi = useRef<(() => void) | null>(null);

    // calendriers que l'utilisateur peut cocher (un calendrier déjà lié à un
    // autre compte reste importé mais n'est pas re sélectionnable ici)
    const selectionnables = calendriers.filter(c => c.disponible);
    const toutCoche = selectionnables.length > 0 && selectionnables.every(c => selection.has(c.id_externe));

    const styles = StyleSheet.create({
        content: { paddingHorizontal: 16, paddingBottom: 32 },
        heading: { color: colors.text, fontFamily: fonts.title, fontSize: 22, marginBottom: 8 },
        body: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
        section: { marginTop: 28, marginBottom: 6, color: colors.text, fontFamily: fonts.title, fontSize: 18 },
        row: {
            minHeight: 56,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 8,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        rowDisabled: { opacity: 0.5 },
        rowText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16 },
        rowSubText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
        action: {
            minHeight: 52,
            paddingHorizontal: 16,
            borderRadius: Radius.md,
            backgroundColor: colors.secondary,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        actionSecondary: {
            minHeight: 46,
            paddingHorizontal: 14,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        actionText: { color: colors.text, fontFamily: fonts.title, fontSize: 17 },
        actionTextSecondary: { color: colors.secondary, fontFamily: fonts.title, fontSize: 15 },
        disabled: { opacity: 0.5 },
        center: { paddingVertical: 24, alignItems: 'center' },
        badge: {
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: Radius.sm,
            fontFamily: fonts.body,
            fontSize: 12,
            overflow: 'hidden',
        },
        progress: {
            marginTop: 16,
            padding: 12,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
        },
        progressTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 16 },
        progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
        progressText: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 15 },
        separator: { height: 1, backgroundColor: colors.border, marginTop: 28 },
        hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 6 },
    });

    /**
     *  recharge les comptes et les calendriers, et pré-sélectionne ce qui est déjà importé
     **/
    const charger = useCallback(async () => {
        try {
            const [listeComptes, reponse] = await Promise.all([
                chargerComptesGoogle(api),
                chargerCalendriersGoogle(api),
            ]);
            setComptes(listeComptes);
            setCalendriers(reponse.calendriers);
            setSelection(new Set(reponse.calendriers.filter(c => c.actif).map(c => c.id_externe)));
        } catch (error) {
            catcher(error, t('google.loadFailed'));
        } finally {
            setChargement(false);
        }
    }, [api, t]);

    useFocusEffect(useCallback(() => {
        void charger();
    }, [charger]));

    // on ne laisse pas un flux SSE ouvert derrière l'écran
    useEffect(() => () => {
        arreterSuivi.current?.();
        arreterSuivi.current = null;
    }, []);

    const suiviEnCours = progression !== null && progression.statut === 'en_cours';
    const occupe = action !== null || suiviEnCours;

    const basculer = (idExterne: string) => {
        setSelection(current => {
            const suivant = new Set(current);
            if (suivant.has(idExterne)) suivant.delete(idExterne);
            else suivant.add(idExterne);
            return suivant;
        });
    };

    /**
     * Coche/décoche tous les calendriers sélectionnables.
     * Les calendriers déjà importés mais liés à un autre compte ne sont pas
     * sélectionnables : on ne les retire pas de la sélection (sinon le serveur
     * les désactiverait).
     */
    const toutBasculer = () => {
        const ids = selectionnables.map(c => c.id_externe);
        setSelection(current => {
            const suivant = new Set(current);
            const toutCocheLocal = ids.length > 0 && ids.every(id => suivant.has(id));
            for (const id of ids) {
                if (toutCocheLocal) suivant.delete(id);
                else suivant.add(id);
            }
            return suivant;
        });
    };

    /** Démarre le suivi d'un import et rafraîchit la liste à la fin. */
    const suivre = (jobId: string) => {
        arreterSuivi.current?.();
        setProgression({ groupId: jobId, total: 0, done: 0, statut: 'en_cours', jobs: [] });
        arreterSuivi.current = suivreImportGoogle(api, jobId, {
            onProgression: setProgression,
            onFin: (final) => {
                setProgression(final);
                arreterSuivi.current = null;
                if (final.statut === 'erreur') {
                    ToastAbs.show({ type: toastTypes.error, text2: t('google.importFailed') });
                } else {
                    ToastAbs.show({ type: toastTypes.success, text2: t('google.importDone') });
                }
                void charger();
            },
        });
    };

    /** Connecte un compte Google : consentement OAuth puis envoi du code à l'API. */
    const connecter = async () => {
        setAction('connexion');
        try {
            const plateforme = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : undefined;
            const config = await chargerConfigGoogle(api, plateforme);
            const code = await demanderCodeGoogle(config);
            if (!code) return; // l'utilisateur a annulé
            // le client_id repart avec le code : l'API en déduit le secret
            await connecterCompteGoogle(api, code.code, code.code_verifier, config.client_id);
            ToastAbs.show({ type: toastTypes.success, text2: t('google.connected') });
            await charger();
        } catch (error) {
            if (error instanceof ConfigurationOAuthInvalide) {
                ToastAbs.show({ type: toastTypes.error, text2: t('google.misconfigured') });
                return;
            }
            catcher(error, t('google.connectFailed'));
        } finally {
            setAction(null);
        }
    };

    /** Envoie la sélection : le serveur active/désactive et lance l'import. */
    const enregistrer = async () => {
        setAction('enregistrement');
        try {
            const { jobId, calendriersDesactives } = await selectionnerCalendriersGoogle(api, Array.from(selection));
            if (!jobId) {
                // rien à importer : la sélection a bien été enregistrée (des
                // calendriers ont pu être retirés).
                ToastAbs.show({
                    type: toastTypes.success,
                    text2: calendriersDesactives > 0
                        ? t('google.calendarsRemoved', { count: calendriersDesactives })
                        : t('google.selectionSaved'),
                });
                await charger();
                return;
            }
            suivre(jobId);
        } catch (error) {
            if ((error as { response?: { data?: { code?: string } } })?.response?.data?.code === 'google_reauth') {
                ToastAbs.show({ type: toastTypes.warning, text2: t('google.needsReconnect') });
                return;
            }
            catcher(error, t('google.importFailed'));
        } finally {
            setAction(null);
        }
    };

    /** Relance l'import d'un seul calendrier. */
    const resynchroniser = async (calendrier: CalendrierGoogle) => {
        if (!calendrier.id_publique) return;
        setAction('enregistrement');
        try {
            const jobId = await resynchroniserCalendrierGoogle(api, calendrier.id_publique);
            suivre(jobId);
        } catch (error) {
            if ((error as { response?: { data?: { code?: string } } })?.response?.data?.code === 'google_reauth') {
                ToastAbs.show({ type: toastTypes.warning, text2: t('google.needsReconnect') });
                return;
            }
            catcher(error, t('google.importFailed'));
        } finally {
            setAction(null);
        }
    };

    /** Déconnecte un compte : ses calendriers sont désactivés et ses événements retirés. */
    const deconnecter = async (compte: CompteGoogle) => {
        setAction('deconnexion');
        try {
            await deconnecterCompteGoogle(api, compte.id);
            ToastAbs.show({ type: toastTypes.success, text2: t('google.disconnected') });
            await charger();
        } catch (error) {
            catcher(error, t('google.disconnectFailed'));
        } finally {
            setAction(null);
        }
    };

    const comptesActifs = comptes.filter(c => c.statut === 'actif');

    return (
        <Container style={{ backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.heading}>{t('google.title')}</Text>
                <Text style={styles.body}>{t('google.description')}</Text>

                {/* Comptes liés */}
                <Text style={styles.section}>{t('google.accountsSection')}</Text>

                {chargement ? (
                    <View style={styles.center}><ActivityIndicator color={colors.secondary} /></View>
                ) : comptes.length === 0 ? (
                    <Text style={styles.body}>{t('google.noAccount')}</Text>
                ) : (
                    comptes.map(compte => (
                        <View key={compte.id} style={styles.row}>
                            <Icon
                                name={compte.statut === 'actif' ? 'logo-google' : 'warning-outline'}
                                size={22}
                                color={compte.statut === 'actif' ? colors.secondary : colors.error}
                            />
                            <View style={styles.rowText}>
                                <Text style={styles.rowText}>{compte.courriel ?? t('google.unknownAccount')}</Text>
                                {compte.a_reconnecter ? (
                                    <Text style={[styles.rowSubText, { color: colors.error }]}>
                                        {t('google.needsReconnect')}
                                    </Text>
                                ) : null}
                            </View>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityState={{ disabled: occupe }}
                                disabled={occupe}
                                onPress={() => {
                                    compte.statut === 'actif'
                                        ? deconnecter(compte)
                                        : connecter()
                                }}
                            >
                                <Text style={[styles.actionTextSecondary, { color: compte.statut === 'actif' ? colors.error : colors.success }]}>
                                    {compte.statut === 'actif' ? t('google.disconnect') : t('google.connectShort')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ disabled: occupe }}
                    disabled={occupe}
                    style={[styles.action, { marginTop: 12 }, occupe && styles.disabled]}
                    onPress={connecter}
                >
                    {action === 'connexion'
                        ? <ActivityIndicator color={colors.text} />
                        : (
                            <>
                                <Icon name="logo-google" size={20} color={colors.text} />
                                <Text style={styles.actionText}>{t('google.connect')}</Text>
                            </>
                        )}
                </TouchableOpacity>

                {/* Calendriers */}
                {comptesActifs.length > 0 ? (
                    <>
                        <View style={styles.separator} />
                        <Text style={styles.section}>{t('google.calendarsSection')}</Text>
                        <Text style={styles.body}>{t('google.calendarsDescription')}</Text>

                        {calendriers.length === 0 ? (
                            <Text style={[styles.body, { marginTop: 12 }]}>{t('google.noCalendars')}</Text>
                        ) : (
                            <>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
                                    onPress={toutBasculer}
                                >
                                    <Text style={[styles.body, { color: colors.secondary }]}>
                                        {toutCoche ? t('google.selectNone') : t('google.selectAll')}
                                    </Text>
                                </TouchableOpacity>

                                {calendriers.map(calendrier => {
                                    const coche = selection.has(calendrier.id_externe);
                                    const indisponible = !calendrier.disponible;
                                    return (
                                        <View key={`${calendrier.id_compte}-${calendrier.id_externe}`}>
                                            <TouchableOpacity
                                                accessibilityRole="checkbox"
                                                accessibilityState={{ checked: coche, disabled: indisponible }}
                                                disabled={indisponible || occupe}
                                                style={[styles.row, indisponible && styles.rowDisabled]}
                                                onPress={() => basculer(calendrier.id_externe)}
                                            >
                                                <Icon
                                                    name={coche ? 'checkbox' : 'square-outline'}
                                                    size={22}
                                                    color={coche ? colors.secondary : colors.muted}
                                                />
                                                <View style={styles.rowText}>
                                                    <Text style={styles.rowText}>{calendrier.nom}</Text>
                                                    {calendrier.suggere ? (
                                                        <Text style={styles.rowSubText}>{t('google.suggested')}</Text>
                                                    ) : null}
                                                    {indisponible ? (
                                                        <Text style={styles.rowSubText}>{t('google.linkedElsewhere')}</Text>
                                                    ) : null}
                                                </View>
                                                {calendrier.couleur ? (
                                                    <View style={{
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: 7,
                                                        backgroundColor: calendrier.couleur,
                                                    }} />
                                                ) : null}
                                            </TouchableOpacity>
                                            {calendrier.actif && calendrier.id_publique ? (
                                                <TouchableOpacity
                                                    accessibilityRole="button"
                                                    accessibilityState={{ disabled: occupe }}
                                                    disabled={occupe}
                                                    style={[styles.actionSecondary, { marginBottom: 8 }]}
                                                    onPress={() => resynchroniser(calendrier)}
                                                >
                                                    <Icon name="refresh-outline" size={18} color={colors.secondary} />
                                                    <Text style={styles.actionTextSecondary}>{t('google.resync')}</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    );
                                })}

                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled: occupe }}
                                    disabled={occupe}
                                    style={[styles.action, { marginTop: 8 }, occupe && styles.disabled]}
                                    onPress={enregistrer}
                                >
                                    {action === 'enregistrement'
                                        ? <ActivityIndicator color={colors.text} />
                                        : <Text style={styles.actionText}>{t('google.save')}</Text>}
                                </TouchableOpacity>
                                <Text style={styles.hint}>{t('google.saveHint')}</Text>
                            </>
                        )}
                    </>
                ) : null}

                {/* ---------- Progression de l'import ---------- */}
                {progression ? (
                    <View style={styles.progress}>
                        <Text style={styles.progressTitle}>{t('google.importTitle')}</Text>
                        {progression.jobs.length === 0 ? (
                            <View style={styles.progressRow}>
                                <ActivityIndicator color={colors.secondary} />
                                <Text style={styles.progressText}>{t('google.importStarting')}</Text>
                            </View>
                        ) : (
                            progression.jobs.map(job => (
                                <View key={job.id} style={styles.progressRow}>
                                    {job.done
                                        ? <Icon
                                            name={job.success === false ? 'close-circle' : 'checkmark-circle'}
                                            size={20}
                                            color={job.success === false ? colors.error : colors.success}
                                        />
                                        : <ActivityIndicator size="small" color={colors.secondary} />}
                                    <Text style={styles.progressText}>
                                        {job.label ?? t('google.untitledCalendar')}
                                    </Text>
                                </View>
                            ))
                        )}
                        <Text style={styles.hint}>
                            {t('google.importProgress', { done: progression.done, total: progression.total })}
                        </Text>
                    </View>
                ) : null}
            </ScrollView>
        </Container>
    );
}
