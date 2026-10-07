let accessToken: string | null = null;

export const getToken = (): string | null => accessToken;

export const setToken = (token: string) => {
  accessToken = token; // synchrone, d'abord
};

export function emptyToken(){
    accessToken = null
}