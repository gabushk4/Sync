export type FPType =
    | string
    | {
            uri: string;
            mimeType?: string;
            fileName?: string;
        }
    | undefined; 

export function isFpObject(fp: FPType): fp is { uri: string; mimeType?: string; fileName?: string } {
  return !!fp && typeof fp !== 'string';
}