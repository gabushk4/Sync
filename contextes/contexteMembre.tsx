import { convertirTimestampDateLongue } from '@/functions/convertirTimestamp'
import { convertUTCToLocal } from '@/functions/convertirUTCenLocal'
import log from '@/functions/log'
import { createContext, useContext, useState } from 'react'
import { useAPI } from './contexteAPI'
import { useAccessToken } from './contexteToken'

import ToastAbs from '@/abstractions/toastAbs'
import { FPType } from '@/types/pfp'
import { DateTime } from 'luxon'

//Types

type Membre = {
    idPublique: string | undefined;
    pseudo: string | undefined;
    bio: string | undefined;
    fp: FPType;
    tempsCreation: DateTime | undefined;
    admin: boolean | false;
    emailConfirme: boolean | false;
    timezone: string;
    email: string | undefined;
};

type MembreContextType = {
    membre: Membre;
    patchProfil: (pseudo?: string | undefined, bio?: string | undefined, fp?: FPType) => Promise<void>;
    getMembre: () => Promise<void>;
    resetMembre: () => void;
    setMockMembre: () => void;
};

const MembreContexte = createContext<MembreContextType | undefined>(undefined);

export const MembreProvider = ({ children }: { children: React.ReactNode }) => {
    const {getToken} = useAccessToken()
    const { api } = useAPI()
    
    const membreInitial: Membre = {
        idPublique: undefined,
        pseudo: undefined,
        bio: undefined,
        fp: undefined,
        tempsCreation: undefined,
        admin: false,
        emailConfirme: false,
        timezone: 'local',
        email: undefined
    }

    const [membre, setMembre] = useState<Membre>(membreInitial)

    const getMembre = async () => {
        try {
            const response = await api.get('/membres')
            //log('get membre', response.data)
            const data = response.data
            setMembre((prev) => ({
                ...prev,
                idPublique: data.id_publique ?? null,
                pseudo: data.pseudo ?? null,
                bio: data.bio ? data.bio : "cette personne n'a rien à dire",
                fp: data.fp_url ?? null,
                admin: data.role === 'admin',
                emailConfirme: data.email_confirme ?? false,
                email: data.courriel,
                tempsCreation: convertUTCToLocal(data.temps_creation)
            }))            
            
        } catch (error : any) {
            throw error
        }
    }

    const setMockMembre = () => {
        setMembre({
            pseudo: 'mocker',
            idPublique: "Mmoc1234",
            bio: "Je ne suis qu'un mock de donnée",
            fp: undefined,
            tempsCreation: DateTime.now(),
            admin: true,
            emailConfirme: true,
            timezone: 'local',
            email:'pereiralevesque.gabriel@gmail.com'
        })
    }

    const patchProfil = async (pseudo : string | undefined, bio : string | undefined, fp: FPType = undefined ) => {
        const token = await getToken()
        const url = `/membres/profil`

        const formData = new FormData();

        if (pseudo) {
            formData.append("pseudo", pseudo);
            setMembre((prev) => ({ ...prev, pseudo }));
        }

        if (bio) {
            formData.append("bio", bio);
            setMembre((prev) => ({ ...prev, bio }));
        }

        if (fp) {
            formData.append("image", {
                uri: (fp as any).uri,
                type: (fp as any).mimeType || "image/jpeg", // important pour multer
                name: (fp as any).fileName ? (fp as any).fileName : `${pseudo ?? 'image'}.jpg`, // un vrai nom avec extension
            } as any);
            setMembre((prev) => ({ ...prev, fp }));
        }

        const modifiedFields: string[] = [];
        if (pseudo) modifiedFields.push('pseudo');
        if (bio) modifiedFields.push('bio');
        if (fp) modifiedFields.push('image');

        if (modifiedFields.length > 0) {
            try {           
                log("patch", url, formData);

                const response = await api.patch(url, formData, {
                    headers:{
                        'Authorization':`Bearer ${token}`,
                        'Content-Type':'multipart/form-data'
                    }
                })                

                if(response.status === 200){
                    ToastAbs.show({
                        type:'persoSucces',
                        text1:'profil modifié',
                        text2:`champs modifiés: ${modifiedFields.join(', ')}`
                    })
                    getMembre()
                }

            } catch (error: any) {
                log('erreur en modifiant le profil', error.message)  
                throw error
            }
        }
    }

    const resetMembre = () => {
        setMembre(membreInitial);
    };

    return (
        <MembreContexte.Provider value={{ membre, patchProfil, getMembre, resetMembre, setMockMembre }}>
            {children}
        </MembreContexte.Provider>
    );
}

/**
 * Fetch et patch le membre pour le garder en mémoire
 * 
 * @returns {string} idPublique
 * @returns {string} pseudo
 * @returns {string} bio
 * @returns {uri} fp
 * @returns {string} tempsCreation
 * @returns {bool} admin
 * @returns {function} patchProfil() | prend les champs modifiés *  
 * @returns {function} resetMembre() | vide les champs du membre        
 */
export const useMembre = () => {
    const ctx = useContext(MembreContexte)
    if(!ctx) throw new Error('useMembre must be used within a MembreProvider')
    return ctx
}