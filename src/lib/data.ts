import type { MedicalObject, Region, Airport, LatLng } from "./types";

export const medicalObjects: MedicalObject[] = [
  {
    id: 1,
    name: "Shox Med Center",
    type: "Xususiy klinikalari",
    address: "Toshkent sh., Mirzo Ulug'bek t., Buyuk Ipak Yo'li k.",
    inn: "301122334",
    position: { lat: 41.3392, lng: 69.3381 }
  },
  {
    id: 2,
    name: "Respublika shoshilinch tibbiy yordam ilmiy markazi",
    type: "Davlat klinikalari",
    address: "Toshkent sh., Chilonzor t., Kichik halqa yo'li",
    inn: "201122334",
    position: { lat: 41.2825, lng: 69.2043 }
  },
  {
    id: 3,
    name: "OXY Med dorixonasi",
    type: "Dorixonalar",
    address: "Toshkent sh., Yunusobod t., Amir Temur shoh ko'chasi",
    inn: "401122335",
    position: { lat: 41.3458, lng: 69.2845 }
  },
    {
    id: 4,
    name: "Akfa Medline",
    type: "Xususiy klinikalari",
    address: "Toshkent sh., Shayhontohur tumani, Kichik halqa yo'li, 5A",
    inn: "305122334",
    position: { lat: 41.3175, lng: 69.2154 }
  },
  {
    id: 5,
    name: "1-sonli shahar klinik shifoxonasi",
    type: "Davlat klinikalari",
    address: "Toshkent sh., Yakkasaroy tumani, Shota Rustaveli ko'chasi",
    inn: "201122445",
    position: { lat: 41.2872, lng: 69.2597 }
  },
  {
    id: 6,
    name: "Dori-Darmon 24/7",
    type: "Dorixonalar",
    address: "Toshkent sh., Sergeli tumani, Yangi Sergeli yo'li",
    inn: "401122667",
    position: { lat: 41.2298, lng: 69.2215 }
  }
];

export const regions: Region[] = [
  {
    id: 1,
    name: "Toshkent shahri",
    stats: { clinics: 150, pharmacies: 400, airports: 1 },
    path: [
      { lat: 41.38, lng: 69.15 },
      { lat: 41.38, lng: 69.45 },
      { lat: 41.15, lng: 69.45 },
      { lat: 41.15, lng: 69.15 },
    ]
  },
];

export const airports: Airport[] = [
  {
    id: 1,
    name: "Toshkent Xalqaro Aeroporti (TAS)",
    position: { lat: 41.2575, lng: 69.2819 }
  }
];

export const routeLine: LatLng[] = [
  { lat: 41.3392, lng: 69.3381 },
  { lat: 41.3350, lng: 69.3300 },
  { lat: 41.3100, lng: 69.3250 },
  { lat: 41.2800, lng: 69.3100 },
  { lat: 41.2600, lng: 69.2850 },
  { lat: 41.2575, lng: 69.2819 },
];
