import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
// import { Server } from 'socket.io';
// import apiRoutes from './web-server/apiRoutes'; // Assuming you have an apiRoutes file for your API endpoints

import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

import Translations from './src/translations/translations.js';

import { EventEmitter } from 'events';

/**
 * constants
 */
const Constants = {
  Languages: ['en', 'ro'],

  event: new EventEmitter(),
};

/**
 * util
 */
const Util = {
  /**
   * init env
   */
  initEnv: () => {
    const nodeEnv = process.env.NODE_ENV || 'dev';
    console.log(`\nCurrent env: ${nodeEnv}`);

    const envFile = path.resolve(__dirname, `./.${nodeEnv}.env`);
    if (fs.existsSync(envFile)) {
      // Do not override existing process.env values (avoid conflicts for NODE_ENV)
      const config = dotenv.config({ path: envFile, override: false });
      dotenvExpand.expand(config);
      return true;
    }
    return false;
  },

  /**
   * init language
   */
  initLanguages: () => {
    // init language
    for (const lang of Constants.Languages) {
      Translations.initStrings(lang, path.resolve(__dirname, `./src/translations/${lang}.json`));
    }
  },

  /**
   * init app
   */
  initApp: () => {
    console.log('\nInit app');

    const app = express();
    const server = createServer(app);
    // const io = new Server(server);

    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // API routes

    // app.use('/api', apiRoutes);

    // Serve static files from the Vue.js frontend
    app.use(express.static('dist'));

    // Handle any other routes (for Vue Router)
    // app.get('*', (req, res) => {
    //   res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    // });

    // // Socket.io setup (if needed)
    // io.on('connection', (socket) => {
    //   console.log('A user connected');
    //   // Handle socket events here
    // });

    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  },
};

/**
 * init
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

Util.initEnv();
Util.initLanguages();
Util.initApp();
