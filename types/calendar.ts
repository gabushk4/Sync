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
  regle_recurrence?: string;
  id_parent?: string;
  debut_occurence?: DateTime;
  timezone: string;
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