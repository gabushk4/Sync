import { DateTime } from 'luxon';
import { UrlDescriptor } from './url';

export type Event = {
  id?: string;
  titre?: string;      // optionnal if private
  description: string;
  url?: UrlDescriptor;
  debut: DateTime | undefined;
  fin: DateTime | undefined ;
  prive: 0 | 1;
  privilege_membre: "lecteur" | "editeur" | null;
  type?: "recurrence" | "exception";
  // 'indisponibilite': a busy stretch the member declared (Philip — user story 20).
  nature?: "evenement" | "indisponibilite";
  regle_recurrence?: string;
  id_parent?: string;
  debut_occurence?: DateTime;
  timezone: string;
  // D'où provient l'évènement — utile pour l'import .ics (story #7) et,
  // plus tard, l'import du calendrier système (story #4) qui a besoin
  // de la même colonne côté serveur pour savoir où réimporter depuis.
  source?: 'sync' | 'ics' | 'google' | 'outlook' | 'device';
  // Timeline display overrides (invitation review screen): block color, and
  // whether tapping the block does anything. Philip — user story 8.
  couleur?: string;
  cliquable?: boolean;
};

export const defaultEvent = <Event>{
        id: undefined,
        titre:'',
        description: '',
        debut: undefined,
        fin: undefined,
        prive: 1,
        privilege_membre: 'editeur',
        timezone: 'local'
    }

export type Friend = {
  id: string;
  fp_url?: string;
  evenements: Event[];
};

export type UserEvent = {
  id: string;
  titre?: string;
  url?: UrlDescriptor;
  debut: DateTime;
  fin: DateTime;
};

export type Recurrence = { title: string; value: string | null }