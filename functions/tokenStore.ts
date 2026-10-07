
import * as SecureStore from "expo-secure-store"


let accessToken: string | null = null;

export const getToken = (): string | null => accessToken;

export const setToken = (token: string) => {
  accessToken = token; // synchrone, d'abord
};

export async function emptyTokens(){
  accessToken = null
  await SecureStore.deleteItemAsync("refresh_token")
}