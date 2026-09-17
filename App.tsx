/**
 * MatsyaMitra — Coastal Decision Support System for Fishermen
 * Root Application Component
 */

import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/i18n';

LogBox.ignoreAllLogs();

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0A1628"
          translucent={false}
        />
        <AppNavigator />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default App;
