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

export type LocationServiceError = 'PERMISSION_DENIED' | 'GPS_UNAVAILABLE' | 'GEOCODE_FAILED';

export interface ReverseGeocodeResult {
  city: string;
  fullAddress: string;
}

export interface LocationDetailResult {
  success: true;
  city: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
}

export interface LocationErrorResult {
  success: false;
  error: LocationServiceError;
  message: string;
}

export type LocationResult = LocationDetailResult | LocationErrorResult;

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

    const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });

    let city = '';
    if (reverseGeocode && reverseGeocode.length > 0) {
      city = reverseGeocode[0].city || reverseGeocode[0].subregion || '';
    }

    return { latitude, longitude, city };
  } catch (error) {
    console.warn('GPS location request failed:', error);
    return null;
  }
}

export async function detectCurrentLocationForKYC(): Promise<LocationResult> {
  let permissionStatus: Location.PermissionStatus;

  try {
    const { status: existing } = await Location.getForegroundPermissionsAsync();
    if (existing === 'granted') {
      permissionStatus = existing;
    } else {
      const { status: requested } = await Location.requestForegroundPermissionsAsync();
      permissionStatus = requested;
    }
  } catch {
    return {
      success: false,
      error: 'GPS_UNAVAILABLE',
      message: 'Failed to request location permission.',
    };
  }

  if (permissionStatus !== 'granted') {
    return {
      success: false,
      error: 'PERMISSION_DENIED',
      message: 'Location permission denied. Please enable it in your device settings.',
    };
  }

  let latitude: number;
  let longitude: number;

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    latitude = location.coords.latitude;
    longitude = location.coords.longitude;
  } catch {
    return {
      success: false,
      error: 'GPS_UNAVAILABLE',
      message: 'Unable to fetch GPS coordinates. Please try again.',
    };
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });

    if (!results || results.length === 0) {
      return {
        success: false,
        error: 'GEOCODE_FAILED',
        message: 'Could not determine address. Please enter manually.',
      };
    }

    const r = results[0];
    const city = r.city || r.subregion || r.district || '';
    const addressParts = [
      r.streetNumber,
      r.street,
      r.subregion,
      r.city,
      r.region,
      r.postalCode,
      r.country,
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    return {
      success: true,
      city,
      fullAddress,
      latitude,
      longitude,
    };
  } catch {
    return {
      success: false,
      error: 'GEOCODE_FAILED',
      message: 'Geocoding failed. Please enter your address manually.',
    };
  }
}

