import TextInputAbs from '@/abstractions/textInputAbs';
import ToastAbs from '@/abstractions/toastAbs';
import TouchableOpacityAbs from '@/abstractions/touchableOpacityAbs';
import { toastTypes } from '@/constants/toastConfig';
import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import catcher from '@/functions/catcher';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SignalerBugModal() {
  const [description, setDescription] = useState('');
  
  const { api } = useAPI();
  const { colors } = usePalette();
  const { fonts } = useFont();
  const router = useRouter();

  const soumettreBug = async () => {
    if (!description.trim()) {
      ToastAbs.show({
          type: toastTypes.error,
          text2: "La description ne peut pas être vide."
      });
      return;
    }
    
    try {
      const response = await api.request({
        method: "POST",
        url: `/signalements/bugs`,
        data: { description }
      });
      
      ToastAbs.show({
          type: toastTypes.success,
          text2: response.data.message
      });

      router.back(); 
    } catch (error) {
      catcher(error, "Erreur lors de l'envoi du signalement");
      ToastAbs.show({
          type: toastTypes.error,
          text2: "Une erreur est survenue lors de l'envoi."
      });
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, padding: 20, gap: 16 },
    title: { fontSize: 20, textAlign: 'center', marginBottom: 8 },
    desc: { fontSize: 14, marginBottom: 16 },
    button: { marginTop: 'auto', padding: 12, borderRadius: 8, alignItems: 'center' },
    buttonText: { fontSize: 16 }
  });

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Text style={[s.title, { fontFamily: fonts.title, color: colors.text }]}>
        Signaler un problème
      </Text>
      
      <Text style={[s.desc, { fontFamily: fonts.body, color: colors.muted }]}>
        Expliquez en détail ce que vous faisiez avant que le bug ne survienne. Cela aidera nos développeurs !
      </Text>

      <TextInputAbs 
        placeholder="Je cliquais sur le bouton..."
        value={description}
        onChangeText={setDescription}
        multiline={true}
        numberOfLines={8}
        style={{ minHeight: 180, textAlignVertical: 'top' }}
      />
      
      <TouchableOpacityAbs 
        onPress={soumettreBug} 
        style={[s.button, { backgroundColor: colors.secondary }]}
      >
        <Text style={[s.buttonText, { fontFamily: fonts.title, color: '#fff' }]}>
            Envoyer le signalement
        </Text>
      </TouchableOpacityAbs>
    </View>
  );
}