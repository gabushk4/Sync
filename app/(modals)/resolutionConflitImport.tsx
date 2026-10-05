import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import { useAPI } from '@/contextes/contexteAPI'

import ConflitImportItem, { ResolutionConflit } from '@/components/conflitImportItem'
import { obtenirImportEnCours, viderImportEnCours } from '@/functions/importStaging'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'
import catcher from '@/functions/catcher'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'

export default function ResolutionConflitImport(){
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { api } = useAPI()
    const insets = useSafeAreaInsets()

    const etat = useMemo(() => obtenirImportEnCours(),[])
    const conflits = etat?.conflits ?? []
    const aImporter = etat?.aImporter ?? []

    const [resolutions,setResolutions] = useState<Record<number,ResolutionConflit>>({})
    const [enConfirmation,setEnConfirmation] = useState(false)

    const toutesResolues = conflits.length === 0 || conflits.every((_:any, i:number) => resolutions[i])

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
            if(evenementsFinal.length > 0){
                await api.post('/evenements/import',{
                    evenements: evenementsFinal.map((ev:any) =>({
                        uid: ev.uid,
                        titre: ev.titre,
                        description: ev.description ?? '',
                        debut: formaterDatePourServeur(ev.debut.toUTC()),
                        fin: formaterDatePourServeur(ev.fin.toUTC()),
                        source:'ics'

                    }))
                })
            }
            ToastAbs.show({
                type: toastTypes.success,
                text1: 'import terminé',
                text2: `${evenementsFinal.length} évènement(s) importé(s)`,
            })

            viderImportEnCours()
            router.back()
            router.back()

         } catch (error) {
            catcher(error,"erreur lors de la résolution des conflits d'import")
         }finally{
            setEnConfirmation(false)
         }
    }
    return (
        <View style={[styles.conteneur, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <Text style={[styles.titre, { color: colors.text, fontFamily: fonts.title }]}>
                {conflits.length} conflit{conflits.length > 1 ? 's' : ''} d'horaire détecté{conflits.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.sousTitre, { color: colors.muted, fontFamily: fonts.body }]}>
                ces évènements importés occupent le même créneau qu'un évènement déjà présent dans sync
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
                    {toutesResolues ? "confirmer l'import" : 'choisis une option pour chaque conflit'}
                </Text>
            </TouchableOpacity>
        </View>
    )
}






const styles = StyleSheet.create({
    conteneur: { flex: 1, paddingHorizontal: 20 },
    titre: { fontSize: 19, marginBottom: 4 },
    sousTitre: { fontSize: 13, marginBottom: 8 },
    boutonConfirmer: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    boutonTexte: { color: 'white', fontFamily: 'Karla-Medium', fontSize: 15 },
})
