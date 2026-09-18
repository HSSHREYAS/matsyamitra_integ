/**
 * MatsyaMitra — Coastal Decision Support System for Fishermen
 * Root Application Component
 */

import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/i18n';

// LogBox disabled to see redbox

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#F4F7FB"
          translucent={false}
        />
        <AppNavigator />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default App;
