import mongoose from 'mongoose';

let conn: Promise<any> | null = null;

const connect = async () => {
  if (conn == null) {
    const DATABASE_CONFIG = JSON.parse(process.env.DATABASE_CONFIG as string);
    mongoose.set('debug', process.env.IsProduction === 'false'); // config.json.IS_PRODUCTION
    mongoose.connection
      .on('error', (error: any) => console.log(error))
      .on('close', () => console.log('Database connection closed'))
      .once('open', () => {
        const info = mongoose.connections[0];
        console.log(`Connection to ${info.host}:${info.port}/${info.name}`);
      });

    mongoose.connect(DATABASE_CONFIG.MONGO_URL).then(() => console.log('Database connection established'));
    conn = mongoose
      .connect(DATABASE_CONFIG.MONGO_URL, {
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => mongoose);
    await conn;
  }
  return conn;
};
export default connect;
