import ModalBase from "@/components/modalBase";

import { usePalette } from "@/contextes/contextePalette";
import { useFont } from "@/contextes/contexteFont";

import React, { View, Text } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useEffect, useRef, useState } from "react";
import { useMembre } from "@/contextes/contexteMembre";
import { useAPI } from "@/contextes/contexteAPI";
import log from "@/functions/log";
import MemberCode from "@/components/memberCode";

export default function QRCodeAbs() {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { membre, getMembre } = useMembre()
    const { APIBaseURL } = useAPI()

    const [qrCodeValue, setQrCodeValue] = useState<string>('')

    const createQrCodeValue = async ()=>{
        if (!membre.idPublique) {
            console.warn('id publique du membre introuvable');
            return;
        }

        // Génère un objet clair pour le QR
        const payload = {
            action: 'demande_ami',
            method: 'post',
            url: APIBaseURL + '/amis/demandes/',
            body: {
                id_destinataire: membre.idPublique,
            }
        }
        const strPayload = JSON.stringify(payload)
        log('qr code set payload', strPayload)
        setQrCodeValue(JSON.stringify(payload))
    }

    useEffect(() => {
        createQrCodeValue()
    }, [])

    return(
        <View style={{width:'100%', height:'100%', alignItems:'center', justifyContent:'center', gap:'4%'}}>
            {qrCodeValue.length > 0 &&
                <QRCode
                    value={qrCodeValue}
                    size={248}
                    color={colors.text}                                
                    backgroundColor={colors.card}
                    quietZone={8}
                />
            }
            <MemberCode code={membre.idPublique??'...'} size={18} />
        </View>
    )
}