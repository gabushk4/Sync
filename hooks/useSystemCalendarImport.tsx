import { useAPI } from '@/contextes/contexteAPI';
import catcher from '@/functions/catcher';
import { convertirUTCversLocale } from '@/functions/convertirUTCenLocal';
import formaterDatePourServeur from '@/functions/formaterDatePourServeur';
import log from '@/functions/log';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { DateTime } from 'luxon';

export const useSystemCalendarImport = () => {
  const { api } = useAPI();

  const importerCalendrier = async () => {
    try {
      const refusMemoire = await AsyncStorage.getItem('calendar_import_refused');
      if (refusMemoire === 'true') return;

      const { status } = await Calendar.requestCalendarPermissionsAsync();
      
      if (status !== 'granted') {
        await AsyncStorage.setItem('calendar_import_refused', 'true');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const eventIds = calendars.map(c => c.id);
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const events = await Calendar.getEventsAsync(eventIds, startDate, endDate);

      const payload = events.map(ev => ({
        titre: ev.title,
        debut: formaterDatePourServeur(convertirUTCversLocale(DateTime.fromJSDate(new Date(ev.startDate)))),
        fin: formaterDatePourServeur(convertirUTCversLocale(DateTime.fromJSDate(new Date(ev.endDate)))),
        uuid_externe: ev.id,
        source: 'system'
      }));

      await api.request({
        method: "POST",
        url: `/evenements/import`,
        data: { evenements: payload }
      });
      log("Importation du calendrier système réussie");
    } catch (error) {
      catcher(error, "Erreur lors de l'importation du calendrier système");
    }
  };

  return { importerCalendrier };
};