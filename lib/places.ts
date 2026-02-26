/**
 * FlashRide – Mauritius Places & Geocoding
 *
 * Provides:
 *  - A comprehensive list of Mauritius locations with coordinates
 *  - Autocomplete suggestions from the local dataset (offline, instant)
 *  - getCoords() – resolve an address string to lat/lng
 */

export interface MUPlace {
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export const MU_PLACES: MUPlace[] = [
  // Port Louis
  { name: 'Port Louis', region: 'Port Louis', lat: -20.1609, lng: 57.4977 },
  { name: 'Port Louis City Centre', region: 'Port Louis', lat: -20.1621, lng: 57.4990 },
  { name: 'Caudan Waterfront', region: 'Port Louis', lat: -20.1631, lng: 57.4929 },
  { name: 'Port Louis Bus Terminal', region: 'Port Louis', lat: -20.1590, lng: 57.5010 },
  // Central
  { name: 'Curepipe', region: 'Plaines Wilhems', lat: -20.3173, lng: 57.5260 },
  { name: 'Quatre Bornes', region: 'Plaines Wilhems', lat: -20.2654, lng: 57.4801 },
  { name: 'Rose Hill', region: 'Plaines Wilhems', lat: -20.2340, lng: 57.4597 },
  { name: 'Beau Bassin', region: 'Plaines Wilhems', lat: -20.2263, lng: 57.4649 },
  { name: 'Vacoas', region: 'Plaines Wilhems', lat: -20.2985, lng: 57.4780 },
  { name: 'Phoenix', region: 'Plaines Wilhems', lat: -20.2880, lng: 57.4950 },
  { name: 'Floreal', region: 'Plaines Wilhems', lat: -20.3024, lng: 57.5065 },
  { name: 'Camp Levieux', region: 'Plaines Wilhems', lat: -20.2766, lng: 57.5050 },
  { name: 'Cascavelle', region: 'Black River', lat: -20.2773, lng: 57.3894 },
  // North
  { name: 'Grand Baie', region: 'Rivière du Rempart', lat: -20.0133, lng: 57.5833 },
  { name: 'Pereybere', region: 'Rivière du Rempart', lat: -19.9974, lng: 57.5874 },
  { name: 'Cap Malheureux', region: 'Rivière du Rempart', lat: -19.9937, lng: 57.6128 },
  { name: 'Goodlands', region: 'Rivière du Rempart', lat: -20.0282, lng: 57.6469 },
  { name: 'Mapou', region: 'Rivière du Rempart', lat: -20.0531, lng: 57.6291 },
  { name: 'Triolet', region: 'Pamplemousses', lat: -20.0554, lng: 57.5408 },
  { name: 'Pamplemousses', region: 'Pamplemousses', lat: -20.1042, lng: 57.5784 },
  { name: 'Terre Rouge', region: 'Pamplemousses', lat: -20.1376, lng: 57.5418 },
  { name: 'Rivière du Rempart', region: 'Rivière du Rempart', lat: -20.0574, lng: 57.6564 },
  // East
  { name: 'Centre de Flacq', region: 'Flacq', lat: -20.1960, lng: 57.7167 },
  { name: 'Flacq', region: 'Flacq', lat: -20.2000, lng: 57.7167 },
  { name: 'Belle Mare', region: 'Flacq', lat: -20.1834, lng: 57.7660 },
  { name: 'Trou d\'Eau Douce', region: 'Flacq', lat: -20.2244, lng: 57.7808 },
  { name: 'SSR Airport', region: 'Grand Port', lat: -20.4302, lng: 57.6836 },
  { name: 'Plaine Magnien', region: 'Grand Port', lat: -20.3832, lng: 57.6969 },
  { name: 'Mahebourg', region: 'Grand Port', lat: -20.4089, lng: 57.7064 },
  { name: 'Rose Belle', region: 'Grand Port', lat: -20.3980, lng: 57.6106 },
  // South
  { name: 'Souillac', region: 'Savanne', lat: -20.5126, lng: 57.5197 },
  { name: 'Rivière des Anguilles', region: 'Savanne', lat: -20.4757, lng: 57.5504 },
  { name: 'Chemin Grenier', region: 'Savanne', lat: -20.4607, lng: 57.4752 },
  // West
  { name: 'Flic en Flac', region: 'Black River', lat: -20.2894, lng: 57.3634 },
  { name: 'Tamarin', region: 'Black River', lat: -20.3238, lng: 57.3751 },
  { name: 'Black River', region: 'Black River', lat: -20.3697, lng: 57.3816 },
  { name: 'Bambous', region: 'Black River', lat: -20.2498, lng: 57.4120 },
  { name: 'Albion', region: 'Black River', lat: -20.1914, lng: 57.3879 },
  // Universities / Hospitals / Landmarks
  { name: 'UoM (University of Mauritius)', region: 'Réduit', lat: -20.2400, lng: 57.4893 },
  { name: 'UTM (Université des Technologies)', region: 'Pointe aux Sables', lat: -20.1984, lng: 57.4450 },
  { name: 'SSRN Hospital', region: 'Pamplemousses', lat: -20.1021, lng: 57.5778 },
  { name: 'Jeetoo Hospital', region: 'Port Louis', lat: -20.1636, lng: 57.5035 },
  { name: 'Victoria Hospital', region: 'Candos', lat: -20.2654, lng: 57.4820 },
  { name: 'Moka', region: 'Moka', lat: -20.2319, lng: 57.5156 },
  { name: 'Réduit', region: 'Moka', lat: -20.2404, lng: 57.4902 },
  { name: 'Ebène', region: 'Moka', lat: -20.2484, lng: 57.4888 },
  { name: 'Bagatelle Mall', region: 'Moka', lat: -20.2525, lng: 57.4943 },
];

/**
 * Returns up to `limit` place suggestions matching the input string.
 * Matches against name and region, case-insensitive.
 */
export function autocompletePlaces(input: string, limit = 6): MUPlace[] {
  const q = input.trim().toLowerCase();
  if (q.length < 2) return [];
  return MU_PLACES.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.region.toLowerCase().includes(q)
  ).slice(0, limit);
}

/**
 * Resolves an address string to coordinates.
 * Falls back to geographic center of Mauritius if unresolved.
 */
export function getCoords(address: string): { lat: number; lng: number } {
  const q = address.toLowerCase();
  const match = MU_PLACES.find(p =>
    q.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().includes(q.split(',')[0].trim())
  );
  return match ? { lat: match.lat, lng: match.lng } : { lat: -20.2, lng: 57.5 };
}
