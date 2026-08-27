import { DateTime } from "luxon";

// seed.js — Données bidons Sync

"2026-06-28";
const nowDt = DateTime.now(); 
const DATE = `${nowDt.year}-${nowDt.month.toString().padStart(2, '0')}-${nowDt.day}`
console.log('seed date', DATE)

const membreEvents = [
  { id: '1', titre: "Sommeil",         start: `${DATE}T00:00:00`, end: `${DATE}T08:00:00` },
  { id: '2', titre: "Travail",         start: `${DATE}T08:00:00`, end: `${DATE}T12:00:00` },
  { id: '3', titre: "Gym",             start: `${DATE}T14:00:00`, end: `${DATE}T15:30:00` },
  { id: '4', titre: "Cours de guitar", start: `${DATE}T15:30:00`, end: `${DATE}T17:00:00` },
  { id: '5', titre: "Souper en fam",   start: `${DATE}T21:00:00`, end: `${DATE}T23:00:00` },
];

const marcEvents = [
  { id: '10', titre: "Sommeil",    start: `${DATE}T00:00:00`, end: `${DATE}T07:30:00` },
  { id: '11', titre: "Travail",    start: `${DATE}T09:00:00`, end: `${DATE}T17:00:00` },
  { id: '12', titre: "Gym",        start: `${DATE}T20:00:00`, end: `${DATE}T21:30:00` },
  { id: '13', titre: "Sortie bar", start: `${DATE}T22:00:00`, end: `${DATE}T23:59:00` },
];

const julieEvents = [
  { id: '20', titre: "Sommeil",         start: `${DATE}T00:00:00`, end: `${DATE}T08:00:00` },
  { id: '21', titre: "Université",      start: `${DATE}T08:00:00`, end: `${DATE}T13:00:00` },
  { id: '22', titre: "Diner étude",     start: `${DATE}T13:45:00`, end: `${DATE}T15:00:00` },
  { id: '23', titre: "Travail partiel", start: `${DATE}T15:00:00`, end: `${DATE}T19:00:00` },
  { id: '24', titre: "Yoga",            start: `${DATE}T19:00:00`, end: `${DATE}T20:30:00` },
  { id: '25', titre: "Soirée étude",    start: `${DATE}T20:30:00`, end: `${DATE}T23:59:00` },
];

const alexEvents = [
  { id: '30', titre: "Sommeil",          start: `${DATE}T00:00:00`, end: `${DATE}T09:00:00` },
  { id: '31', titre: "Réunion client",   start: `${DATE}T09:00:00`, end: `${DATE}T12:00:00` },
  { id: '32', titre: "Lunch meeting",    start: `${DATE}T12:00:00`, end: `${DATE}T14:00:00` },
  { id: '33', titre: "Conf dev",         start: `${DATE}T14:00:00`, end: `${DATE}T17:00:00` },
  { id: '34', titre: "5 à 7 collègues", start: `${DATE}T17:00:00`, end: `${DATE}T19:30:00` },
  { id: '35', titre: "Souper famille",   start: `${DATE}T19:30:00`, end: `${DATE}T21:30:00` },
  { id: '36', titre: "Série Netflix",    start: `${DATE}T21:30:00`, end: `${DATE}T23:59:00` },
];

const samEvents = [
  { id: '40', titre: "Sommeil",       start: `${DATE}T00:00:00`, end: `${DATE}T09:30:00` },
  { id: '41', titre: "Freelance",     start: `${DATE}T09:30:00`, end: `${DATE}T12:00:00` },
  { id: '42', titre: "Cours en ligne",start: `${DATE}T14:00:00`, end: `${DATE}T16:30:00` },
  { id: '43', titre: "Entraînement",  start: `${DATE}T16:30:00`, end: `${DATE}T18:00:00` },
  { id: '44', titre: "Jeu vidéo",     start: `${DATE}T18:00:00`, end: `${DATE}T20:00:00` },
  { id: '45', titre: "Dodo",          start: `${DATE}T23:00:00`, end: `${DATE}T23:59:00` },
];

const leaEvents = [
  { id: '50', titre: "Sommeil",         start: `${DATE}T00:00:00`, end: `${DATE}T07:00:00` },
  { id: '51', titre: "Matin perso",     start: `${DATE}T07:00:00`, end: `${DATE}T09:00:00` },
  { id: '52', titre: "Travail",         start: `${DATE}T09:00:00`, end: `${DATE}T12:00:00` },
  { id: '53', titre: "Lunch + courses", start: `${DATE}T12:00:00`, end: `${DATE}T14:00:00` },
  { id: '54', titre: "Télétravail",     start: `${DATE}T14:00:00`, end: `${DATE}T17:30:00` },
  { id: '55', titre: "Cours de danse",  start: `${DATE}T19:00:00`, end: `${DATE}T21:00:00` },
  { id: '56', titre: "Lecture",         start: `${DATE}T22:30:00`, end: `${DATE}T23:59:00` },
];

// ─── EXPORT ───────────────────────────────────────────────
export const seedData = {
  membre: membreEvents,
  amis: [
    { id: '2', nom: "Marc L.",  avatar: "ML", evenements: marcEvents }, //      dispoCommune: "> 1h  — 17h à 20h (3h)"
      { id: '3', nom: "Julie T.", avatar: "JT", evenements: julieEvents }, //   dispoCommune: "< 1h  — 13h à 13h45 (45 min)"
      { id: '4', nom: "Alex B.", avatar: "AB", evenements: alexEvents}, //      dispoCommune: "Aucune"
      { id: '5', nom: "Sam R.", avatar: "SR", evenements: samEvents }, //       dispoCommune: "> 1h  — 12h à 14h (2h)" 
      { id: '6', nom: "Léa M.", avatar: "LM", evenements: leaEvents }, //       dispoCommune: "> 1h  — 17h30 à 19h (1h30)"
  ],
};
