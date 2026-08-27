import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {useAPI} from '@/contextes/contexteAPI' 

const AVATAR_KEY = (id:string) => `users/${id}/avatar`;
const AVATAR_DIR = FileSystem.Paths.document.uri + 'users/'

// Replace with your real server base URL
const SERVER_URL = "https://your-server.example";

export function useUserAvatar(userId: string) {
    const [avatar, setAvatar] = useState(null);
    const { APIBaseURL, api } = useAPI()

    // Charger l'avatar au montage — on tente d'abord le serveur distant,
    // puis on retombe sur le fichier local si le serveur n'a rien.
    useEffect(() => {
      let mounted = true;
      (async () => {
        if (!userId) return;

        try {
          const remoteUrl = `${APIBaseURL}/users/${userId}/avatar.jpg`;
          // try to fetch the remote image (GET) to know if it exists
          const resp = await fetch(remoteUrl, { method: 'GET' });
          if (mounted && resp.ok) {
            setAvatar(remoteUrl + '?t=' + Date.now());
            return;
          }
        } catch (e) {
          // ignore network errors and fallback to local
        }

        // fallback: check local file
        try {
          const file = new FileSystem.File(`${AVATAR_DIR}${userId}/avatar.jpg`);
          if (file.exists) {
            if (mounted) setAvatar(file.uri + '?t=' + Date.now());
          }
        } catch (e) {
          // ignore
        }
      })();

      return () => { mounted = false; };
    }, [userId]);

 const uploadAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission requise pour accéder à la librairie.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const sourceUri = result.assets[0].uri;

    // Remove avatar before uploading a new one (local)
    await removeAvatar();

    // copy to a known file location (Apple's URI are temporary ones)
    try {
      const destPath = `${AVATAR_DIR}${userId}/avatar.jpg`;
      // ensure directory exists
      await FileSystem.makeDirectoryAsync(`${AVATAR_DIR}${userId}/`, { intermediates: true }).catch(()=>{});
      await FileSystem.copyAsync({ from: sourceUri, to: destPath }).catch(()=>{});
      // update UI optimistically with remote-first preference
      setAvatar(`${SERVER_URL}/users/${userId}/avatar.jpg?t=${Date.now()}`);
    } catch (e) {
      // keep going even if local copy fails
    }

    // Upload to remote server using multipart/form-data
    try {
      const filename = sourceUri.split('/').pop() || 'avatar.jpg';
      const match = filename.match(/\.(\w+)$/);
      const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      const formData = new FormData();
      // @ts-ignore - React Native/FormData file shape
      formData.append('avatar', { uri: sourceUri, name: filename, type });

      const uploadResp = await fetch(`${SERVER_URL}/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
        // Note: do NOT set the Content-Type header; let fetch/setter add the boundary
      });

      if (!uploadResp.ok) {
        console.warn('Avatar upload failed', uploadResp.status);
        // fallback to local file if remote failed
        const localFile = new FileSystem.File(`${AVATAR_DIR}${userId}/avatar.jpg`);
        if (localFile.exists) setAvatar(localFile.uri + '?t=' + Date.now());
      } else {
        // success — ensure UI shows remote version
        setAvatar(`${SERVER_URL}/users/${userId}/avatar.jpg?t=${Date.now()}`);
      }
    } catch (e) {
      console.warn('Upload error', e);
    }
};

  const removeAvatar = async () => {
    const destFile = new FileSystem.File(`${AVATAR_DIR}${userId}/avatar.jpg`);
    if (destFile.exists) {
      destFile.delete();
    }
    setAvatar(null);
  };

  return { avatar, uploadAvatar, removeAvatar };
}