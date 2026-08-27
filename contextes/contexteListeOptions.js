import { useNavigation } from "@react-navigation/native";
import { useState, createContext, useContext, useEffect, } from "react";

import { useMembre } from "./contexteMembre";
import { useTheme } from "./contexteTheme";
import { useAPI } from "./contexteAPI";
import log from "../fonctions/log";

export const ListeOptionsContexte = createContext()

export const ListeOptionsProvider = ({ children }) =>{
  const navigation = useNavigation()
  const {theme} = useTheme()
  const {fp} = useMembre()
  const {APIBaseURL} = useAPI()

  const [options, setOptions] = useState([])

  const optionsBase = [
        {titre:'separateur'},
        {titre:'calendrier', 
            icon:theme.darkTheme?require('../assets/icones/sync-dark-icon.png'):require('../assets/icones/sync-light-icon.png'), 
            onPress:()=>{
              navigation.navigate('calendrier')
            }, 
            optionData:[              
                
            ], //Fonction qui return un objet
          renderItem: (item, index, data) => renderItemEvenementBloc(item, index, data)
        },        
        {titre:'profil',
            icon:fp
              ? { uri:fp.uri??`${APIBaseURL}${fp}`}
              : theme.darkTheme
                ? require('../assets/icones/profil-dark-icon.png')
                : require('../assets/icones/profil-light-icon.png'), 
            onPress:()=>{
              navigation.navigate('profil', {version:'membre', id_publique:'self'})},
            optionData:[], //Fonction qui return un objet
            renderItem:(item, index)=>{}
        }, 
        {titre:'messagerie',
            icon:theme.darkTheme?require('../assets/icones/message-dark-icon96.png'):require('../assets/icones/message-light-icon96.png'), 
            onPress:()=>{
              navigation.navigate('messagerie')}, 
            optionData:[],//Fonction qui return un objet
            renderItem:(item, index)=>{}
        },
        {titre:'parametres', 
            icon:theme.darkTheme?require('../assets/icones/parametres-dark-icon.png'):require('../assets/icones/parametres-light-icon.png'),
            onPress:()=>{
              navigation.navigate('paramètres')
            }, 
            optionData:[],//Fonction qui return un objet
            renderItem:(item, index)=>{

            }
        },
        /* {titre:'éditer',
            icon:theme.darkTheme?require('../assets/icones/edit-dark-icon.png'):require('../assets/icones/edit-light-icon.png'),
            onPress:()=>{             
              modifierModeEdit()
            }, 
            optionData:[],//Fonction qui return un objet
            renderItem:(item, index)=>{
            }
        } */
  ]  

  useEffect(()=>{
    const optionsC = [...options]
    //log("options avant: ", optionsC)
    if(optionsC.length > 0){
      const indexProfil = optionsC.findIndex(o => o.titre == 'profil')
      if(indexProfil>=0){
        optionsC[indexProfil].icon = {uri: `${APIBaseURL}${fp}`}
        //log("options apres: ", optionsC)
        setOptions([...optionsC])
      }
    }    
  }, [fp])

  //liste     
  const [header, setHeader] = useState()

  const modifierOptions = (nouvOptions, ecranCourant)=>{
    const optionsC = []
    optionsBase.forEach((option)=>{        
      if(option.titre != ecranCourant){
        optionsC.push(option)
      }
    })
    const final = nouvOptions.concat(optionsC);
    setOptions(final);
  }

  return(
    <ListeOptionsContexte.Provider value={{options, modifierOptions, header, setHeader, /* hauteurListe, hauteurComposantListe, hauteurRoulette, hauteurComposant: hauteurComposantRoulette, rayonPanner, rayonRoulette, centre, radianOffset, modifierRadianOffset, angleDef, radianDef, setLongRoulette, longRoulette, setIndexActif, indexActif, modifierOptionTitre, optionTitre, setModeRouletteScroll, modeRouletteScroll, setIndexDebut, indexDebut, longRouletteDef, sensHoraire, setSensHoraire */}}>
      {children}
    </ListeOptionsContexte.Provider>
  )
}
/**
  * @returns {array} options | state qui retourne les options affichées dans la liste
  * @returns {function} modifierOptions(optionsEcran, ecranCourant) | concat les options de l'écran aux écrans de base
  * @returns {composant} header | composant à afficher au dessus 
*/
export const useListeOptions = () => useContext(ListeOptionsContexte)