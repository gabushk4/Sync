import { useEffect, useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '@react-native-vector-icons/ionicons'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import { useAPI } from '@/contextes/contexteAPI'
import { useTranslation } from 'react-i18next'

import ConflitImportItem, { ResolutionConflit } from '@/components/conflitImportItem'
import { obtenirImportEnCours, viderImportEnCours } from '@/functions/importStaging'
import { envoyerEvenements } from '@/functions/importCalendar'
import catcher from '@/functions/catcher'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'

export default function ResolutionConflitImport(){
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { t } = useTranslation('calendar')
    const { api } = useAPI()
    const insets = useSafeAreaInsets()

    const etat = useMemo(() => obtenirImportEnCours(),[])
    const conflits = etat?.conflits ?? []
    const aImporter = etat?.aImporter ?? []
    const ignores = etat?.ignores ?? []

    const [resolutions,setResolutions] = useState<Record<number,ResolutionConflit>>({})
    const [enConfirmation,setEnConfirmation] = useState(false)

    const toutesResolues = conflits.length === 0 || conflits.every((_:any, i:number) => resolutions[i])

    // l'import en attente ne doit pas survivre à cet écran (bouton Annuler, retour Android...)
    useEffect(() => () => viderImportEnCours(), [])

    /** Revenir à l'écran d'import sans rien importer : on pourra relancer l'import plus tard. */
    const annuler = () => {
        viderImportEnCours()
        router.back()
    }

    const choisir = (index:number, resolution: ResolutionConflit) => {
        setResolutions((prev) => ({...prev,[index]: resolution}))
    }

    const confirmer = async () => {
         setEnConfirmation(true)
         try {
            const evenementsFinal= [...aImporter]
            
            conflits.forEach((conflit:any, i: number) => {
                const resolution = resolutions[i]
                if(resolution === 'garder_importe' || resolution === 'garder_les_deux'){
                    evenementsFinal.push(conflit.importe)
                }
            })
            // même envoi que l'écran d'import (functions/importCalendar.js)
            const resultat = await envoyerEvenements(api, evenementsFinal)
            ToastAbs.show({
                type: toastTypes.success,
                text1: t('import.title'),
                text2: t('import.success', {
                    imported: resultat.importes + resultat.misAJour,
                    duplicates: ignores.length + resultat.doublons,
                }),
            })

            viderImportEnCours()
            router.back() // ferme la modale
            router.back() // quitte l'écran d'import

         } catch (error) {
            catcher(error, t('import.failed'))
         }finally{
            setEnConfirmation(false)
         }
    }
    return (
        <View style={[styles.conteneur, { backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
                onPress={annuler}
                disabled={enConfirmation}
                accessibilityRole="button"
                accessibilityLabel={t('import.cancelImport')}
                hitSlop={12}
                style={[styles.boutonAnnuler, enConfirmation && { opacity: 0.4 }]}
            >
                <Icon name="chevron-back" size={22} color={colors.secondary} />
                <Text style={{ color: colors.secondary, fontFamily: fonts.body, fontSize: 16 }}>{t('import.cancelImport')}</Text>
            </TouchableOpacity>

            <Text style={[styles.titre, { color: colors.text, fontFamily: fonts.title }]}>
                {t('import.conflictsTitle', { count: conflits.length })}
            </Text>
            <Text style={[styles.sousTitre, { color: colors.muted, fontFamily: fonts.body }]}>
                {t('import.conflictsDescription')}
            </Text>

            <FlatList
                data={conflits}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{ paddingVertical: 12 }}
                renderItem={({ item, index }) => (
                    <ConflitImportItem
                        importe={item.importe}
                        existant={item.existant}
                        resolution={resolutions[index]}
                        onChoisir={(resolution) => choisir(index, resolution)}
                    />
                )}
            />

            <TouchableOpacity
                onPress={confirmer}
                disabled={!toutesResolues || enConfirmation}
                style={[styles.boutonConfirmer, { backgroundColor: colors.secondary, opacity: toutesResolues ? 1 : 0.4 }]}
            >
                <Text style={styles.boutonTexte}>
                    {toutesResolues ? t('import.confirmImport') : t('import.chooseEachConflict')}
                </Text>
            </TouchableOpacity>
        </View>
    )
}






const styles = StyleSheet.create({
    conteneur: { flex: 1, paddingHorizontal: 20 },
    boutonAnnuler: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, marginLeft: -6, paddingVertical: 8, marginBottom: 8 },
    titre: { fontSize: 19, marginBottom: 4 },
    sousTitre: { fontSize: 13, marginBottom: 8 },
    boutonConfirmer: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    boutonTexte: { color: 'white', fontFamily: 'Karla-Medium', fontSize: 15 },
})
