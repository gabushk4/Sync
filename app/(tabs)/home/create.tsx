import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme, View } from 'react-native';
import Toast from "react-native-toast-message";

import { useActionFab } from "@/hooks/useActionFAB";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useInvites } from "@/contextes/contexteInvites";
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";
import { useAccessToken } from "@/contextes/contexteToken";

import EventForm from "@/components/eventForm";
import catcher from "@/functions/catcher";
import log from "@/functions/log";
import { defaultEvent, Event } from "@/types/calendar";
import Icon from "@react-native-vector-icons/ionicons";

import { EventFormHandle } from "@/components/eventForm";
import formaterDatePourServeur from "@/functions/formaterDatePourServeur";
import { convertirLocalVersUTC } from "@/functions/convertirUTCenLocal";
import { DateTime } from "luxon";
import { Participant } from "@/types/invites";
import { toastTypes } from "@/constants/toastConfig";
import ToastAbs from "@/abstractions/toastAbs";

export default function CreateEvent({ }) {
    const { colors } = usePalette()
    const colorScheme = useColorScheme()
    const { fonts } = useFont()
    
    const {api} = useAPI()
    const {invites, resetInvites} = useInvites()
    const {membre, getMembre} = useMembre()
    const { getToken } = useAccessToken()
    const router = useRouter()
    
    const formRef = useRef<EventFormHandle>(null)

    const { start, end, friend } = useLocalSearchParams()
    
    const diffNowStart = DateTime.fromISO(start as string).diff(DateTime.now(), 'hours').hours
    const minimumStart = diffNowStart > 1 ? DateTime.fromISO(start as string) : DateTime.now().plus({hours:1})

    const [enChargement, setEnChargement] = useState(false)
    
    //log('setter end')

    const [event, setEvent] = useState<Event>(defaultEvent)

    const postEvenement = async () => {
        try {
            const values = formRef.current?.getValues()
            if (!values) {
                log('no values')
                return
            }

            log('post event', values)

            let valid = true
            let errorMessage = "Erreur inconnue"

            if (values.titre && values.titre.length < 4) {
                valid = false
                errorMessage = `Le titre doit avoir plus que 4 caractères; titre: ${values.titre}`
            }

            if (valid) {
                setEnChargement(true)

                const response = await api.post(
                    '/evenements/',
                    {
                        ...event, 
                        titre: values.titre,
                        description: values.description,
                        prive: values.prive,
                        debut: formaterDatePourServeur(convertirLocalVersUTC(values.start)), 
                        fin: formaterDatePourServeur(convertirLocalVersUTC(values.end)),
                        regle_recurrence: values.regleRecurrence,
                        participants: invites.map((i) => ({ id: i.id, privilege: i.privilege }))
                    }
                )

                if (response.status == 201) {
                    ToastAbs.show({
                        type: toastTypes.success,
                        text1: 'évènement ajouté',
                        text2: 'tu peux te détendre, c\'est enregistré',
                        autoHide: true,
                    })
                    router.replace('/(tabs)/home')
                }
            } else {
                ToastAbs.show({ type: toastTypes.error, text2: errorMessage })
            }
        } catch (error: any) {
            catcher(error, 'erreur lors de l\'upload')
            if (error.response?.status == 409) {
                const evenementEnConflit = error.response.data.evenement
                log('evenement en conflit', evenementEnConflit)
            }
        } finally {
            setEnChargement(false)
        }
    }

    useActionFab({
        action: postEvenement,
        icon: <Icon name="checkmark" color={colors.text} size={28} />
    })

    useFocusEffect(useCallback(()=>{  
        return ()=>{
            resetInvites()  
        }
    },[]))

    useEffect(() => {
        log("email confirme", membre.emailConfirme)
        if(!membre.emailConfirme)
            getMembre()
    }, [])

    useEffect(()=>{
        log('email confirme', membre.emailConfirme)
    }, [membre.emailConfirme])

    useEffect(() => {
        //log("useEffect event", event)
        log("create opens with", {start: start, end: end, minimumStart: minimumStart})
    }, [event])

    return true
        ?(       
            <EventForm
                ref={formRef}
                event={event}
                mode={'create'}
                prefills={{
                    start: minimumStart ?? undefined,
                    end: end ? DateTime.fromISO(end as string) : undefined,
                    participants: friend ? [JSON.parse(friend as string)] as Array<Participant> : undefined
                }}
                constraints={{
                    maximumStart: end ? DateTime.fromISO(end as string) : undefined,
                    minimumStart: minimumStart ?? undefined
                }}
            />
        )
        :(<View/>)
    
}