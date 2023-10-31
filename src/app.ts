/**
 * Edugram API
 * @description serves Edugram frontend,backend
 * @uses express,mongo,aws
 * @version 1.0
 * @copyright Edugram Inc. - 2023
 * @author Sarath "Delta" Singh | jrsarath.github.io
 * @author Coder Zenyk
 */
import express, { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import ErrorHandler from '@middlewares/errorHandler';
import BodyParser from '@middlewares/bodyParser';
import routes from '@routes/index';
import limiter from '@middlewares/rateLimiter';
// Express
const app: Express = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(BodyParser);
app.use(cors());
// app.use(limiter);

// //FOR SESSIONS
// const session = expressSession({
//   secret: config.json.SESSION_SECRET,
//   resave: true,
//   saveUninitialized: false,
//   store: new MongoStore({ mongooseConnection: mongoose.connection }),
// });
// app.use(session);

app.use(routes);
app.use(ErrorHandler);

module.exports = app;
