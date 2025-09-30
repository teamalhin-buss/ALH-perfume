// Firebase App (the core Firebase SDK) is always required
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDQKyBnjtay0AB-XliyT0zOZgEqiG9IdY",
  authDomain: "alh-perfume.firebaseapp.com",
  databaseURL: "https://alh-perfume-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alh-perfume",
  storageBucket: "alh-perfume.firebasestorage.app",
  messagingSenderId: "311171449596",
  appId: "1:311171449596:web:79fe9c849edd41d1c48d79",
  measurementId: "G-0VCNB0FGGD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Firestore with persistence settings
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true
});

// Set auth persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence enabled');
  })
  .catch((error) => {
    console.error('Error enabling auth persistence:', error);
  });

// Export the auth and db objects
export { auth, db };
