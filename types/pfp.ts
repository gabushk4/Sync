type MimeType = 'image' | 'video' | 'livePhoto' | 'pairedVideo' | null;

export type FPType =
    | string
    | null
    | {
            uri: string;
            mimeType?: MimeType
            fileName?: string | null;
        }
    | undefined; 

export function isFpObject(fp: FPType): fp is { uri: string; mimeType?: MimeType; fileName?: string } {
  return !!fp && typeof fp !== 'string';
}
