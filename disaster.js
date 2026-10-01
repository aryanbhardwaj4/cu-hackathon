import React, { useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapPreview from './src/components/map-preview';
import {
  describeWeatherCode,
  findPlace,
  getCurrentWeather,
  getNearbyShelters,
  getOfficialAlerts,
  getRoute,
} from './src/services/disaster-apis';

const MODES = {
  connected: {
    label: 'CONNECTED',
    color: '#62D6A6',
    instruction: 'Live API and GPS status appears above',
    background: '#09120F',
    surface: '#142019',
    border: '#294337',
    accentSoft: '#19372B',
    hero: 'Get oriented. Find your way.',
    alertTitle: 'LOCAL WEATHER ALERTS',
    mapLabel: 'OPENSTREETMAP · LIVE TILES',
  },
  degraded: {
    label: 'LOW BANDWIDTH',
    color: '#F3B95F',
    instruction: 'Data-saver UI demo · live map calls still use data',
    background: '#151109',
    surface: '#211A0F',
    border: '#493922',
    accentSoft: '#392B15',
    hero: 'Your route. Low-data mode.',
    alertTitle: 'LOW-BANDWIDTH MODE DEMO',
    mapLabel: 'OPENSTREETMAP · ONLINE TILES',
  },
  survival: {
    label: 'SURVIVAL MODE',
    color: '#FF716B',
    instruction: 'Text mode demo · route details are not saved offline',
    background: '#080A0D',
    surface: '#141416',
    border: '#3B2728',
    accentSoft: '#3A1F20',
    hero: 'Move safely. Stay alert.',
    alertTitle: 'SURVIVAL MODE DEMO',
    mapLabel: 'TEXT-ONLY NAVIGATION',
  },
};

const HAZARD_TYPES = [
  { label: 'Flooding', icon: '≈', color: '#65BDF2' },
  { label: 'Fire', icon: '!', color: '#FF716B' },
  { label: 'Blocked road', icon: '×', color: '#F3B95F' },
  { label: 'Safe passage', icon: '+', color: '#62D6A6' },
];

function Pill({ children, color = '#A9B3C2', style }) {
  return (
    <View style={[styles.pill, { borderColor: `${color}45` }, style]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <View style={styles.sectionHeading}>
      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}`;
}

export default function DisasterNavigationApp() {
  const [mode, setMode] = useState('connected');
  const [hazards, setHazards] = useState([]);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('navigate');
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [officialAlerts, setOfficialAlerts] = useState(null);
  const [alertsError, setAlertsError] = useState('');
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [nearbyShelters, setNearbyShelters] = useState([]);
  const [sheltersLoading, setSheltersLoading] = useState(false);
  const [sheltersError, setSheltersError] = useState('');
  const scrollRef = useRef(null);
  const reportsOffset = useRef(0);
  const sheltersOffset = useRef(0);
  const requestId = useRef(0);
  const status = MODES[mode];
  const activeAlert = officialAlerts?.alerts?.[0];
  const alertTitle = activeAlert?.event || (
    alertsLoading ? 'CHECKING LOCAL ALERTS' :
      alertsError ? 'OFFICIAL ALERTS UNAVAILABLE' :
        officialAlerts?.supported ? 'NO ACTIVE IMD ALERTS' :
          location && !officialAlerts ? 'ALERT STATUS NOT CHECKED' :
          location ? 'OUTSIDE INDIA ALERT COVERAGE' : 'LOCATE TO CHECK LOCAL ALERTS'
  );
  const alertDescription = activeAlert?.headline ||
    activeAlert?.description?.split('\n').find(Boolean) ||
    (alertsLoading ? 'Checking the India Meteorological Department for alerts at your location.' :
      alertsError || (officialAlerts?.supported
        ? 'India Meteorological Department reports no active alerts for this point.'
        : location && !officialAlerts ? 'No official alert result is available for this location.'
          : location ? 'India Meteorological Department alerts cover India only.'
            : 'Allow browser location access to check official alerts.'));
  const nextStep = route?.steps?.[0];

  const locateUser = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Location is unavailable in this browser. Try a browser with GPS support.');
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsLocating(true);
    setLocationError('');
    setAlertsError('');
    setWeatherError('');
    setSheltersError('');
    setOfficialAlerts(null);
    setWeather(null);
    setNearbyShelters([]);
    setWeatherLoading(true);
    setAlertsLoading(true);
    setSheltersLoading(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        };
        setLocation(position);
        setDestination(null);
        setRoute(null);
        setRouteError('');
        setIsLocating(false);

        Promise.allSettled([
          getCurrentWeather(position),
          getOfficialAlerts(position),
          getNearbyShelters(position),
        ]).then((results) => {
          if (requestId.current !== currentRequest) return;
          const [weatherResult, alertsResult, sheltersResult] = results;
          if (weatherResult.status === 'fulfilled') setWeather(weatherResult.value);
          else setWeatherError(weatherResult.reason.message);
          if (alertsResult.status === 'fulfilled') setOfficialAlerts(alertsResult.value);
          else setAlertsError(alertsResult.reason.message);
          if (sheltersResult.status === 'fulfilled') setNearbyShelters(sheltersResult.value);
          else setSheltersError(sheltersResult.reason.message);
          setLastCheckedAt(Date.now());
          setWeatherLoading(false);
          setAlertsLoading(false);
          setSheltersLoading(false);
        });
      },
      (error) => {
        if (requestId.current !== currentRequest) return;
        const message = {
          1: 'Location permission was denied. Allow location access in your browser settings.',
          2: 'Your current location could not be determined. Try again where GPS is available.',
          3: 'Location request timed out. Check browser permissions and try again.',
        }[error.code] || 'The browser could not provide your location. Try again.';
        setLocationError(message);
        setIsLocating(false);
        setWeatherLoading(false);
        setAlertsLoading(false);
        setSheltersLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const searchDestination = async () => {
    if (!location) {
      setRouteError('Use Locate first so the route can start from your current position.');
      return;
    }
    if (!destinationQuery.trim()) {
      setRouteError('Enter a shelter, address, or landmark to find a route.');
      return;
    }

    setIsSearching(true);
    setRouteError('');
    try {
      const place = await findPlace(destinationQuery.trim(), location);
      const result = await getRoute(location, place);
      setDestination(place);
      setRoute(result);
    } catch (error) {
      setRouteError(error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const navigateTo = (tab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({
      y: tab === 'reports' ? reportsOffset.current : tab === 'shelters' ? sheltersOffset.current : 0,
      animated: true,
    });
  };

  const reportHazard = (hazard) => {
    setHazards((current) => [
      {
        type: hazard.label.toUpperCase(),
        street: location
          ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
          : 'No location attached',
        latitude: location?.latitude,
        longitude: location?.longitude,
        age: 'Just now · session only',
        color: hazard.color,
      },
      ...current,
    ]);
    setReporting(false);
    setNotice(`${hazard.label} added to this session only; no report server is connected`);
  };

  const simulateMode = (nextMode) => {
    setMode(nextMode);
    setNotice('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: status.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={status.background} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.brandMark, { backgroundColor: status.accentSoft, borderColor: status.border }]}>
            <Text style={[styles.brandMarkText, { color: status.color }]}>N</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>NORTHSTAR</Text>
            <Text style={styles.brandDescriptor}>RESILIENT NAVIGATION · PROTOTYPE</Text>
          </View>
          <Pill color={status.color}>{status.label}</Pill>
        </View>

        <View style={[styles.alertBanner, { backgroundColor: status.surface, borderColor: status.border }]}>
          <View style={[styles.alertIcon, { backgroundColor: status.accentSoft }]}>
            <Text style={[styles.alertIconText, { color: status.color }]}>!</Text>
          </View>
          <View style={styles.alertCopy}>
            <Text style={[styles.alertTitle, { color: status.color }]}>{alertTitle}</Text>
            <Text style={styles.alertDescription}>
              {alertDescription}
              {lastCheckedAt ? ` · Checked ${new Date(lastCheckedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
            </Text>
          </View>
          <Text style={[styles.alertChevron, { color: status.color }]}>›</Text>
        </View>

        <View style={styles.greeting}>
          <Text style={[styles.eyebrow, { color: status.color }]}>{status.mapLabel}</Text>
          <Text style={styles.heroTitle}>{status.hero}</Text>
          <Text style={styles.heroSubtitle}>
            {location
              ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}° · ±${Math.round(location.accuracy)} m`
              : 'Locate yourself to load local weather, official alerts, and a real route.'}
          </Text>
        </View>

        {mode === 'connected' && (
          <View style={styles.livePanel}>
            <View style={styles.livePanelHeader}>
              <View style={styles.liveIndicator} />
              <Text style={styles.livePanelEyebrow}>LIVE CONDITIONS · PUBLIC FEEDS</Text>
              <Text style={styles.livePulse}>{location ? 'GPS FIXED' : 'GPS NOT SET'}</Text>
            </View>
            <View style={styles.liveMetrics}>
              <View style={styles.liveMetric}>
                <Text style={styles.liveMetricValue}>
                  {weatherLoading ? '…' : weather ? `${Math.round(weather.current.temperature_2m)}°` : '—'}
                </Text>
                <Text style={styles.liveMetricLabel}>
                  {weather ? describeWeatherCode(weather.current.weather_code).toUpperCase() : 'LOCAL WEATHER'}
                </Text>
              </View>
              <View style={styles.liveDivider} />
              <View style={styles.liveMetric}>
                <Text style={styles.liveMetricValue}>{alertsLoading ? '…' : officialAlerts?.alerts?.length ?? '—'}</Text>
                <Text style={styles.liveMetricLabel}>OFFICIAL ALERTS</Text>
              </View>
              <Pressable accessibilityRole="button" disabled={isLocating} onPress={locateUser} style={styles.liveAction}>
                <Text style={styles.liveActionText}>{isLocating ? 'LOCATING…' : 'LOCATE  ⌖'}</Text>
              </Pressable>
            </View>
            {weatherError || alertsError ? <Text style={styles.serviceError}>{weatherError || alertsError}</Text> : null}
          </View>
        )}

        {mode === 'degraded' && (
          <View style={[styles.degradedPanel, { backgroundColor: status.surface, borderColor: status.border }]}>
            <Text style={[styles.degradedPanelTitle, { color: status.color }]}>DATA SAVER ON</Text>
            <Text style={styles.degradedPanelText}>Low-data mode reduces network use. Live map tiles and route lookup still need a connection.</Text>
            <View style={styles.degradedSteps}>
              <Text style={[styles.degradedStep, { color: status.color }]}>{route ? '✓ ROUTE IN MEMORY' : '○ NO ROUTE YET'}</Text>
              <Text style={[styles.degradedStep, { color: status.color }]}>✓ TEXT DIRECTIONS</Text>
              <Text style={styles.degradedStepPending}>LIVE API CALLS NEED DATA</Text>
            </View>
          </View>
        )}

        <View style={[styles.weatherCard, { backgroundColor: status.surface, borderColor: status.border }]}>
          <View style={styles.weatherHeader}>
            <Text style={styles.weatherTitle}>LOCAL WEATHER</Text>
            <Text style={styles.weatherSource}>OPEN-METEO · ON REQUEST</Text>
          </View>
          {weatherLoading ? (
            <Text style={styles.weatherDetail}>Fetching current conditions…</Text>
          ) : weather ? (
            <View style={styles.weatherData}>
              <Text style={[styles.weatherTemperature, { color: status.color }]}>
                {Math.round(weather.current.temperature_2m)}{weather.current_units.temperature_2m}
              </Text>
              <View style={styles.weatherCopy}>
                <Text style={styles.weatherCondition}>{describeWeatherCode(weather.current.weather_code)}</Text>
                <Text style={styles.weatherDetail}>
                  Feels {Math.round(weather.current.apparent_temperature)}{weather.current_units.apparent_temperature}
                  {' · '}Wind {Math.round(weather.current.wind_speed_10m)} {weather.current_units.wind_speed_10m}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.weatherDetail, weatherError && styles.serviceError]}>
              {weatherError || 'Locate to load current weather for your area.'}
            </Text>
          )}
        </View>

        <View style={[styles.routeSummary, { backgroundColor: status.surface, borderColor: status.border }]}>
          <View style={[styles.destinationIcon, { backgroundColor: status.accentSoft, borderColor: status.border }]}>
            <Text style={[styles.destinationIconText, { color: status.color }]}>+</Text>
          </View>
          <View style={styles.destinationCopy}>
            <Text style={styles.destinationEyebrow}>{destination ? 'ROUTE DESTINATION · OSM' : 'DESTINATION · SEARCH A PLACE'}</Text>
            <Text style={styles.destinationName}>{destination?.name || 'No destination selected'}</Text>
            {route ? <Text style={styles.routeDistance}>{formatDistance(route.distance)} · OSRM driving route</Text> : null}
          </View>
          <View style={styles.eta}>
            <Text style={styles.etaValue}>{route ? formatDuration(route.duration) : '—'}</Text>
            <Text style={styles.etaUnit}>{route ? 'ETA' : 'ROUTE'}</Text>
          </View>
        </View>

        {mode !== 'survival' && (
          <MapPreview
            mode={mode}
            status={status}
            location={location}
            hazards={hazards}
            shelters={nearbyShelters}
            destination={destination}
            route={route}
            onLocate={locateUser}
            onFindDestination={searchDestination}
            destinationQuery={destinationQuery}
            onChangeDestinationQuery={setDestinationQuery}
            isLocating={isLocating}
            isSearching={isSearching}
            mapError={locationError || routeError}
          />
        )}

        {mode === 'survival' ? (
          <View style={[styles.survivalCard, { backgroundColor: status.surface, borderColor: status.border }]}>
            <View style={styles.survivalTopline}>
              <Text style={[styles.survivalEyebrow, { color: status.color }]}>
                {nextStep ? 'NEXT TURN · LIVE ROUTE' : 'TEXT DIRECTIONS'}
              </Text>
              <Text style={styles.survivalGps}>{location ? 'GPS · ACTIVE' : 'GPS · NOT SET'}</Text>
            </View>
            <Text style={styles.survivalInstruction}>
              {nextStep?.instruction || (location ? 'Choose a destination' : 'Find your location')}
            </Text>
            {nextStep ? (
              <Text style={styles.survivalStreet}>{nextStep.street || destination?.name || 'Follow the route'}</Text>
            ) : null}
            <Text style={styles.survivalDistance}>
              {nextStep
                ? `Continue for ${formatDistance(nextStep.distance)}`
                : location
                  ? 'Enter a shelter, address, or landmark while online.'
                  : 'Locate while online to prepare directions.'}
            </Text>
            <View style={[styles.survivalDivider, { backgroundColor: status.border }]} />
            {activeAlert ? (
              <View style={[styles.survivalWarningBox, { backgroundColor: status.accentSoft }]}>
                <Text style={[styles.survivalWarning, { color: status.color }]}>!  {activeAlert.event.toUpperCase()}</Text>
                <Text style={styles.survivalWarningDetail}>{activeAlert.headline || activeAlert.description}</Text>
              </View>
            ) : (
              <View style={[styles.survivalWarningBox, { backgroundColor: status.accentSoft }]}>
                <Text style={[styles.survivalWarning, { color: status.color }]}>
                  {alertsLoading ? 'CHECKING OFFICIAL ALERTS…' : 'VERIFY CONDITIONS'}
                </Text>
                <Text style={styles.survivalWarningDetail}>
                  {alertsError || (officialAlerts?.supported
                    ? 'NWS reports no active alerts at the last check. Confirm conditions locally.'
                    : 'Live conditions and road closures are not available in text mode.')}
                </Text>
              </View>
            )}
            <View style={styles.survivalFooter}>
              <Text style={styles.coordinates}>
                {location ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°` : 'Location unavailable'}
              </Text>
              <Text style={styles.survivalFooterTag}>TEXT MODE · {mode.toUpperCase()}</Text>
            </View>
            {locationError ? <Text style={styles.serviceError}>{locationError}</Text> : null}
          </View>
        ) : (
          <View style={styles.turnCard}>
            <View style={styles.turnIcon}>
              <Text style={styles.turnIconText}>↰</Text>
            </View>
            <View style={styles.turnCopy}>
              <Text style={styles.turnEyebrow}>
                {nextStep ? `NEXT TURN · ${formatDistance(nextStep.distance)}` : 'ROUTE · NOT SET'}
              </Text>
              <Text style={styles.turnInstruction}>{nextStep?.instruction || 'Locate and choose a destination'}</Text>
              <Text style={styles.turnSubtext}>
                {nextStep?.street || (route
                  ? `Destination: ${destination.name}`
                  : 'Routing is provided by OSRM and needs an internet connection.')}
              </Text>
            </View>
            <Text style={styles.turnArrow}>›</Text>
          </View>
        )}

        <Text style={styles.serviceDisclaimer}>
          Live data requires internet. Routes do not account for hazards unless reported by these sources.
        </Text>

        <View onLayout={(event) => { reportsOffset.current = event.nativeEvent.layout.y; }}>
        <SectionTitle
          eyebrow="SESSION HAZARDS"
          title="Reports on this device"
          right={<Text style={styles.reportCount}>{hazards.length} REPORTS</Text>}
        />
        {hazards.slice(0, 3).map((hazard, index) => (
          <View key={`${hazard.type}-${hazard.age}-${index}`} style={styles.hazardRow}>
            <View style={[styles.hazardDot, { backgroundColor: hazard.color }]} />
            <View style={styles.hazardCopy}>
              <Text style={styles.hazardType}>{hazard.type}</Text>
              <Text style={styles.hazardStreet}>{hazard.street}</Text>
            </View>
            <Text style={styles.hazardAge}>{hazard.age}</Text>
          </View>
        ))}

        {notice ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>✓  {notice}</Text>
          </View>
        ) : null}

        {reporting ? (
          <View style={styles.reportPanel}>
            <View style={styles.reportPanelHeading}>
              <Text style={styles.reportPanelTitle}>What do you see?</Text>
              <Pressable accessibilityRole="button" onPress={() => setReporting(false)}>
                <Text style={styles.dismissText}>CANCEL</Text>
              </Pressable>
            </View>
            <Text style={styles.reportHint}>This report stays in this page session; no server or nearby-device sync is connected.</Text>
            <View style={styles.hazardChoices}>
              {HAZARD_TYPES.map((hazard) => (
                <Pressable
                  accessibilityRole="button"
                  key={hazard.label}
                  onPress={() => reportHazard(hazard)}
                  style={styles.hazardChoice}
                >
                  <Text style={[styles.hazardChoiceIcon, { color: hazard.color }]}>{hazard.icon}</Text>
                  <Text style={styles.hazardChoiceText}>{hazard.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setReporting(true);
              setNotice('');
            }}
            style={styles.reportButton}
          >
            <Text style={styles.reportButtonIcon}>+</Text>
            <Text style={styles.reportButtonText}>REPORT A HAZARD</Text>
            <Text style={styles.reportButtonSubtext}>QUICK · SESSION ONLY · NOT SHARED</Text>
          </Pressable>
        )}
        </View>

        <View onLayout={(event) => { sheltersOffset.current = event.nativeEvent.layout.y; }}>
          <SectionTitle eyebrow="SAFE DESTINATIONS" title="Nearby Shelters" />

          {/* Nearby Shelters from OpenStreetMap */}
          {!location ? (
            <Text style={styles.shelterCardSubtitle}>
              Use Locate to find shelters near your current position.
            </Text>
          ) : sheltersLoading ? (
            <Text style={styles.shelterCardSubtitle}>Searching for shelters nearby…</Text>
          ) : sheltersError ? (
            <Text style={[styles.shelterCardSubtitle, { color: '#FF716B' }]}>{sheltersError}</Text>
          ) : nearbyShelters.length === 0 ? (
            <Text style={styles.shelterCardSubtitle}>
              No shelters found within 5 km. Try searching for a destination below.
            </Text>
          ) : (
            nearbyShelters.map((shelter) => (
              <View key={shelter.id} style={[styles.shelterCard, { backgroundColor: status.surface, borderColor: status.border }]}>
                <View style={[styles.shelterCardIcon, { backgroundColor: status.accentSoft }]}>
                  <Text style={styles.shelterCardIconText}>
                    {shelter.type === 'Hospital' ? '✚' : '⌂'}
                  </Text>
                </View>
                <View style={styles.shelterCardCopy}>
                  <Text style={styles.shelterCardTitle}>{shelter.name.toUpperCase()}</Text>
                  <Text style={styles.shelterCardSubtitle}>
                    {shelter.type}
                    {shelter.address ? ` · ${shelter.address}` : ''}
                    {' · '}{shelter.distance < 1000 ? `${shelter.distance} m away` : `${(shelter.distance / 1000).toFixed(1)} km away`}
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Manual destination search */}
          <SectionTitle eyebrow="OR SEARCH" title="Choose a destination" />
          <Text style={styles.shelterCardSubtitle}>
            Search for a shelter, address, or landmark. Results are not verified shelter listings.
          </Text>
          {destination ? (
            <View style={[styles.shelterCard, { backgroundColor: status.surface, borderColor: status.border }]}>
              <View style={[styles.shelterCardIcon, { backgroundColor: status.accentSoft }]}>
                <Text style={styles.shelterCardIconText}>+</Text>
              </View>
              <View style={styles.shelterCardCopy}>
                <Text style={styles.shelterCardTitle}>{destination.name}</Text>
                <Text style={styles.shelterCardSubtitle}>
                  {route ? `${formatDistance(route.distance)} · about ${formatDuration(route.duration)} min` : 'Place selected · route unavailable'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.modePanel, { backgroundColor: status.surface, borderColor: status.border }]}>
          <View style={styles.modeHeading}>
            <Text style={[styles.modeTitle, { color: status.color }]}>DEMO · SYSTEM RESILIENCE</Text>
            <Text style={styles.modeHint}>{status.instruction}</Text>
          </View>
          <View style={[styles.modeButtons, { backgroundColor: status.background }]}>
            {[
              { key: 'connected', label: 'CONNECTED' },
              { key: 'degraded', label: '2G / EDGE' },
              { key: 'survival', label: 'SURVIVAL' },
            ].map((item) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === item.key }}
                key={item.key}
                onPress={() => simulateMode(item.key)}
                style={[styles.modeButton, mode === item.key && { backgroundColor: status.accentSoft }]}
              >
                <Text style={[styles.modeButtonText, mode === item.key && { color: status.color }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>Prototype · Verify live directions, closures, alerts, and shelter status with local authorities.</Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable accessibilityRole="button" onPress={() => navigateTo('navigate')} style={styles.bottomBarItem}>
          <Text style={activeTab === 'navigate' ? styles.bottomBarActiveIcon : styles.bottomBarIcon}>⌖</Text>
          <Text style={activeTab === 'navigate' ? styles.bottomBarActiveLabel : styles.bottomBarLabel}>NAVIGATE</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigateTo('reports')} style={styles.bottomBarItem}>
          <Text style={activeTab === 'reports' ? styles.bottomBarActiveIcon : styles.bottomBarIcon}>⌁</Text>
          <Text style={activeTab === 'reports' ? styles.bottomBarActiveLabel : styles.bottomBarLabel}>REPORTS</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigateTo('shelters')} style={styles.bottomBarItem}>
          <Text style={activeTab === 'shelters' ? styles.bottomBarActiveIcon : styles.bottomBarIcon}>◇</Text>
          <Text style={activeTab === 'shelters' ? styles.bottomBarActiveLabel : styles.bottomBarLabel}>SHELTERS</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090D12' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandMark: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#13231F',
    borderWidth: 1, borderColor: '#244A3D', alignItems: 'center', justifyContent: 'center',
  },
  brandMarkText: { color: '#72D9AD', fontSize: 18, fontWeight: '800' },
  brandCopy: { marginLeft: 10, flex: 1 },
  brandName: { color: '#F1F5F4', fontSize: 14, fontWeight: '800', letterSpacing: 2.2 },
  brandDescriptor: { color: '#75818C', fontSize: 8, fontWeight: '700', letterSpacing: 1.2, marginTop: 3 },
  pill: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 9,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  pillText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#261716',
    borderWidth: 1, borderColor: '#58302C', borderRadius: 14, padding: 12, marginBottom: 25,
  },
  alertIcon: {
    width: 27, height: 27, borderRadius: 9, backgroundColor: '#542823',
    alignItems: 'center', justifyContent: 'center',
  },
  alertIconText: { color: '#FF887C', fontWeight: '900', fontSize: 15 },
  alertCopy: { flex: 1, marginLeft: 10 },
  alertTitle: { color: '#FF9288', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  alertDescription: { color: '#C8A29F', fontSize: 10, marginTop: 4 },
  alertChevron: { color: '#D47E75', fontSize: 23, marginLeft: 6 },
  greeting: { marginBottom: 17 },
  eyebrow: { color: '#6DDBAD', fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  heroTitle: { color: '#F2F5F4', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 7 },
  heroSubtitle: { color: '#8E9AA5', fontSize: 11, marginTop: 5 },
  livePanel: {
    backgroundColor: '#10231B', borderColor: '#2B6247', borderWidth: 1, borderRadius: 15,
    padding: 13, marginBottom: 12,
  },
  livePanelHeader: { flexDirection: 'row', alignItems: 'center' },
  liveIndicator: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#62D6A6', marginRight: 7 },
  livePanelEyebrow: { color: '#96B6A4', fontSize: 8, fontWeight: '800', letterSpacing: 1, flex: 1 },
  livePulse: { color: '#62D6A6', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  liveMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  liveMetric: { flex: 1 },
  liveMetricValue: { color: '#E7F7ED', fontSize: 20, fontWeight: '800' },
  liveMetricLabel: { color: '#88A694', fontSize: 7, fontWeight: '800', letterSpacing: 0.7, marginTop: 3 },
  liveDivider: { width: 1, height: 31, backgroundColor: '#31523E', marginRight: 14 },
  liveAction: {
    borderWidth: 1, borderColor: '#3B7758', backgroundColor: '#193A2B',
    borderRadius: 9, paddingVertical: 9, paddingHorizontal: 10,
  },
  liveActionText: { color: '#9AE5BA', fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  serviceError: { color: '#FF9288', fontSize: 9, lineHeight: 14, marginTop: 8 },
  degradedPanel: { borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 12 },
  degradedPanelTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  degradedPanelText: { color: '#B5AA96', fontSize: 10, marginTop: 5 },
  degradedSteps: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  degradedStep: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginRight: 11, marginTop: 3 },
  degradedStepPending: { color: '#A99573', fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  weatherCard: { borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 12 },
  weatherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weatherTitle: { color: '#9AA7A0', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  weatherSource: { color: '#76847C', fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
  weatherData: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  weatherTemperature: { fontSize: 25, lineHeight: 30, fontWeight: '800', marginRight: 11 },
  weatherCopy: { flex: 1 },
  weatherCondition: { color: '#E6ECE8', fontSize: 11, fontWeight: '800' },
  weatherDetail: { color: '#A3AEA8', fontSize: 9, lineHeight: 14, marginTop: 6 },
  serviceDisclaimer: { color: '#A79981', fontSize: 9, lineHeight: 14, marginTop: 2, marginBottom: 8 },
  routeSummary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#121A20',
    borderWidth: 1, borderColor: '#202B32', borderRadius: 14, padding: 12, marginBottom: 12,
  },
  destinationIcon: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: '#16352B',
    borderWidth: 1, borderColor: '#285541', alignItems: 'center', justifyContent: 'center',
  },
  destinationIconText: { color: '#72D9AD', fontSize: 21, fontWeight: '500', lineHeight: 24 },
  destinationCopy: { flex: 1, marginLeft: 10 },
  destinationEyebrow: { color: '#82908F', fontSize: 8, fontWeight: '700', letterSpacing: 0.9 },
  destinationName: { color: '#E5EBE8', fontSize: 13, fontWeight: '700', marginTop: 4 },
  routeDistance: { color: '#83968A', fontSize: 8, marginTop: 3 },
  eta: { alignItems: 'flex-end', flexDirection: 'row' },
  etaValue: { color: '#F2F5F4', fontSize: 24, fontWeight: '800', lineHeight: 27 },
  etaUnit: { color: '#97A39F', fontSize: 8, fontWeight: '800', marginLeft: 4, marginBottom: 4 },
  turnCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#121A20',
    borderWidth: 1, borderColor: '#253138', borderRadius: 14, padding: 12, marginBottom: 12,
  },
  turnIcon: {
    width: 35, height: 35, borderRadius: 11, backgroundColor: '#1D302A',
    alignItems: 'center', justifyContent: 'center',
  },
  turnIconText: { color: '#79DAB0', fontSize: 21, fontWeight: '700' },
  turnCopy: { flex: 1, marginLeft: 10 },
  turnEyebrow: { color: '#74D6AA', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  turnInstruction: { color: '#EDF1EF', fontSize: 12, fontWeight: '700', marginTop: 4 },
  turnSubtext: { color: '#E19A76', fontSize: 9, marginTop: 4 },
  turnArrow: { color: '#788680', fontSize: 22, paddingLeft: 5 },
  survivalCard: { borderWidth: 1, borderRadius: 15, padding: 16, marginBottom: 12 },
  survivalTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  survivalEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  survivalGps: { color: '#92999A', fontSize: 7, fontWeight: '800', letterSpacing: 0.7 },
  survivalInstruction: { color: '#FFFDFC', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 18 },
  survivalStreet: { color: '#F2F0EB', fontSize: 18, fontWeight: '700', marginTop: 2 },
  survivalDistance: { color: '#ABA8A2', fontSize: 12, marginTop: 7 },
  survivalDivider: { height: 1, backgroundColor: '#35352D', marginVertical: 12 },
  survivalWarningBox: { borderRadius: 10, padding: 10 },
  survivalWarning: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  survivalWarningDetail: { color: '#D2AAA6', fontSize: 9, marginTop: 4 },
  survivalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  survivalFooterTag: { color: '#939494', fontSize: 7, fontWeight: '800', letterSpacing: 0.7 },
  coordinates: { color: '#9CA3A0', fontSize: 9, fontFamily: 'monospace' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#EDF1EF', fontSize: 17, fontWeight: '800', marginTop: 5 },
  reportCount: { color: '#7C8987', fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  hazardRow: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#1C252A',
  },
  hazardDot: { width: 7, height: 7, borderRadius: 4 },
  hazardCopy: { flex: 1, marginLeft: 10 },
  hazardType: { color: '#DDE4E0', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  hazardStreet: { color: '#85918D', fontSize: 9, marginTop: 3 },
  hazardAge: { color: '#78847F', fontSize: 8 },
  notice: { borderRadius: 10, backgroundColor: '#14251D', padding: 10, marginTop: 12 },
  noticeText: { color: '#78D8AD', fontSize: 10, fontWeight: '700' },
  reportButton: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#183A2D',
    borderWidth: 1, borderColor: '#32654D', borderRadius: 13, minHeight: 65, marginTop: 16,
  },
  reportButtonIcon: { position: 'absolute', left: 20, top: 17, color: '#81E0B4', fontSize: 23 },
  reportButtonText: { color: '#DAF3E5', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  reportButtonSubtext: { color: '#86B69C', fontSize: 7, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  reportPanel: {
    backgroundColor: '#11191D', borderWidth: 1, borderColor: '#2B383C',
    borderRadius: 14, padding: 13, marginTop: 15,
  },
  reportPanelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportPanelTitle: { color: '#EDF1EF', fontSize: 13, fontWeight: '800' },
  dismissText: { color: '#899590', fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  reportHint: { color: '#85918D', fontSize: 9, marginTop: 5 },
  hazardChoices: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  hazardChoice: {
    width: '48%', minHeight: 43, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#192126', borderRadius: 9, paddingHorizontal: 9, marginRight: '2%', marginBottom: 6,
  },
  hazardChoiceIcon: { fontSize: 17, fontWeight: '900', width: 24 },
  hazardChoiceText: { color: '#D3DCD7', fontSize: 9, fontWeight: '700' },
  shelterCard: {
    minHeight: 58, flexDirection: 'row', alignItems: 'center', backgroundColor: '#121A20',
    borderWidth: 1, borderColor: '#232F34', borderRadius: 12, padding: 10, marginTop: 8,
  },
  shelterCardIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#19362C',
    alignItems: 'center', justifyContent: 'center',
  },
  shelterCardIconText: { color: '#7ADBB0', fontSize: 19, fontWeight: '700', lineHeight: 22 },
  shelterCardCopy: { flex: 1, marginLeft: 9 },
  shelterCardTitle: { color: '#DCE5E0', fontSize: 10, fontWeight: '800' },
  shelterCardSubtitle: { color: '#81908A', fontSize: 8, marginTop: 4 },
  modePanel: {
    backgroundColor: '#10161B', borderWidth: 1, borderColor: '#222D33',
    borderRadius: 13, padding: 12, marginTop: 18,
  },
  modeHeading: { marginBottom: 10 },
  modeTitle: { color: '#8F9B9F', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  modeHint: { color: '#6F7A7D', fontSize: 8, marginTop: 4 },
  modeButtons: { flexDirection: 'row', backgroundColor: '#0B1014', borderRadius: 9, padding: 3 },
  modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7, minHeight: 32 },
  modeButtonText: { color: '#74807F', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  footer: { color: '#748078', textAlign: 'center', fontSize: 9, marginTop: 18, marginBottom: 10 },
  bottomBar: {
    height: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#0D1317', borderTopWidth: 1, borderTopColor: '#20292D',
  },
  bottomBarActiveIcon: { color: '#79DDB0', fontSize: 18, lineHeight: 20 },
  bottomBarActiveLabel: { color: '#79DDB0', fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  bottomBarItem: { alignItems: 'center', minWidth: 72 },
  bottomBarIcon: { color: '#77827F', fontSize: 17, lineHeight: 20 },
  bottomBarLabel: { color: '#77827F', fontSize: 7, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
});