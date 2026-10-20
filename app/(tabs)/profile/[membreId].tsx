import ProfilPic from '@/components/pfp'
import WidgetDisposCommunes from '@/components/widgetDisposCommunes'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import catcher from '@/functions/catcher'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router/react-navigation'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

type FriendProfile = {
  pseudo: string
  bio: string | null
  fp_url: string | null
  etat_ame: string | null
}

/** Displays a friend's public profile and their mood when the friendship allows it. */
export default function MemberProfil() {
  const { t } = useTranslation('profile')
  const { membreId } = useLocalSearchParams<{ membreId: string }>()
  const { api } = useAPI()
  const { colors } = usePalette()
  const { fonts } = useFont()
  const { membre } = useMembre()
  const [profile, setProfile] = useState<FriendProfile | null>(null)
  // Friends only (and not on one's own profile): the common availabilities widget.
  // Philip — user story 25.
  const [estAmi, setEstAmi] = useState(false)
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    let active = true
    setLoading(true)
    api.get(`/membres/${encodeURIComponent(membreId)}`)
      .then(({ data }) => {
        if (!active) return
        setProfile(data.profil)
        setEstAmi(!!data.estAmi && data.id_publique !== membre.idPublique)
      })
      .catch((error) => catcher(error, t('errors.loadFriendProfileFailed')))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, membreId, membre.idPublique, t]))

  // Spinner only before the first answer: reloading on focus (e.g. back from creating
  // an event from the widget) keeps the page, so the widget keeps its week.
  // Philip — user story 25.
  if (loading && !profile) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.text} /></View>
  if (!profile) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{ color: colors.text, fontFamily: fonts.body }}>{t('errors.friendProfileUnavailable')}</Text></View>

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: 24, backgroundColor: colors.background }}>
      <ProfilPic size={120} pfp={profile.fp_url ?? undefined} />
      <Text style={{ marginTop: 16, color: colors.text, fontFamily: fonts.title, fontSize: 24 }}>@{profile.pseudo}</Text>
      <View style={{ width: '100%', padding: 16, marginTop: 24, borderRadius: 12, backgroundColor: colors.card }}>
        <Text style={{ color: colors.muted, fontFamily: fonts.title, fontSize: 16 }}>{t('friendMood')}</Text>
        <Text style={{ marginTop: 8, color: colors.text, fontFamily: fonts.body, fontSize: 18 }}>
          {profile.etat_ame?.trim() || t('moodEmpty')}
        </Text>
      </View>
      <View style={{ width: '100%', padding: 16, marginTop: 12, borderRadius: 12, backgroundColor: colors.card }}>
        <Text style={{ color: colors.muted, fontFamily: fonts.title, fontSize: 16 }}>{t('edit.bioLabel')}</Text>
        <Text style={{ marginTop: 8, color: colors.text, fontFamily: fonts.body, fontSize: 16 }}>{profile.bio?.trim() || t('bioEmpty')}</Text>
      </View>
      {/* Widgets, under the profile's info (user story 25). */}
      {estAmi && (
        <WidgetDisposCommunes ami={{ id: membreId, pseudo: profile.pseudo, fp_url: profile.fp_url }} />
      )}
    </ScrollView>
  )
}
