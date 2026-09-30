import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [20, 0];

export default function MapPreview({
  mode,
  status,
  location,
  hazards,
  destination,
  route,
  onLocate,
  onFindDestination,
  destinationQuery,
  onChangeDestinationQuery,
  isLocating,
  isSearching,
  mapError,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const locationMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const hazardMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    import('leaflet')
      .then((leafletModule) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const L = leafletModule.default || leafletModule;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
          preferCanvas: true,
        }).setView(DEFAULT_CENTER, 2);

        L.control.zoom({ position: 'topright' }).addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        leafletRef.current = L;
        mapRef.current = map;
        setMapReady(true);
        window.setTimeout(() => map.invalidateSize(), 0);
      })
      .catch(() => {
        if (!cancelled) setLoadError('The map could not be loaded. Check your connection and reload.');
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady || !location) return;

    const point = [location.latitude, location.longitude];
    if (locationMarkerRef.current) {
      locationMarkerRef.current.setLatLng(point);
    } else {
      locationMarkerRef.current = L.circleMarker(point, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: status.color,
        fillOpacity: 1,
      }).addTo(map).bindPopup('Your current location');
    }
    if (!destination) map.setView(point, 14);
  }, [location, destination, mapReady, status.color]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    if (destination) {
      const point = [destination.latitude, destination.longitude];
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng(point);
      } else {
        destinationMarkerRef.current = L.circleMarker(point, {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#62D6A6',
          fillOpacity: 1,
        }).addTo(map);
      }
      destinationMarkerRef.current.bindPopup(destination.name);
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (route?.geometry) {
      if (routeLayerRef.current) routeLayerRef.current.remove();
      routeLayerRef.current = L.geoJSON(route.geometry, {
        style: { color: status.color, weight: 5, opacity: 0.9 },
      }).addTo(map);
      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30] });
    } else if (location && destination) {
      map.fitBounds([
        [location.latitude, location.longitude],
        [destination.latitude, destination.longitude],
      ], { padding: [35, 35] });
    }
  }, [location, destination, route, mapReady, status.color]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!map || !L || !mapReady) return;

    hazardMarkersRef.current.forEach((marker) => marker.remove());
    hazardMarkersRef.current = hazards
      .filter((hazard) => Number.isFinite(hazard.latitude) && Number.isFinite(hazard.longitude))
      .map((hazard) => L.circleMarker([hazard.latitude, hazard.longitude], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: hazard.color,
        fillOpacity: 1,
      }).addTo(map).bindPopup(`${hazard.type} · session-only report`));
  }, [hazards, mapReady]);

  return (
    <View style={[styles.card, { backgroundColor: status.surface, borderColor: status.border }]}>
      <View style={styles.toolbar}>
        <View style={styles.mapTitle}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{location ? 'YOUR AREA' : 'LIVE MAP'}</Text>
            <Text style={styles.subtitle}>
              {location ? 'OpenStreetMap · GPS location' : 'Tap locate to load your local map'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isLocating}
          onPress={onLocate}
          style={[styles.locateButton, { borderColor: status.border, backgroundColor: status.accentSoft }]}
        >
          {isLocating
            ? <ActivityIndicator color={status.color} size="small" />
            : <Text style={[styles.locateText, { color: status.color }]}>⌖ LOCATE</Text>}
        </Pressable>
      </View>

      <View ref={containerRef} style={styles.mapCanvas}>
        {!mapReady && !loadError && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={status.color} />
            <Text style={styles.mapLoadingText}>Loading OpenStreetMap…</Text>
          </View>
        )}
        {loadError ? <Text style={styles.mapError}>{loadError}</Text> : null}
        {mode === 'degraded' && mapReady ? (
          <View pointerEvents="none" style={styles.mapModeTag}>
            <Text style={styles.mapModeTagText}>DATA-SAVER DEMO · ONLINE MAP</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.destinationRow}>
        <TextInput
          accessibilityLabel="Destination address or landmark"
          onChangeText={onChangeDestinationQuery}
          onSubmitEditing={onFindDestination}
          placeholder="Shelter, address, or landmark"
          placeholderTextColor="#74817C"
          returnKeyType="search"
          style={styles.destinationInput}
          value={destinationQuery}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isSearching}
          onPress={onFindDestination}
          style={[styles.searchButton, { backgroundColor: status.accentSoft, borderColor: status.border }]}
        >
          {isSearching
            ? <ActivityIndicator color={status.color} size="small" />
            : <Text style={[styles.searchButtonText, { color: status.color }]}>ROUTE</Text>}
        </Pressable>
      </View>
      {destination ? <Text style={styles.destinationName}>{destination.displayName}</Text> : null}
      {mapError ? <Text accessibilityRole="alert" style={styles.errorText}>{mapError}</Text> : null}
      <Text style={styles.attributionNote}>Map data © OpenStreetMap contributors · Routing by OSRM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  toolbar: { minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  mapTitle: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 9 },
  titleCopy: { flex: 1 },
  title: { color: '#E6ECE8', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: '#8A9690', fontSize: 9, marginTop: 3 },
  locateButton: {
    minWidth: 88, height: 34, borderWidth: 1, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  locateText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  mapCanvas: { height: 258, position: 'relative', backgroundColor: '#11191D' },
  mapLoading: {
    position: 'absolute', zIndex: 500, inset: 0, alignItems: 'center',
    justifyContent: 'center', gap: 8, backgroundColor: '#11191DDD',
  },
  mapLoadingText: { color: '#D0D8D3', fontSize: 11 },
  mapError: { color: '#FF9288', fontSize: 11, padding: 16 },
  mapModeTag: {
    position: 'absolute', zIndex: 500, left: 10, top: 10, paddingVertical: 6, paddingHorizontal: 9,
    borderRadius: 7, backgroundColor: '#211A0FEF', borderWidth: 1, borderColor: '#493922',
  },
  mapModeTagText: { color: '#F3B95F', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  destinationRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingTop: 10 },
  destinationInput: {
    height: 40, flex: 1, minWidth: 0, paddingHorizontal: 11, borderRadius: 9,
    borderWidth: 1, borderColor: '#2B383C', backgroundColor: '#0C1216',
    color: '#EDF1EF', fontSize: 11, outlineStyle: 'none',
  },
  searchButton: {
    width: 72, height: 40, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  searchButtonText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  destinationName: { color: '#A9B5AE', fontSize: 9, lineHeight: 14, paddingHorizontal: 11, paddingTop: 8 },
  errorText: { color: '#FF9288', fontSize: 9, paddingHorizontal: 11, paddingTop: 7 },
  attributionNote: { color: '#77817D', fontSize: 8, paddingHorizontal: 11, paddingTop: 8, paddingBottom: 10 },
});
