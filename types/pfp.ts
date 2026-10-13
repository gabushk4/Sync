export type FPType =
    | string
    | null
    | {
            uri: string;
            mimeType?: string
            fileName?: string | null;
        }
    | undefined; 

export function isFpObject(fp: FPType): fp is { uri: string; mimeType?: string; fileName?: string | null } {
  return typeof fp === 'object' && fp !== null && 'uri' in fp;
}
