import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import catcher from '@/functions/catcher'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'
import Icon from '@react-native-vector-icons/ionicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity } from 'react-native'

/** Lets a signed-in member submit a bug report to the Sync API. */
export default function ReportBug() {
  const { t } = useTranslation('common')
  const { api } = useAPI()
  const { colors } = usePalette()
  const { fonts } = useFont()
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const canSend = description.trim().length > 0 && description.length <= 5000 && !sending

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    try {
      await api.post('/signalements/bugs', { description: description.trim() })
      ToastAbs.show({ type: toastTypes.success, text1: t('bugReport.successTitle'), text2: t('bugReport.successMessage') })
      router.back()
    } catch (error) {
      catcher(error, t('bugReport.submitFailed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('bugReport.close')} style={{ alignSelf: 'flex-end', padding: 8 }}>
          <Icon name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ marginTop: 12, color: colors.text, fontFamily: fonts.title, fontSize: 24 }}>{t('bugReport.title')}</Text>
        <Text style={{ marginTop: 8, color: colors.muted, fontFamily: fonts.body, fontSize: 16 }}>{t('bugReport.instructions')}</Text>
        <TextInput
          accessibilityLabel={t('bugReport.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('bugReport.descriptionPlaceholder')}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={5000}
          textAlignVertical="top"
          style={{ minHeight: 180, marginTop: 20, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.text, fontFamily: fonts.body, backgroundColor: colors.card }}
        />
        <Text style={{ alignSelf: 'flex-end', marginTop: 6, color: colors.muted, fontFamily: fonts.body }}>{description.length}/5000</Text>
        <TouchableOpacity accessibilityRole="button" disabled={!canSend} onPress={submit} style={{ minHeight: 48, marginTop: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? colors.secondary : colors.card }}>
          {sending ? <ActivityIndicator color={colors.text} /> : <Text style={{ color: colors.text, fontFamily: fonts.title, fontSize: 17 }}>{t('bugReport.send')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
