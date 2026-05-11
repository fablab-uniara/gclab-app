// Arquivo: src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// COLE AS SUAS CHAVES AQUI DENTRO (Apague estas de exemplo)
const firebaseConfig = {
  apiKey: "AIzaSyCgk7eac29L3GldvxoajwNWUumMSG1Mdr8",
  authDomain: "gclab-uniara.firebaseapp.com",
  projectId: "gclab-uniara",
  storageBucket: "gclab-uniara.firebasestorage.app",
  messagingSenderId: "183104783900",
  appId: "1:183104783900:web:0123dc59a05967831e01d9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);