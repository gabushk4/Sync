import * as ImagePicker from 'expo-image-picker';

type onChangeCallback = (asset: ImagePicker.ImagePickerAsset) => void

/**
 * Used to pick an image from system's library and import it to app
 * @param onChange 
 */
export default  async function ChooseImage( onChange: onChangeCallback ){
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