import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { config, ROOT_DIR, isProduction } from './config/index.js';
import { router as apiRouter } from './routes/index.js';
import { errorHandler, notFound } from './middleware/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://fonts.googleapis.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://www.google.com'],
          connectSrc: ["'self'"],
          frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
      hsts: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.cors.origins.includes(origin) || !isProduction) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      credentials: false,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  if (!isProduction) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  app.use(
    '/assets',
    express.static(path.join(PUBLIC_DIR, 'assets'), {
      maxAge: isProduction ? '30d' : 0,
      etag: true,
    })
  );

  app.use('/api', apiRouter);

  app.get(['/admin', '/admin.html'], (req, res) => {
    return res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export { __dirname };
