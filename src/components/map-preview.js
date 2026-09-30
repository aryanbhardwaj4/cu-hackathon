import React from 'react';
import { Text, View } from 'react-native';

export default function MapPreview() {
  return (
    <View style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text style={{ color: '#A9B3C2', fontSize: 12, textAlign: 'center' }}>
        Interactive OpenStreetMap is available in the web version.
      </Text>
    </View>
  );
}
