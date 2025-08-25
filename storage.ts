import AsyncStorage from '@react-native-async-storage/async-storage';
import Storage from 'react-native-storage';

// Create a storage instance with recommended settings
const storage = new Storage({
  // Maximum capacity, default is 1000 key-ids
  size: 1000,

  // Use AsyncStorage for React Native apps
  storageBackend: AsyncStorage,

  // Default expiration: 1 day (in milliseconds)
  defaultExpires: 1000 * 3600 * 24,

  // Enable in-memory cache
  enableCache: true,

  // Optional: define sync methods if you want to sync data when not found/expired
  sync: {
    // Example: sync methods can be added here if needed
  },
});

export default storage;