import FirebaseConfig from './src/types/config/firebase';
import getSecret from './src/helpers/fetchAWSSecret';
import connect from './src/database/mongoose';

// eslint-disable-next-line import/no-extraneous-dependencies
const notifier = require('node-notifier');
const admin = require('firebase-admin');
const app = require('./src/app');

const port = 4000;

const bootstrap = async () => {
  const DATABASE_CONFIG = await getSecret('DATABASE');
  process.env.DATABASE_CONFIG = DATABASE_CONFIG as string;

  const FIREBASE_CONFIG_RAW = await getSecret('FIREBASE');
  const FIREBASE_CONFIG: FirebaseConfig = JSON.parse(FIREBASE_CONFIG_RAW as string);

  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG.FIREBASE_SERVICE_ACCOUNT),
    databaseURL: FIREBASE_CONFIG.FIREBASE_DB_URL,
  });

  await connect();
};
bootstrap().then(() => {
  app.listen(port, () => {
    console.log(`Local server running on ${port}`);
    notifier.notify({
      title: 'Server Running',
      message: `Local server running on ${port}`,
    });
  });
});
