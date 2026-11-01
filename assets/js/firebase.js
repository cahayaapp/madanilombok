import {minimartLocal, minimartEmulatorConfig} from './minimart-environment.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig } from "../../config/firebase-config.js";

const app = initializeApp(minimartLocal ? minimartEmulatorConfig : firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
if (minimartLocal) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {disableWarnings:true});
  connectDatabaseEmulator(db, "127.0.0.1", 9000);
}

setPersistence(auth, browserLocalPersistence).catch(console.error);

export { app, auth, db };
