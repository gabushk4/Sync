import Container from '@/abstractions/container';
import ToastAbs from '@/abstractions/toastAbs';
import Radius from '@/constants/Radius';
import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import catcher from '@/functions/catcher';
import { toastTypes } from '@/constants/toastConfig';
import Icon from '@react-native-vector-icons/ionicons';
import * as Calendar from 'expo-calendar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const IMPORT_BATCH_SIZE = 100;
const IMPORT_YEARS_AHEAD = 5;

type ImportableEvent = {
    source_calendar_id: string;
    source_event_id: string;
    titre: string;
    description: string;
    debut: string;
    fin: string;
};

/**
 * Lets a member choose device calendars and import their upcoming events into Sync.
 * @returns {JSX.Element} Calendar import screen.
 */
export default function ImportCalendarScreen() {
    const { t } = useTranslation('calendar');
    const { api } = useAPI();
    const { colors } = usePalette();
    const { fonts } = useFont();
    const router = useRouter();

    const [calendars, setCalendars] = useState<Calendar.ExpoCalendar[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [hasPermission, setHasPermission] = useState(false);
    const [canAskAgain, setCanAskAgain] = useState(true);
    const [loadingCalendars, setLoadingCalendars] = useState(true);
    const [importing, setImporting] = useState(false);

    const styles = StyleSheet.create({
        content: { paddingHorizontal: 16, paddingBottom: 32 },
        heading: { color: colors.text, fontFamily: fonts.title, fontSize: 22, marginBottom: 8 },
        body: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
        section: { marginTop: 24, marginBottom: 8, color: colors.text, fontFamily: fonts.title, fontSize: 18 },
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
        controls: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, marginBottom: 8 },
        textButton: { padding: 8 },
        action: {
            marginTop: 24,
            minHeight: 52,
            paddingHorizontal: 16,
            borderRadius: Radius.md,
            backgroundColor: colors.secondary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        actionText: { color: colors.text, fontFamily: fonts.title, fontSize: 17 },
        disabled: { opacity: 0.5 },
        center: { paddingVertical: 24, alignItems: 'center' },
    });

    /** Loads the calendar permission state and the calendars available on this device. */
    const loadDeviceCalendars = useCallback(async () => {
        setLoadingCalendars(true);
        try {
            const permission = await Calendar.getCalendarPermissions();
            setHasPermission(permission.granted);
            setCanAskAgain(permission.canAskAgain);

            if (!permission.granted) {
                setCalendars([]);
                setSelectedIds(new Set());
                return;
            }

            const deviceCalendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
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
            const permission = await Calendar.requestCalendarPermissions();
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

    /** Sends a batch of imported events to the API and returns its import and duplicate counts. */
    const sendEventBatch = async (events: ImportableEvent[]) => {
        const response = await api.post('/evenements/import', { evenements: events });
        return {
            imported: Number(response.data.importes ?? 0),
            duplicates: Number(response.data.doublons ?? 0),
        };
    };

    /** Imports selected calendar events from the last week through the next five years. */
    const importSelectedEvents = async () => {
        if (selectedIds.size === 0) {
            ToastAbs.show({ type: toastTypes.error, text2: t('import.selectCalendar') });
            return;
        }

        setImporting(true);
        try {
            const selectedCalendars = calendars.filter(calendar => selectedIds.has(calendar.id));
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + IMPORT_YEARS_AHEAD);

            const systemEvents = await Calendar.listEvents(selectedCalendars, startDate, endDate);
            const events: ImportableEvent[] = systemEvents.flatMap(event => {
                const start = new Date(event.startDate);
                const end = new Date(event.endDate);
                if (event.status === Calendar.EventStatus.CANCELED || !event.id || !event.calendarId || !Number.isFinite(start.getTime())
                    || !Number.isFinite(end.getTime()) || end <= start) return [];

                const details = [event.notes?.trim(), event.location?.trim()]
                    .filter((value): value is string => Boolean(value));
                return [{
                    source_calendar_id: event.calendarId,
                    source_event_id: event.id,
                    titre: (event.title?.trim() || t('import.untitled')).slice(0, 255),
                    description: details.join('\n'),
                    debut: start.toISOString(),
                    fin: end.toISOString(),
                }];
            });

            if (events.length === 0) {
                ToastAbs.show({ type: toastTypes.success, text2: t('import.nothingToImport') });
                return;
            }

            let imported = 0;
            let duplicates = 0;
            for (let index = 0; index < events.length; index += IMPORT_BATCH_SIZE) {
                const result = await sendEventBatch(events.slice(index, index + IMPORT_BATCH_SIZE));
                imported += result.imported;
                duplicates += result.duplicates;
            }

            ToastAbs.show({
                type: toastTypes.success,
                text1: t('import.title'),
                text2: t('import.success', { imported, duplicates }),
            });
            router.back();
        } catch (error) {
            catcher(error, t('import.failed'));
        } finally {
            setImporting(false);
        }
    };

    return (
        <Container style={{ backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.heading}>{t('import.title')}</Text>
                <Text style={styles.body}>{t('import.description')}</Text>

                {loadingCalendars ? (
                    <View style={styles.center}><ActivityIndicator color={colors.secondary} /></View>
                ) : !hasPermission ? (
                    <View>
                        <Text style={[styles.section, { marginTop: 24 }]}>{t('import.permissionTitle')}</Text>
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
                    <Text style={[styles.body, { marginTop: 24 }]}>{t('import.noCalendars')}</Text>
                ) : (
                    <>
                        <Text style={styles.section}>{t('import.chooseCalendars')}</Text>
                        <View style={styles.controls}>
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
                            accessibilityState={{ disabled: importing || selectedIds.size === 0 }}
                            disabled={importing || selectedIds.size === 0}
                            style={[styles.action, (importing || selectedIds.size === 0) && styles.disabled]}
                            onPress={importSelectedEvents}
                        >
                            {importing ? <ActivityIndicator color={colors.text} /> : <Text style={styles.actionText}>{t('import.importButton')}</Text>}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </Container>
    );
}
