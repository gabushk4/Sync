import * as ImagePicker from 'expo-image-picker'
/**
 * 
 * @param {function} onChange(image)
 */
export default  async function ChoisirImage(onChange, ){
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
    });
    
    if (!result.canceled) {
        //log('image select:', result.assets[0])
        onChange(result.assets[0])
    }        
}