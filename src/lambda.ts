import FirebaseConfig from './types/config/firebase';
import getSecret from './helpers/fetchAWSSecret';
import connect from './database/mongoose';

const serverlessExpress = require('@vendia/serverless-express');
const admin = require('firebase-admin');
const app = require('./app');

let serverlessExpressInstance: any;
async function setup(event: any, context: any) {
  const DATABASE_CONFIG = await getSecret('DATABASE');
  process.env.DATABASE_CONFIG = DATABASE_CONFIG as string;

  const FIREBASE_CONFIG_RAW = await getSecret('FIREBASE');
  const FIREBASE_CONFIG: FirebaseConfig = JSON.parse(FIREBASE_CONFIG_RAW as string);

  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG.FIREBASE_SERVICE_ACCOUNT),
    databaseURL: FIREBASE_CONFIG.FIREBASE_DB_URL,
  });

  await connect();

  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}
const handler = (event: any, context: any) => {
  if (serverlessExpressInstance) return serverlessExpressInstance(event, context);
  return setup(event, context);
};

exports.handler = handler;
