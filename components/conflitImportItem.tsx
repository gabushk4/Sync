import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'

import { convertirTimestampDateLongue, convertirTimestampHeure } from '@/functions/convertirTimestamp'

export type ResolutionConflit = 'garder_existant' | 'garder_importe' | 'garder_les_deux'


type Props = {
    importe: { source_id?: string; titre?: string; debut: any; fin?: any }
    existant: { id_publique?: string; titre?: string; debut?: any; fin?: any }
    resolution : ResolutionConflit | undefined
    onChoisir: (resolution: ResolutionConflit) => void
}
/**
 * Affiche un conflit détecté à l'import .ics (story #7) : l'évènement importé
 * et celui déjà présent qui occupe exactement le même créneau, avec 3 choix
 * de résolution — même patron que prévoirait la story #8 (conflit à la
 * création d'un évènement), afin de pouvoir réutiliser ce composant plus tard.
 */

export default function ConflitImportItem({importe,existant,resolution,onChoisir}: Props){
    const {colors} = usePalette()
    const {fonts} = useFont()

    const Choix = ({valeur,label}:{valeur: ResolutionConflit; label: string}) =>{
        const actif = resolution === valeur
        return(
            <TouchableOpacity
                onPress={() => onChoisir(valeur)}
                style={[
                    styles.choix,
                    { borderColor: actif ? colors.secondary : colors.border, backgroundColor: actif ? colors.secondary : 'transparent' },
                ]}
            >
                <Text style={{ color: actif ? 'white' : colors.text, fontFamily: fonts.body, fontSize: 13 }}>{label}</Text>
            </TouchableOpacity>
        )
    }
    return (
        <View style={[styles.carte, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginBottom: 6 }}>
                {convertirTimestampDateLongue(importe.debut)} · {convertirTimestampHeure(importe.debut)}–{convertirTimestampHeure(importe.fin)}
            </Text>

            <View style={styles.paire}>
                <View style={styles.evenementBloc}>
                    <Text style={[styles.etiquette, { color: colors.muted, fontFamily: fonts.body }]}>déjà dans sync</Text>
                    <Text style={{ color: colors.text, fontFamily: fonts.title }} numberOfLines={2}>
                        {existant.titre ?? '(privé)'}
                    </Text>
                </View>
                <Text style={{ color: colors.muted }}>vs</Text>
                <View style={styles.evenementBloc}>
                    <Text style={[styles.etiquette, { color: colors.muted, fontFamily: fonts.body }]}>importé du .ics</Text>
                    <Text style={{ color: colors.text, fontFamily: fonts.title }} numberOfLines={2}>
                        {importe.titre ?? '(sans titre)'}
                    </Text>
                </View>
            </View>

            <View style={styles.choixConteneur}>
                <Choix valeur="garder_existant" label="garder celui de sync" />
                <Choix valeur="garder_importe" label="garder celui importé" />
                <Choix valeur="garder_les_deux" label="garder les deux" />
            </View>
        </View>
    )
}


const styles = StyleSheet.create({
    carte: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
    paire: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    evenementBloc: { flex: 1 },
    etiquette: { fontSize: 11, marginBottom: 2 },
    choixConteneur: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    choix: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
})
