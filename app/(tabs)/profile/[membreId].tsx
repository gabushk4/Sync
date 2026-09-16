import ProfilPic from '@/components/pfp';
import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import catcher from '@/functions/catcher';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

export default function MemberProfil() {
    const { t } = useTranslation('profile')

    const {membreId} = useLocalSearchParams()
export default function FriendProfile() {
  const { membreId } = useLocalSearchParams();
  const { api } = useAPI();
  const { colors } = usePalette();
  const { fonts } = useFont();
  
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const res = await api.request({ method: 'GET', url: `/membres/${membreId}` });
        setData(res.data);
      } catch (error) {
        catcher(error, "Impossible de récupérer le profil");
      }
    };
    fetchProfil();
  }, [membreId]);

  if (!data) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', paddingTop: 40 },
    card: { padding: 16, marginTop: 24, borderRadius: 8, borderWidth: 1, width: '90%' },
    photo: { borderRadius: 100, overflow: 'hidden' }
  });

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ProfilPic pfp={data.profil.avatar} size={100} style={s.photo} />
      
      <Text style={{ fontFamily: fonts.title, color: colors.text, fontSize: 24, marginTop: 16 }}>
        {data.profil.nom || data.profil.pseudo}
      </Text>
      
      {data.estAmi ? (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontFamily: fonts.title, color: colors.text, marginBottom: 8, fontSize: 18 }}>
            États d'âme
          </Text>
          <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 16 }}>
            {data.profil.etat_ame || 'Aucun état défini pour le moment.'}
          </Text>
        </View>
      ) : (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontFamily: fonts.body, color: colors.warning, fontSize: 16, textAlign: 'center' }}>
            Vous devez être ami avec ce membre pour voir ses états d'âme.
          </Text>
        </View>
      )}
    </View>
  );
    return (
        <Text >
            {t('memberIdLabel')}: {membreId}
        </Text>
    )
}