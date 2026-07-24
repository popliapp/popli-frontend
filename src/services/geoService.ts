import * as Location from 'expo-location';

export interface NominatimCity {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchIndianCities(query: string): Promise<NominatimCity[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const encoded = encodeURIComponent(query.trim());
    // Photon API - much better results than Nominatim, returns streets/landmarks/areas
    const url = `https://photon.komoot.io/api/?q=${encoded}&limit=10&lang=en&bbox=68.1766451354,7.96553477623,97.4025614766,35.4940095078`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.warn('Photon API error:', res.status);
      return [];
    }
    const data = await res.json();
    if (!data.features || data.features.length === 0) return [];

    return data.features.map((feature: any) => {
      const props = feature.properties;
      // Build a clean short name
      const name = props.name || props.city || props.town || props.village || props.county || '';
      // Build display name like: "Bandra, Mumbai, Maharashtra"
      const parts = [
        props.name,
        props.city || props.town || props.village,
        props.state,
      ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
      const displayName = parts.join(', ') || props.name || '';

      return {
        name,
        displayName,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
      };
    }).filter((c: NominatimCity) => c.name); // remove empty names
  } catch (error) {
    console.warn('Photon search failed:', error);
    return [];
  }
}

// Haversine formula to calculate the distance between two lat/lon points in kilometers
export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

export async function requestGPSLocation(askIfNotGranted = false): Promise<{
  latitude: number;
  longitude: number;
  city: string;
} | null> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    
    if (existingStatus !== 'granted') {
      if (!askIfNotGranted) return null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
    }

 const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = location.coords;

    // Reverse geocode to find city
    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    let city = 'Indore'; // Default fallback city
    if (reverseGeocode && reverseGeocode.length > 0) {
      city = reverseGeocode[0].city || reverseGeocode[0].subregion || 'Indore';
    }

    return { latitude, longitude, city };
  } catch (error) {
    console.warn('GPS location request failed:', error);
    return null;
  }
}


