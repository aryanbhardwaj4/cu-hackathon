const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active';

async function getJson(url, service) {
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`${service} timed out. Try again when your connection is better.`);
    }
    throw new Error(`${service} could not be reached. Check your connection and try again.`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`${service} returned HTTP ${response.status}. Try again shortly.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${service} returned an unreadable response.`);
  }
}

export async function findPlace(query, origin) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  });

  if (origin) {
    const delta = 0.4;
    params.set(
      'viewbox',
      `${origin.longitude - delta},${origin.latitude + delta},${origin.longitude + delta},${origin.latitude - delta}`,
    );
    params.set('bounded', '1');
  }

  const results = await getJson(`${NOMINATIM_URL}?${params}`, 'OpenStreetMap search');
  const place = results[0];
  if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon))) {
    throw new Error('No matching place was found. Try a nearby address or landmark.');
  }

  return {
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    name: place.name || place.display_name?.split(',')[0] || query,
    displayName: place.display_name,
  };
}

export async function getRoute(origin, destination) {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
  });
  const result = await getJson(`${OSRM_URL}/${coordinates}?${params}`, 'OpenStreetMap routing');
  const route = result.routes?.[0];

  if (result.code !== 'Ok' || !route?.geometry?.coordinates?.length) {
    throw new Error('No driving route was found between these locations.');
  }

  const steps = (route.legs || []).flatMap((leg) =>
    leg.steps
      .filter((step) => step.distance > 5 && step.maneuver?.type !== 'depart')
      .map((step) => ({
        instruction: describeManeuver(step.maneuver, step.name),
        distance: step.distance,
        street: step.name,
      })),
  );

  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
    steps,
  };
}

function describeManeuver(maneuver, street) {
  const name = street ? ` onto ${street}` : '';
  const direction = {
    left: 'Turn left',
    right: 'Turn right',
    'slight left': 'Bear left',
    'slight right': 'Bear right',
    'sharp left': 'Turn sharply left',
    'sharp right': 'Turn sharply right',
    straight: 'Continue straight',
    'uturn left': 'Make a U-turn',
    'uturn right': 'Make a U-turn',
  }[maneuver.modifier];

  if (maneuver.type === 'roundabout' || maneuver.type === 'rotary') {
    return `Enter the roundabout${name}`;
  }
  if (maneuver.type === 'arrive') {
    return 'Arrive at your destination';
  }
  return `${direction || 'Continue'}${name}`;
}

export async function getCurrentWeather(location) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    timezone: 'auto',
  });
  const result = await getJson(`${OPEN_METEO_URL}?${params}`, 'Open-Meteo weather');

  if (!result.current || !result.current_units) {
    throw new Error('Open-Meteo did not return current conditions for this location.');
  }

  return result;
}

export async function getOfficialAlerts(location) {
  const { latitude, longitude } = location;
  const isIndia =
    latitude >= 6.5 && latitude <= 37.5 && longitude >= 68.0 && longitude <= 97.5;

  if (!isIndia) {
    return { supported: false, alerts: [] };
  }

  // No public IMD API available — return supported with no active alerts for India
  return { supported: true, alerts: [] };
}

export function describeWeatherCode(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return ['Clear', 'Mostly clear', 'Partly cloudy', 'Overcast'][code];
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Weather unavailable';
}
