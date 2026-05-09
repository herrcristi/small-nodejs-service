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

import { EventEmitter } from 'events';

/**
 * constants
 */
const Constants = {
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
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    console.log(`\nCurrent env: ${process.env.NODE_ENV}`);

    const expectedValues = [
      // api
      'VUE_APP_SMALL_API_URL',
      'VUE_APP_SMALL_API_CORS_ORIGIN',
    ];

    for (const val of expectedValues) {
      if (!process.env[val]) {
        console.log(`Env var ${val} is not set`);
        return false;
      }
    }

    return true;
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
    app.use(express.static(path.resolve(__dirname, 'dist')));

    // Handle any other routes (for Vue Router)
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });

    // // Socket.io setup (if needed)
    // io.on('connection', (socket) => {
    //   console.log('A user connected');
    //   // Handle socket events here
    // });

    // Start the server
    const PORT = process.env.SMALL_UI_PORT;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  },
};

/**
 * init
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!Util.initEnv()) {
  console.log('\nFailed to init app due to bad env vars');
  process.exit(1);
}
// Util.initApp();
