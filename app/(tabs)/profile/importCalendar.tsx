import Container from '@/abstractions/container';
import ToastAbs from '@/abstractions/toastAbs';
import Radius from '@/constants/Radius';
import { toastTypes } from '@/constants/toastConfig';
import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import catcher from '@/functions/catcher';
import {
    chargerEvenementsExistants,
    choisirFichierIcs,
    dedupliquerEtDetecterConflits,
    envoyerEvenements,
    evenementsDepuisIcs,
    evenementsDepuisTelephone,
    FichierNonIcsErreur,
} from '@/functions/importCalendar';
import { definirImportEnCours } from '@/functions/importStaging';
import Icon from '@react-native-vector-icons/ionicons';
// API 'legacy' : la seule qui fonctionne dans Expo Go (voir functions/importCalendar.js)
import * as Calendar from 'expo-calendar/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SourceImport = 'telephone' | 'ics';

/**
 * To separate concerns, Importing from a file must be separated from importing from a systems calendar. 
 * Also, we need to be able to manage separated calendars. 
 * If the user wants to delete events from an imported file, or from an imported system calendar, he has to be able to do so.
 * For now, this code limits the control of the user over its calendar.
 */

/**
 * Importer un calendrier (stories #4 et #7), depuis deux sources au choix :
 *  - les calendriers du téléphone (expo-calendar)
 *  - un fichier .ics (Google Agenda, Outlook, Apple Calendar...)
 *
 * Les deux passent par le même traitement (functions/importCalendar.js) :
 * doublons ignorés, conflits d'horaire résolus dans (modals)/resolutionConflitImport, puis envoi au serveur.
 * @returns {JSX.Element} Calendar import screen.
 */
export default function ImportCalendarScreen() {
    const { t } = useTranslation('calendar');
    const { api } = useAPI();
    const { colors } = usePalette();
    const { fonts } = useFont();
    const router = useRouter();

    const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [hasPermission, setHasPermission] = useState(false);
    const [canAskAgain, setCanAskAgain] = useState(true);
    const [loadingCalendars, setLoadingCalendars] = useState(true);
    const [importing, setImporting] = useState<SourceImport | null>(null);

    const styles = StyleSheet.create({
        content: { paddingHorizontal: 16, paddingBottom: 32 },
        heading: { color: colors.text, fontFamily: fonts.title, fontSize: 22, marginBottom: 8 },
        body: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
        section: { marginTop: 28, marginBottom: 6, color: colors.text, fontFamily: fonts.title, fontSize: 18 },
        subsection: { marginTop: 16, marginBottom: 4, color: colors.text, fontFamily: fonts.body, fontSize: 16 },
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
        rowText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16 },
        controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
        textButton: { padding: 8 },
        action: {
            marginTop: 16,
            minHeight: 52,
            paddingHorizontal: 16,
            borderRadius: Radius.md,
            backgroundColor: colors.secondary,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        actionText: { color: colors.text, fontFamily: fonts.title, fontSize: 17 },
        disabled: { opacity: 0.5 },
        center: { paddingVertical: 24, alignItems: 'center' },
        separator: { height: 1, backgroundColor: colors.border, marginTop: 28 },
    });

    /** Loads the calendar permission state and the calendars available on this device. */
    const loadDeviceCalendars = useCallback(async () => {
        setLoadingCalendars(true);
        try {
            const permission = await Calendar.getCalendarPermissionsAsync();
            setHasPermission(permission.granted);
            setCanAskAgain(permission.canAskAgain);

            if (!permission.granted) {
                setCalendars([]);
                setSelectedIds(new Set());
                return;
            }

            const deviceCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            setCalendars(deviceCalendars);
            setSelectedIds(new Set(deviceCalendars.map(calendar => calendar.id)));
        } catch (error) {
            catcher(error, t('import.failed'));
        } finally {
            setLoadingCalendars(false);
        }
    }, [t]);

    useFocusEffect(useCallback(() => {
        void loadDeviceCalendars();
    }, [loadDeviceCalendars]));

    /** Requests read access after the member taps the permission action. */
    const requestCalendarAccess = async () => {
        try {
            const permission = await Calendar.requestCalendarPermissionsAsync();
            setHasPermission(permission.granted);
            setCanAskAgain(permission.canAskAgain);
            if (permission.granted) await loadDeviceCalendars();
        } catch (error) {
            catcher(error, t('import.failed'));
        }
    };

    const toggleCalendar = (calendarId: string) => {
        setSelectedIds(current => {
            const next = new Set(current);
            if (next.has(calendarId)) next.delete(calendarId);
            else next.add(calendarId);
            return next;
        });
    };

    const toggleAllCalendars = () => {
        setSelectedIds(current => current.size === calendars.length
            ? new Set()
            : new Set(calendars.map(calendar => calendar.id)));
    };

    /**
     * Traitement commun aux deux sources : doublons, conflits, puis envoi au serveur.
     * S'il y a des conflits, on passe la main à l'écran de résolution, qui fera l'envoi.
     */
    const traiterImport = async (evenements: any[]) => {
        if (evenements.length === 0) {
            ToastAbs.show({ type: toastTypes.success, text2: t('import.nothingToImport') });
            return;
        }

        const existants = await chargerEvenementsExistants(api, evenements);
        const { aImporter, ignores, conflits } = dedupliquerEtDetecterConflits(evenements, existants);

        if (conflits.length > 0) {
            definirImportEnCours({ aImporter, ignores, conflits });
            router.push('/(modals)/resolutionConflitImport');
            return;
        }

        const resultat = await envoyerEvenements(api, aImporter);
        ToastAbs.show({
            type: toastTypes.success,
            text1: t('import.title'),
            text2: t('import.success', {
                imported: resultat.importes + resultat.misAJour,
                duplicates: ignores.length + resultat.doublons,
            }),
        });
        router.back();
    };

    const importerDepuisTelephone = async () => {
        if (selectedIds.size === 0) {
            ToastAbs.show({ type: toastTypes.error, text2: t('import.selectCalendar') });
            return;
        }

        setImporting('telephone');
        try {
            const selectedCalendars = calendars.filter(calendar => selectedIds.has(calendar.id));
            const evenements = await evenementsDepuisTelephone(selectedCalendars, t('import.untitled'));
            await traiterImport(evenements);
        } catch (error) {
            catcher(error, t('import.failed'));
        } finally {
            setImporting(null);
        }
    };

    const importerDepuisIcs = async () => {
        try {
            const texteIcs = await choisirFichierIcs();
            if (!texteIcs) return; // annulé

            setImporting('ics');
            const evenements = evenementsDepuisIcs(texteIcs, t('import.untitled'));
            if (evenements.length === 0) {
                ToastAbs.show({ type: toastTypes.warning, text2: t('import.icsEmpty') });
                return;
            }
            await traiterImport(evenements);
        } catch (error) {
            if (error instanceof FichierNonIcsErreur) {
                ToastAbs.show({ type: toastTypes.warning, text2: t('import.icsInvalid') });
            } else {
                catcher(error, t('import.failed'));
            }
        } finally {
            setImporting(null);
        }
    };

    const occupe = importing !== null;

    return (
        <Container style={{ backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.heading}>{t('import.title')}</Text>
                <Text style={styles.body}>{t('import.description')}</Text>

                {/* ---------- Depuis le téléphone ---------- */}
                <Text style={styles.section}>{t('import.phoneSection')}</Text>
                <Text style={styles.body}>{t('import.phoneDescription')}</Text>

                {loadingCalendars ? (
                    <View style={styles.center}><ActivityIndicator color={colors.secondary} /></View>
                ) : !hasPermission ? (
                    <View>
                        <Text style={styles.subsection}>{t('import.permissionTitle')}</Text>
                        <Text style={styles.body}>{t('import.permissionDescription')}</Text>
                        <TouchableOpacity
                            accessibilityRole="button"
                            style={styles.action}
                            onPress={canAskAgain ? requestCalendarAccess : () => Linking.openSettings()}
                        >
                            <Text style={styles.actionText}>
                                {canAskAgain ? t('import.grantPermission') : t('import.openSettings')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : calendars.length === 0 ? (
                    <Text style={[styles.body, { marginTop: 12 }]}>{t('import.noCalendars')}</Text>
                ) : (
                    <>
                        <View style={styles.controls}>
                            <Text style={styles.subsection}>{t('import.chooseCalendars')}</Text>
                            <TouchableOpacity accessibilityRole="button" style={styles.textButton} onPress={toggleAllCalendars}>
                                <Text style={[styles.body, { color: colors.secondary }]}>
                                    {selectedIds.size === calendars.length ? t('import.selectNone') : t('import.selectAll')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {calendars.map(calendar => {
                            const selected = selectedIds.has(calendar.id);
                            return (
                                <TouchableOpacity
                                    key={calendar.id}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: selected }}
                                    style={styles.row}
                                    onPress={() => toggleCalendar(calendar.id)}
                                >
                                    <Icon
                                        name={selected ? 'checkbox' : 'square-outline'}
                                        size={22}
                                        color={selected ? colors.secondary : colors.muted}
                                    />
                                    <Text numberOfLines={2} style={styles.rowText}>{calendar.title}</Text>
                                    {calendar.color ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: calendar.color }} /> : null}
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityState={{ disabled: occupe || selectedIds.size === 0 }}
                            disabled={occupe || selectedIds.size === 0}
                            style={[styles.action, (occupe || selectedIds.size === 0) && styles.disabled]}
                            onPress={importerDepuisTelephone}
                        >
                            {importing === 'telephone'
                                ? <ActivityIndicator color={colors.text} />
                                : <Text style={styles.actionText}>{t('import.importButton')}</Text>}
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.separator} />

                {/* ---------- Depuis un fichier .ics ---------- */}
                <Text style={styles.section}>{t('import.icsSection')}</Text>
                <Text style={styles.body}>{t('import.icsDescription')}</Text>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ disabled: occupe }}
                    disabled={occupe}
                    style={[styles.action, occupe && styles.disabled]}
                    onPress={importerDepuisIcs}
                >
                    {importing === 'ics' ? (
                        <ActivityIndicator color={colors.text} />
                    ) : (
                        <>
                            <Icon name="document-outline" size={20} color={colors.text} />
                            <Text style={styles.actionText}>{t('import.chooseFile')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </Container>
    );
}
