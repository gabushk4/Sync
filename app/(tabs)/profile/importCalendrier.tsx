import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'

import Icon from "@react-native-vector-icons/ionicons"

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import { useAPI } from '@/contextes/contexteAPI'
import { useMembre } from '@/contextes/contexteMembre'

import parseIcs from '@/functions/parseIcs'
import { choisirFichierIcs, dedupliquerEtDetecterConflits } from '@/functions/importCalendar'
import { definirImportEnCours } from '@/functions/importStaging'
import { convertirUTCversLocale } from '@/functions/convertirUTCenLocal'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'
import catcher from '@/functions/catcher'
import log from '@/functions/log'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'

/**
 * Story #7 (Isma) : "En tant que membre, j'aimerais importer un calendrier
 * grâce à un fichier .ics afin d'importer depuis n'importe quelle plateforme
 * des évènements déjà à mon horaire."
 *
 * Flux :
 *  1. choisir un fichier .ics (expo-document-picker)
 *  2. parser (functions/parseIcs.js) → liste d'évènements bruts
 *  3. dédupliquer contre l'horaire existant + détecter les conflits
 *     (functions/importCalendar.js)
 *  4. s'il n'y a aucun conflit → import direct
 *     s'il y a des conflits    → navigation vers l'écran de résolution
 *     (modals/resolutionConflitImport.tsx)
 */




export default function ImporterCalendrier(){
    const {colors} = usePalette()
    const { fonts } = useFont()
    const {api} = useAPI()
    const { membre } = useMembre()

    const [enCours,setEnCours] = useState(false)

    const importerVersServeur = async (evenements: any[]) => {
        await api.post('/evenements/import',{
            evenements: evenements.map((ev) => ({
                uid: ev.uid,
                titre: ev.titre,
                description: ev.description ?? '',
                debut: formaterDatePourServeur(convertirUTCversLocale(ev.debut)),
                fin: formaterDatePourServeur(convertirUTCversLocale(ev.fin)),
                source:'ics'
            }) ),
        })
    }

    const demarrerImport = async () => {
        try {
            const texteIcs = await choisirFichierIcs()
            if(!texteIcs) return
            
            setEnCours(true)

            const evenementsImportes = parseIcs(texteIcs)
            if(evenementsImportes.length === 0){
                ToastAbs.show({type: toastTypes.warning,text1: 'fichier vide',text2: 'Veuillez sélectionner un fichier .ics valide.',text3: 'aucun événement trouvé'})
                return
            }

            const reponse = await api.get('/evenements')
            const evenementsExistants = (reponse.data?.evenements ?? []).map((ev:any) => ({
                ...ev,
                titre: ev.titre,
                debut: convertirUTCversLocale(ev.debut),
                fin: convertirUTCversLocale(ev.fin),
            }))
            const { aImporter , ignores,conflits} = dedupliquerEtDetecterConflits(evenementsImportes, evenementsExistants)

            log('import ics', { aImporter: aImporter.length, ignores: ignores.length, conflits: conflits.length })

            if(conflits.length > 0){
                definirImportEnCours({ aImporter, ignores, conflits })
                router.push('/(modals/resolutionConflitImport)')
                return
            }
            if(aImporter.length > 0){
                await importerVersServeur(aImporter)
            }

            ToastAbs.show({
                type: toastTypes.success,
                text1: 'importation réussie',
                text2: `${aImporter.length} événement(s) importé(s)`,
            })
            router.back()
        } catch (error) {
            catcher(error,'erreur lors de l\'importation')
        } finally {
            setEnCours(false)
        }
    }
    return (
        <View style={[styles.conteneur, { backgroundColor: colors.background }]}>
            <Icon name="calendar-outline" size={56} color={colors.muted} />
            <Text style={[styles.titre, { color: colors.text, fontFamily: fonts.title }]}>
                importer un calendrier
            </Text>
            <Text style={[styles.description, { color: colors.muted, fontFamily: fonts.body }]}>
                choisis un fichier .ics exporté depuis Google Agenda, Outlook, Apple
                Calendar ou toute autre plateforme. les évènements déjà présents dans
                sync (même identifiant, mêmes heures, même titre) seront ignorés
                automatiquement, et on te demandera quoi faire en cas de conflit
                d'horaire.
            </Text>

            <TouchableOpacity
                onPress={demarrerImport}
                disabled={enCours}
                style={[styles.bouton, { backgroundColor: colors.secondary, opacity: enCours ? 0.6 : 1 }]}
            >
                {enCours
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.boutonTexte}>choisir un fichier .ics</Text>
                }
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    conteneur: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
    titre: { fontSize: 20, marginTop: 8 },
    description: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
    bouton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, minWidth: 220, alignItems: 'center' },
    boutonTexte: { color: 'white', fontFamily: 'Karla-Medium', fontSize: 15 },
})