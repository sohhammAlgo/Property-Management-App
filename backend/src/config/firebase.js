const admin = require('firebase-admin');

//Initialize Firebase Admin SDK with service account credentials from environment variables
const initFirebase = () => {
    try {
        if (admin.apps.length > 0) return admin;

        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        console.log('Firebase Admin initialized');
        return admin;
    }
    catch (err) {
        console.error('Firebase initialization error:', err.message);
        throw err;
    }
};

//Function to verify Firebase ID token and return decoded token data
const verifyFirebaseToken = async (idToken) => {
    const firebaseAdmin = initFirebase();
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
};

//Function to get Firebase user details by UID
const getFirebaseUser = async (uid) => {
    const firebaseAdmin = initFirebase();
    return await firebaseAdmin.auth().getUser(uid);
};

//Function to send a push notification to a single device using Firebase Cloud Messaging
const sendPushNotification = async (token, notification, data = {}) => {
    const firebaseAdmin = initFirebase();
    const message = {
        notification,
        data,
        token,
    };
    return await firebaseAdmin.messaging().send(message);
};

//Function to send a multicast notification to multiple devices using Firebase Cloud Messaging
const sendMulticastNotification = async (tokens, notification, data = {}) => {
    if (!tokens || tokens.length === 0) return;
    const firebaseAdmin = initFirebase();
    const message = {
        notification,
        data,
        tokens,
    };
    return await firebaseAdmin.messaging().sendEachForMulticast(message);
};

module.exports = {
    initFirebase,
    verifyFirebaseToken,
    getFirebaseUser,
    sendPushNotification,
    sendMulticastNotification,
};