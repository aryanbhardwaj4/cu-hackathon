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

const MODES = {
  connected: {
    label: 'CONNECTED',
    detail: 'Live updates enabled',
    color: '#62D6A6',
    battery: '82%',
    instruction: 'Live conditions checked just now',
    background: '#09120F',
    surface: '#142019',
    border: '#294337',
    accentSoft: '#19372B',
    hero: 'Your route. In real time.',
    subtitle: 'Live conditions are available. Stay alert and follow local guidance.',
    alertTitle: 'LIVE FLOOD ADVISORY · DEMO',
    alertDetail: 'Water rising near 6th Avenue. A safer route is ready.',
    mapLabel: 'LIVE MAP · SAMPLE DATA',
  },
  degraded: {
    label: 'LOW BANDWIDTH',
    detail: 'Switching to offline maps',
    color: '#F3B95F',
    battery: '24%',
    instruction: 'Offline route ready · last synced 4 min ago',
    background: '#151109',
    surface: '#211A0F',
    border: '#493922',
    accentSoft: '#392B15',
    hero: 'Your route. Still offline.',
    subtitle: 'Bandwidth is fading. Heavy layers are off; your local route remains.',
    alertTitle: 'NETWORK IS DEGRADED',
    alertDetail: 'Live updates paused. Last saved route is ready to follow.',
    mapLabel: 'LOW-DATA VECTOR · CACHED',
  },
  survival: {
    label: 'SURVIVAL MODE',
    detail: 'No network · low power',
    color: '#FF716B',
    battery: '14%',
    instruction: 'Map and camera paused to preserve battery',
    background: '#080A0D',
    surface: '#141416',
    border: '#3B2728',
    accentSoft: '#3A1F20',
    hero: 'Keep moving.',
    subtitle: 'Text directions only. Screen and GPS are in low-power mode.',
    alertTitle: 'NO SIGNAL · BATTERY CRITICAL',
    alertDetail: 'Follow your last saved route. Avoid 6th Avenue.',
    mapLabel: 'TEXT-ONLY NAVIGATION',
  },
};

const INITIAL_HAZARDS = [
  { type: 'FLOODING', street: '6th Avenue', age: '2 min ago', color: '#FF716B' },
  { type: 'ROAD CLEAR', street: 'Market Street', age: '18 min ago', color: '#62D6A6' },
];

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

function MapPreview({ mode, hazards, cached, status }) {
  return (
    <View style={[styles.map, { backgroundColor: status.background, borderColor: status.border }]}>
      <View style={[styles.mapGridHorizontal, mode === 'degraded' && styles.mapGridMuted]} />
      <View style={[styles.mapGridVertical, mode === 'degraded' && styles.mapGridMuted]} />
      <View style={[styles.park, { top: 16, left: 18 }]}>
        <Text style={styles.parkLabel}>RIVERSIDE PARK</Text>
      </View>
      <View style={[styles.park, styles.parkSecond]}>
        <Text style={styles.parkLabel}>COMMUNITY GARDEN</Text>
      </View>
      <View style={[styles.street, styles.streetA]} />
      <View style={[styles.street, styles.streetB]} />
      <View style={[styles.street, styles.streetC]} />
      <View style={[styles.street, styles.streetD]} />
      <View style={[styles.street, styles.streetE]} />
      <Text style={[styles.mapLabel, { top: 64, left: 20 }]}>PINE ST</Text>
      <Text style={[styles.mapLabel, { top: 164, left: 22 }]}>MARKET ST</Text>
      <Text style={[styles.mapLabel, { top: 63, right: 14 }]}>5TH AVE</Text>
      <Text style={[styles.mapLabel, { top: 165, right: 14 }]}>6TH AVE</Text>
      <View style={[styles.routeSegmentOne, { backgroundColor: status.color }]} />
      <View style={[styles.routeSegmentTwo, { backgroundColor: status.color }]} />
      <View style={[styles.routeSegmentThree, { backgroundColor: status.color }]} />
      <View style={[styles.routeSegmentFour, { backgroundColor: status.color }]} />
      <View style={[styles.currentLocation, { backgroundColor: `${status.color}33`, borderColor: status.color }]}>
        <View style={[styles.currentLocationCore, { backgroundColor: status.color }]} />
      </View>
      <View style={styles.shelterMarker}>
        <Text style={styles.shelterMarkerText}>+</Text>
      </View>
      {hazards.some((hazard) => hazard.type === 'FLOODING') && (
        <View style={styles.hazardMarker}>
          <Text style={styles.hazardMarkerText}>!</Text>
        </View>
      )}
      <View style={styles.mapTopTag}>
        <View style={[styles.pillDot, { backgroundColor: cached ? '#62D6A6' : '#F3B95F' }]} />
        <Text style={styles.mapTopTagText}>{mode === 'degraded' ? status.mapLabel : cached ? status.mapLabel : 'DEMO MAP NOT SAVED'}</Text>
      </View>
      <View style={styles.mapCompass}>
        <Text style={styles.compassNorth}>N</Text>
        <Text style={styles.compassArrow}>↑</Text>
      </View>
      <View style={styles.mapScale}>
        <View style={styles.mapScaleLine} />
        <Text style={styles.mapScaleText}>200 m</Text>
      </View>
    </View>
  );
}

export default function DisasterNavigationApp() {
  const [mode, setMode] = useState('connected');
  const [hazards, setHazards] = useState(INITIAL_HAZARDS);
  const [reporting, setReporting] = useState(false);
  const [cached, setCached] = useState(true);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('navigate');
  const scrollRef = useRef(null);
  const reportsOffset = useRef(0);
  const sheltersOffset = useRef(0);
  const status = MODES[mode];

  const navigateTo = (tab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({
      y: tab === 'reports' ? reportsOffset.current : tab === 'shelters' ? sheltersOffset.current : 0,
      animated: true,
    });
  };

  const reportHazard = (hazard) => {
    setHazards((current) => [
      { type: hazard.label.toUpperCase(), street: 'Near your location', age: 'Just now', color: hazard.color },
      ...current,
    ]);
    setReporting(false);
    setNotice(`${hazard.label} added to this demo's local report list`);
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
            <Text style={styles.brandDescriptor}>OFFLINE-FIRST EVACUATION</Text>
          </View>
          <Pill color={status.color}>{status.label}</Pill>
        </View>

        <View style={[styles.alertBanner, { backgroundColor: status.surface, borderColor: status.border }]}>
          <View style={[styles.alertIcon, { backgroundColor: status.accentSoft }]}>
            <Text style={[styles.alertIconText, { color: status.color }]}>!</Text>
          </View>
          <View style={styles.alertCopy}>
            <Text style={[styles.alertTitle, { color: status.color }]}>{status.alertTitle}</Text>
            <Text style={styles.alertDescription}>{status.alertDetail}</Text>
          </View>
          <Text style={[styles.alertChevron, { color: status.color }]}>›</Text>
        </View>

        <View style={styles.greeting}>
          <Text style={[styles.eyebrow, { color: status.color }]}>{status.mapLabel}</Text>
          <Text style={styles.heroTitle}>{status.hero}</Text>
          <Text style={styles.heroSubtitle}>{status.subtitle}</Text>
        </View>

        {mode === 'connected' && (
          <View style={styles.livePanel}>
            <View style={styles.livePanelHeader}>
              <View style={styles.liveIndicator} />
              <Text style={styles.livePanelEyebrow}>LIVE RESPONSE · DEMO FEED</Text>
              <Text style={styles.livePulse}>● LIVE</Text>
            </View>
            <View style={styles.liveMetrics}>
              <View style={styles.liveMetric}>
                <Text style={styles.liveMetricValue}>2</Text>
                <Text style={styles.liveMetricLabel}>ROUTE CHECKS</Text>
              </View>
              <View style={styles.liveDivider} />
              <View style={styles.liveMetric}>
                <Text style={styles.liveMetricValue}>1</Text>
                <Text style={styles.liveMetricLabel}>NEARBY ALERT</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setReporting(true)} style={styles.liveAction}>
                <Text style={styles.liveActionText}>TAG HAZARD  +</Text>
              </Pressable>
            </View>
          </View>
        )}

        {mode === 'degraded' && (
          <View style={[styles.degradedPanel, { backgroundColor: status.surface, borderColor: status.border }]}>
            <Text style={[styles.degradedPanelTitle, { color: status.color }]}>DATA SAVER ON</Text>
            <Text style={styles.degradedPanelText}>Satellite, radar and AR are paused to protect bandwidth.</Text>
            <View style={styles.degradedSteps}>
              <Text style={[styles.degradedStep, { color: status.color }]}>✓ ROUTE CACHED</Text>
              <Text style={[styles.degradedStep, { color: status.color }]}>✓ TEXT REPORTS</Text>
              <Text style={styles.degradedStepPending}>◷ RETRY WHEN ONLINE</Text>
            </View>
          </View>
        )}

        <View style={[styles.routeSummary, { backgroundColor: status.surface, borderColor: status.border }]}>
          <View style={[styles.destinationIcon, { backgroundColor: status.accentSoft, borderColor: status.border }]}>
            <Text style={[styles.destinationIconText, { color: status.color }]}>+</Text>
          </View>
          <View style={styles.destinationCopy}>
            <Text style={styles.destinationEyebrow}>DEMO DESTINATION · SHELTER</Text>
            <Text style={styles.destinationName}>Riverside High School</Text>
          </View>
          <View style={styles.eta}>
            <Text style={styles.etaValue}>12</Text>
            <Text style={styles.etaUnit}>MIN</Text>
          </View>
        </View>

        {mode !== 'survival' && <MapPreview mode={mode} hazards={hazards} cached={cached} status={status} />}

        {mode === 'survival' ? (
          <View style={[styles.survivalCard, { backgroundColor: status.surface, borderColor: status.border }]}>
            <View style={styles.survivalTopline}>
              <Text style={[styles.survivalEyebrow, { color: status.color }]}>NEXT TURN · SAVED ROUTE</Text>
              <Text style={styles.survivalGps}>GPS · DEMO</Text>
            </View>
            <Text style={styles.survivalInstruction}>↑  Head north</Text>
            <Text style={styles.survivalStreet}>on 5th Avenue</Text>
            <Text style={styles.survivalDistance}>Continue for 400 m</Text>
            <View style={[styles.survivalDivider, { backgroundColor: status.border }]} />
            <View style={[styles.survivalWarningBox, { backgroundColor: status.accentSoft }]}>
              <Text style={[styles.survivalWarning, { color: status.color }]}>!  DO NOT TAKE 6TH AVENUE</Text>
              <Text style={styles.survivalWarningDetail}>Flooding reported on this street.</Text>
            </View>
            <View style={styles.survivalFooter}>
              <Text style={styles.coordinates}>40.7128° N, 74.0060° W</Text>
              <Text style={styles.survivalFooterTag}>MAP PAUSED</Text>
            </View>
          </View>
        ) : (
          <View style={styles.turnCard}>
            <View style={styles.turnIcon}>
              <Text style={styles.turnIconText}>↰</Text>
            </View>
            <View style={styles.turnCopy}>
              <Text style={styles.turnEyebrow}>NEXT TURN · IN 400 M</Text>
              <Text style={styles.turnInstruction}>Turn left on Pine Street</Text>
              <Text style={styles.turnSubtext}>Avoid 6th Avenue · flooding reported</Text>
            </View>
            <Text style={styles.turnArrow}>›</Text>
          </View>
        )}

        {mode !== 'survival' && <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>BATTERY</Text>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color: status.color }]}>{status.battery}</Text>
              <Text style={styles.metricSuffix}>
                {mode === 'connected' ? ' · AVAILABLE' : mode === 'degraded' ? ' · CONSERVE' : ' · CRITICAL'}
              </Text>
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>NETWORK</Text>
            <Text style={[styles.metricValue, { color: status.color }]}>{status.detail}</Text>
          </View>
        </View>}

        {mode !== 'survival' ? (
          <View style={[styles.cacheCard, { backgroundColor: status.surface, borderColor: status.border }]}>
            <View style={styles.cacheIcon}>
              <Text style={styles.cacheIconText}>{cached ? '✓' : '↓'}</Text>
            </View>
            <View style={styles.cacheCopy}>
              <Text style={styles.cacheTitle}>{cached ? 'Demo offline map is ready' : 'Demo offline cache is inactive'}</Text>
              <Text style={styles.cacheSubtitle}>
                {cached ? 'Simulated 12 MB · Sample routes and shelters' : 'Toggle SAVE to restore the demo cache'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCached((value) => !value);
                setNotice(cached ? 'Demo offline cache marked unavailable' : 'Demo offline cache marked ready');
              }}
              style={styles.cacheAction}
            >
              <Text style={styles.cacheActionText}>{cached ? 'READY' : 'SAVE'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.powerCard}>
            <Text style={styles.powerLabel}>POWER PRESERVATION</Text>
            <Text style={styles.powerValue}>
              14% <Text style={styles.powerValueCaption}>· CAMERA OFF · MAP OFF</Text>
            </Text>
            <View style={styles.powerTrack}><View style={styles.powerFill} /></View>
          </View>
        )}

        <View onLayout={(event) => { reportsOffset.current = event.nativeEvent.layout.y; }}>
        <SectionTitle
          eyebrow="COMMUNITY SIGNAL"
          title="Nearby reports"
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
            <Text style={styles.reportHint}>Choose a type · added to the local demo list (GPS and mesh are simulated)</Text>
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
            <Text style={styles.reportButtonSubtext}>QUICK · ANONYMOUS · OFFLINE-READY</Text>
          </Pressable>
        )}
        </View>

        <View onLayout={(event) => { sheltersOffset.current = event.nativeEvent.layout.y; }}>
          <SectionTitle eyebrow="SAFE DESTINATIONS" title="Nearby shelters" />
          <View style={styles.shelterCard}>
            <View style={styles.shelterCardIcon}><Text style={styles.shelterCardIconText}>+</Text></View>
            <View style={styles.shelterCardCopy}>
              <Text style={styles.shelterCardTitle}>Riverside High School</Text>
              <Text style={styles.shelterCardSubtitle}>DEMO · 0.8 km · Accessibility unverified</Text>
            </View>
            <Text style={styles.shelterCardArrow}>›</Text>
          </View>
          <View style={styles.shelterCard}>
            <View style={[styles.shelterCardIcon, styles.shelterCardIconAlt]}>
              <Text style={styles.shelterCardIconText}>+</Text>
            </View>
            <View style={styles.shelterCardCopy}>
              <Text style={styles.shelterCardTitle}>Northside Community Center</Text>
              <Text style={styles.shelterCardSubtitle}>DEMO · 1.4 km · Capacity unverified</Text>
            </View>
            <Text style={styles.shelterCardArrow}>›</Text>
          </View>
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

        <Text style={styles.footer}>Demo only · Verify live directions and shelter status with local authorities.</Text>
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
  degradedPanel: { borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 12 },
  degradedPanelTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  degradedPanelText: { color: '#B5AA96', fontSize: 10, marginTop: 5 },
  degradedSteps: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  degradedStep: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginRight: 11, marginTop: 3 },
  degradedStepPending: { color: '#A99573', fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
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
  eta: { alignItems: 'flex-end', flexDirection: 'row' },
  etaValue: { color: '#F2F5F4', fontSize: 24, fontWeight: '800', lineHeight: 27 },
  etaUnit: { color: '#97A39F', fontSize: 8, fontWeight: '800', marginLeft: 4, marginBottom: 4 },
  map: {
    height: 232, borderRadius: 16, overflow: 'hidden', backgroundColor: '#131E20',
    borderWidth: 1, borderColor: '#293833', marginBottom: 12,
  },
  mapLowPower: { backgroundColor: '#11171A', borderColor: '#40382A' },
  mapGridMuted: { borderColor: '#29251E' },
  mapGridHorizontal: {
    position: 'absolute', width: '130%', height: 70, left: -25, top: 81,
    borderTopWidth: 7, borderBottomWidth: 7, borderColor: '#293333', transform: [{ rotate: '-13deg' }],
  },
  mapGridVertical: {
    position: 'absolute', height: '130%', width: 65, top: -25, left: 179,
    borderLeftWidth: 7, borderRightWidth: 7, borderColor: '#293333', transform: [{ rotate: '12deg' }],
  },
  park: {
    position: 'absolute', width: 136, height: 58, borderRadius: 10, backgroundColor: '#1B382E',
    borderWidth: 1, borderColor: '#2D5947', justifyContent: 'center', paddingLeft: 9,
  },
  parkSecond: { top: 150, left: 28, width: 100, height: 48, backgroundColor: '#1A302A' },
  parkLabel: { color: '#67947D', fontSize: 7, fontWeight: '700', letterSpacing: 0.7 },
  street: { position: 'absolute', backgroundColor: '#45504D', opacity: 0.8 },
  streetA: { top: 87, left: -12, width: 390, height: 4, transform: [{ rotate: '-13deg' }] },
  streetB: { top: 159, left: -8, width: 390, height: 4, transform: [{ rotate: '-13deg' }] },
  streetC: { top: 4, left: 181, width: 4, height: 270, transform: [{ rotate: '12deg' }] },
  streetD: { top: -9, left: 264, width: 4, height: 270, transform: [{ rotate: '12deg' }] },
  streetE: { top: 207, left: 119, width: 4, height: 150, transform: [{ rotate: '12deg' }] },
  mapLabel: { position: 'absolute', color: '#84908C', fontSize: 7, fontWeight: '800', letterSpacing: 1 },
  routeSegmentOne: {
    position: 'absolute', left: 75, top: 181, width: 4, height: 48, backgroundColor: '#65D6A5',
    transform: [{ rotate: '12deg' }], borderRadius: 3,
  },
  routeSegmentTwo: {
    position: 'absolute', left: 80, top: 161, width: 93, height: 4, backgroundColor: '#65D6A5',
    transform: [{ rotate: '-13deg' }], borderRadius: 3,
  },
  routeSegmentThree: {
    position: 'absolute', left: 168, top: 127, width: 4, height: 43, backgroundColor: '#65D6A5',
    transform: [{ rotate: '12deg' }], borderRadius: 3,
  },
  routeSegmentFour: {
    position: 'absolute', left: 165, top: 122, width: 91, height: 4, backgroundColor: '#65D6A5',
    transform: [{ rotate: '-13deg' }], borderRadius: 3,
  },
  currentLocation: {
    position: 'absolute', left: 65, top: 193, width: 23, height: 23, borderRadius: 12,
    backgroundColor: '#65D6A533', borderWidth: 1, borderColor: '#65D6A5', alignItems: 'center', justifyContent: 'center',
  },
  currentLocationCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#72E0AF' },
  shelterMarker: {
    position: 'absolute', left: 248, top: 109, width: 24, height: 24, borderRadius: 8,
    backgroundColor: '#D9F7E7', alignItems: 'center', justifyContent: 'center',
  },
  shelterMarkerText: { color: '#176344', fontSize: 19, fontWeight: '700', lineHeight: 22 },
  hazardMarker: {
    position: 'absolute', right: 54, top: 145, width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#612F2D', borderWidth: 1, borderColor: '#FF716B', alignItems: 'center', justifyContent: 'center',
  },
  hazardMarkerText: { color: '#FF8279', fontSize: 13, fontWeight: '900' },
  mapTopTag: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0B1110E8', borderWidth: 1, borderColor: '#34443D', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 8,
  },
  mapTopTagText: { color: '#C2D2CA', fontSize: 7, fontWeight: '800', letterSpacing: 0.7 },
  mapCompass: { position: 'absolute', top: 9, right: 11, alignItems: 'center' },
  compassNorth: { color: '#AEBAB5', fontSize: 7, fontWeight: '800' },
  compassArrow: { color: '#E0E9E4', fontSize: 15, fontWeight: '700', marginTop: -3 },
  mapScale: { position: 'absolute', bottom: 10, right: 11, alignItems: 'center' },
  mapScaleLine: { width: 27, height: 3, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#B7C3BD', borderTopWidth: 1 },
  mapScaleText: { color: '#B7C3BD', fontSize: 7, marginTop: 2 },
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
  powerCard: {
    backgroundColor: '#141416', borderWidth: 1, borderColor: '#342728',
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  powerLabel: { color: '#B7A2A1', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  powerValue: { color: '#FF716B', fontSize: 15, fontWeight: '900', marginTop: 7 },
  powerValueCaption: { color: '#AD9696', fontSize: 7, fontWeight: '800' },
  powerTrack: { height: 4, borderRadius: 3, backgroundColor: '#3A292B', marginTop: 9 },
  powerFill: { width: '14%', height: 4, borderRadius: 3, backgroundColor: '#FF716B' },
  metricsRow: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 10 },
  metricCard: {
    flex: 1, minHeight: 61, backgroundColor: '#11181D', borderWidth: 1, borderColor: '#202B31',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 11, marginHorizontal: 4,
  },
  metricLabel: { color: '#77838A', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  metricValue: { fontSize: 14, fontWeight: '800' },
  metricSuffix: { color: '#8B9695', fontSize: 7, fontWeight: '700' },
  cacheCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111A18',
    borderWidth: 1, borderColor: '#263B33', borderRadius: 13, padding: 11, marginBottom: 24,
  },
  cacheIcon: {
    width: 29, height: 29, borderRadius: 9, backgroundColor: '#1A352B',
    alignItems: 'center', justifyContent: 'center',
  },
  cacheIconText: { color: '#78D8AD', fontSize: 14, fontWeight: '800' },
  cacheCopy: { flex: 1, marginLeft: 9 },
  cacheTitle: { color: '#DCE7E1', fontSize: 10, fontWeight: '700' },
  cacheSubtitle: { color: '#85938A', fontSize: 8, marginTop: 4 },
  cacheAction: { paddingVertical: 7, paddingHorizontal: 9 },
  cacheActionText: { color: '#78D8AD', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
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
  shelterCardIconAlt: { backgroundColor: '#1C2E36' },
  shelterCardIconText: { color: '#7ADBB0', fontSize: 19, fontWeight: '700', lineHeight: 22 },
  shelterCardCopy: { flex: 1, marginLeft: 9 },
  shelterCardTitle: { color: '#DCE5E0', fontSize: 10, fontWeight: '800' },
  shelterCardSubtitle: { color: '#81908A', fontSize: 8, marginTop: 4 },
  shelterCardArrow: { color: '#81908A', fontSize: 21, paddingHorizontal: 5 },
  modePanel: {
    backgroundColor: '#10161B', borderWidth: 1, borderColor: '#222D33',
    borderRadius: 13, padding: 12, marginTop: 18,
  },
  modeHeading: { marginBottom: 10 },
  modeTitle: { color: '#8F9B9F', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  modeHint: { color: '#6F7A7D', fontSize: 8, marginTop: 4 },
  modeButtons: { flexDirection: 'row', backgroundColor: '#0B1014', borderRadius: 9, padding: 3 },
  modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7, minHeight: 32 },
  modeButtonActive: { backgroundColor: '#23352D' },
  modeButtonText: { color: '#74807F', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  modeButtonTextActive: { color: '#8BE0B7' },
  footer: { color: '#748078', textAlign: 'center', fontSize: 9, marginTop: 18, marginBottom: 10 },
  bottomBar: {
    height: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#0D1317', borderTopWidth: 1, borderTopColor: '#20292D',
  },
  bottomBarActive: { alignItems: 'center', minWidth: 72 },
  bottomBarActiveIcon: { color: '#79DDB0', fontSize: 18, lineHeight: 20 },
  bottomBarActiveLabel: { color: '#79DDB0', fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  bottomBarItem: { alignItems: 'center', minWidth: 72 },
  bottomBarIcon: { color: '#77827F', fontSize: 17, lineHeight: 20 },
  bottomBarLabel: { color: '#77827F', fontSize: 7, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
});