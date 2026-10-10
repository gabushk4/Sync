import React, { useState, useRef } from 'react';
import {View, } from 'react-native'
import { usePalette } from '@/contextes/contextePalette';
import { useAPI } from '@/contextes/contexteAPI';
import { useFocusEffect } from 'expo-router/react-navigation';
import log from '@/functions/log';

const PingServeur = () => {
  const { colors } = usePalette()
  const { api } = useAPI()

  const [statutServeur, setStatutServeur] = useState('inconnu'); // États possibles: 'inconnu', 'vert', 'jaune', 'rouge'
  const timeoutRef = useRef<number | null>(null);
  const ping = async () => {
    try {
      const debut = Date.now();
      await api.get('/'); // Ping endpoint
      const delai = Date.now() - debut;

      setStatutServeur(delai < 300 ? colors.success : colors.warning); // Weak latency = yellow, good latency = green 
    } catch (error : any) {
      log('erreur ping', error.message, 'code:', error)
      switch (error.code) {
        case 'ECONNABORTED':
        case 'ENOTFOUND':
        case 'ECONNREFUSED':
        case 'EHOSTUNREACH':
        case 'ERR_BAD_RESPONSE':
            setStatutServeur(colors.error); // Server is down
          break;
        default:
          setStatutServeur(colors.background); // Client network issue (Member's Internet)
          break;
      }
    }
  }

  useFocusEffect(React.useCallback(() => {
    ping()

    timeoutRef.current = setInterval(() => {
      ping()
    }, 10000)

    return (() => {
      log('clear interval ping')
      if (timeoutRef.current !== null)
        clearInterval(timeoutRef.current)
    })
  }, [])); // Ne se lance qu'une seule fois au montage du composant

  

  // Affichage d'un badge avec l'état actuel
  return (
    <View style={{height:'100%', width:'100%', borderRadius:100, borderWidth:1, borderColor:colors.border, overflow:'hidden', backgroundColor:statutServeur === 'inconnu'?colors.muted:statutServeur}}>

    </View>
  );
}

export default PingServeur;