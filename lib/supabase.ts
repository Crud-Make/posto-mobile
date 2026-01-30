import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        if (Platform.OS === 'web') {
            return Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null);
        }
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
            return;
        }
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
            return;
        }
        SecureStore.deleteItemAsync(key);
    },
};

const supabaseUrl = 'https://kilndogpsffkgkealkaq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
