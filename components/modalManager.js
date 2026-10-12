import ModalBase from './modalBase'
import { useModal } from '../contextes/contexteModals'
import { Modal,View } from 'react-native';
import ModalAjouterAmi from './modalAjouterAmi';
import ModalNotification from './modalNotifications';
import ListeAmis from './listeAmis';
import ModalSignalementRapide from './modalSignalementRapide';
import ModalMdpOublie from './modalMdpOublie';
import { useRouteAbs } from '../contextes/contexteRoute';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function ModalManager(){
  const { modal, fermerModal } = useModal()
  const {ajouterEcran} = useRouteAbs()

  let children;  
    
  //console.log('Modal à ouvrir:', modal.nom, modal.data)
  
  switch (modal.nom) {
    case 'ajouterAmi':
        children = <ModalAjouterAmi fermerModal={fermerModal}/>
        break;
    case 'notifications':
        children = <ModalNotification/>
        break;
    case 'widgetsListe':
        children = <WidgetListe widgetsMembre={modal.data.widgetsMembre} sauvegarderWidget={modal.data.sauvegarderWidgets}/>
        break;
    case 'qrCode':
        children = <ModalQrCode/>
        break;
    case 'listeAmis':
        children = <ListeAmis onPress={modal.data?.onPress??undefined} select={modal.data?.select??false}/>
        break;
    case 'signalementRapide':
        children = <ModalSignalementRapide/>
        break;
    case 'mdpOublie':
        children = <ModalMdpOublie pseudo={modal.data?.pseudo}/>
        break;
    default:
        children = null
        break;
  }

  useFocusEffect(useCallback(()=>{
    ajouterEcran(modal.nom)
  },[]))
  
  return (
    <View style={{flex:1, backgroundColor:'transparent', position:'absolute'}}>
    <Modal
        visible={modal.nom != null} 
        transparent={true}
        animationType='slide'
        onRequestClose={() => {fermerModal()}}
    >
        <ModalBase
            children={
                children
            }
        />
    </Modal>
    </View>
  )
}