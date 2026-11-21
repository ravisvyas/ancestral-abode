#!/usr/bin/env node
/**
 * Production Build & Packaging Script
 *
 * Prepares the production bundle in dist/production and archives it
 * into dist/ancestral-abode-deploy.tar.gz and dist/ancestral-abode-deploy.zip.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT_DIR } from '../src/config/index.js';

const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PROD_DIR = path.join(DIST_DIR, 'production');

async function rimraf(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('🏛️  Ancestral Abode — Building Production Distribution...\n');

  // 1. Run tests & lint to ensure production quality
  console.log('Step 1/4: Running linter & automated test suite...');
  try {
    execSync('npm run lint', { stdio: 'inherit', cwd: ROOT_DIR });
    execSync('npm test', { stdio: 'inherit', cwd: ROOT_DIR });
    console.log('✅ Linter and test suite passed successfully.\n');
  } catch {
    console.error('❌ Build aborted: Tests or linting failed.');
    process.exit(1);
  }

  // 2. Prepare clean output directory
  console.log('Step 2/4: Preparing output directories in dist/...');
  await rimraf(DIST_DIR);
  await fs.mkdir(PROD_DIR, { recursive: true });

  // 3. Copy runtime code and assets
  console.log('Step 3/4: Assembling production runtime files...');

  // Copy files
  const filesToCopy = [
    'package.json',
    'package-lock.json',
    'server.js',
    'schema.sql',
    'seed.sql',
    '.env.example',
    'ecosystem.config.cjs',
    'Dockerfile',
    'docker-compose.yml',
    'DEPLOYMENT.md',
  ];

  for (const file of filesToCopy) {
    const src = path.join(ROOT_DIR, file);
    try {
      await fs.copyFile(src, path.join(PROD_DIR, file));
    } catch {
      // Optional files might not exist yet
    }
  }

  // Copy directories
  await copyDir(path.join(ROOT_DIR, 'src'), path.join(PROD_DIR, 'src'));
  await copyDir(path.join(ROOT_DIR, 'public'), path.join(PROD_DIR, 'public'));

  // Copy DB setup script
  await fs.mkdir(path.join(PROD_DIR, 'scripts'), { recursive: true });
  await fs.copyFile(
    path.join(ROOT_DIR, 'scripts', 'setup-db.js'),
    path.join(PROD_DIR, 'scripts', 'setup-db.js')
  );

  // Create empty logs folder
  await fs.mkdir(path.join(PROD_DIR, 'logs'), { recursive: true });
  await fs.writeFile(path.join(PROD_DIR, 'logs', '.gitkeep'), '');

  console.log('✅ Runtime files assembled in dist/production/\n');

  // 4. Create deploy archives
  console.log('Step 4/4: Generating deployment archives...');
  try {
    // Generate tar.gz
    execSync(`tar -czf "${path.join(DIST_DIR, 'ancestral-abode-deploy.tar.gz')}" -C "${DIST_DIR}" production`, {
      stdio: 'inherit',
    });

    // Generate zip
    execSync(`cd "${DIST_DIR}" && zip -rq "ancestral-abode-deploy.zip" production`, {
      stdio: 'inherit',
    });

    const tarStat = await fs.stat(path.join(DIST_DIR, 'ancestral-abode-deploy.tar.gz'));
    const zipStat = await fs.stat(path.join(DIST_DIR, 'ancestral-abode-deploy.zip'));

    console.log(`\n🎉 Production Build Complete!`);
    console.log(`-----------------------------------------------------------------`);
    console.log(`📦 Unpacked App:   ${PROD_DIR}`);
    console.log(`📦 Tar Archive:    dist/ancestral-abode-deploy.tar.gz (${(tarStat.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`📦 Zip Archive:    dist/ancestral-abode-deploy.zip (${(zipStat.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`-----------------------------------------------------------------`);
    console.log(`\nTo deploy on your server:`);
    console.log(`  1. Upload "dist/ancestral-abode-deploy.zip" or the "dist/production" folder to your server.`);
    console.log(`  2. Run: npm ci --omit=dev`);
    console.log(`  3. Copy .env.example to .env and configure your MySQL credentials.`);
    console.log(`  4. Run: npm run db:setup`);
    console.log(`  5. Start the server: pm2 start ecosystem.config.cjs --env production (or npm start)`);
    console.log(`\nSee DEPLOYMENT.md for detailed Nginx, PM2, Docker, and cPanel setup instructions.`);
  } catch (err) {
    console.warn('⚠️  Could not generate zip/tar archive (zip/tar command might not be installed), but dist/production is ready:', err.message);
  }
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
