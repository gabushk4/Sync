import * as expoHaptics from 'expo-haptics'
import { Platform } from 'react-native'


export default class Haptics{
    /**
     * android: Confirm
     * ios: Success
     */
    static succes() {
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Confirm)
        }
        else if(Platform.OS === 'ios'){
            expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Success)
        }
    }
    /**
     * android: Reject
     * ios: Error
     */
    static erreur() {
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Reject)
        }
        else if(Platform.OS === 'ios'){
            expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Error)
        }
    }
    /**
     * android: Virtual_Key
     * ios: Light
     */
    static click() {
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Virtual_Key)
        }
        else if(Platform.OS === 'ios'){
            expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Light)
        }
    }

    static clickLeger() {
        try {
            if (Platform.OS === 'android') {
                expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Toggle_On)
            }
            else if (Platform.OS === 'ios') {
                expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Soft)
            }
        } catch (err) {
            console.error(err)
        }
    }
     /**
     * android:
     * ios: 
     */
    static modalDebut() {
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Drag_Start)
        }
        else if(Platform.OS === 'ios'){
            expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Warning)
        }
    }
    /**
     * android: Gesture_End
     * ios: Rigid
     */
    static modalFin() {
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Gesture_End)
        }
        else if(Platform.OS === 'ios'){
            expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Heavy)
        }
    }
    /**
     * android: Long_Press
     * ios: Heavy
     */
    static longPress() {
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Long_Press)
        }
        else if(Platform.OS === 'ios'){
            expoHaptics.notificationAsync(expoHaptics.ImpactFeedbackStyle.Heavy)            
        }
    }
    /**
     * android: Gesture_End
     * ios: Soft
     */
    static animationFin() {
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Gesture_End)
        }
        else if(Platform.OS === 'ios'){
            expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Soft)            
        }
    }
    /**
     * android: Virtual_Key_Release
     * ios: Warning
     */
    static avertissement(){
        if(Platform.OS === 'android'){
            expoHaptics.performAndroidHapticsAsync(expoHaptics.AndroidHaptics.Virtual_Key_Release)
        }
        else if(Platform.OS === 'ios'){
                expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Warning)            
        }
    }
    
}