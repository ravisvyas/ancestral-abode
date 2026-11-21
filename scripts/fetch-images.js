#!/usr/bin/env node
/**
 * Downloads freely-licensed heritage photography from Wikimedia Commons into
 * public/assets/images and records the required attribution for each file.
 *
 *   node scripts/fetch-images.js
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT_DIR } from '../src/config/index.js';

const execFileAsync = promisify(execFile);
const API = 'https://commons.wikimedia.org/w/api.php';
const IMAGES_DIR = path.join(ROOT_DIR, 'public', 'assets', 'images');
const CREDITS_PATH = path.join(IMAGES_DIR, 'CREDITS.md');
const FORCE = process.argv.includes('--force');
const REQUEST_DELAY = 1100;

/**
 * Each entry: output file -> candidate search queries, most specific first.
 * Queries are run against Commons file namespace (ns=6).
 */
const ASSETS = [
  { file: 'hero-1.jpg', queries: ['Amber Fort baradari interior', 'Jal Mahal interior palace', 'Mubarak Mahal interior'] },
  { file: 'hero-2.jpg', queries: ['Haveli courtyard Jaipur', 'Jaipur haveli courtyard pillars', 'Rajasthan courtyard haveli'] },
  { file: 'hero-3.jpg', queries: ['Palace bedroom Rajasthan', 'Hotel suite Rajasthan interior bed', 'Haveli bedroom interior'] },
  { file: 'about-heritage.jpg', queries: ['Haveli facade Jaipur carved', 'Jharokha Jaipur haveli', 'Rajasthan haveli architecture facade'] },
  { file: 'room-chhatri.jpg', queries: ['Rajput palace bedroom interior', 'Chhatri dome Jaipur', 'Jaswant Thada interior'] },
  { file: 'room-chhatri-2.jpg', queries: ['Jaswant Thada bedroom', 'Albert Hall museum interior', 'Rajput palace room interior'] },
  { file: 'room-courtyard.jpg', queries: ['Haveli room interior Rajasthan jharokha', 'Jaipur room traditional interior', 'Man Haron ka Rasta interior'] },
  { file: 'room-courtyard-2.jpg', queries: ['Haveli sitting room Jaipur', 'Rajasthan sitting room antique', 'Heritage hotel room interior India'] },
  { file: 'room-empress.jpg', queries: ['City Palace Jaipur interior', 'Royal bedroom palace Rajasthan', 'Maharaja palace bedroom'] },
  { file: 'room-empress-2.jpg', queries: ['Chandra Mahal interior', 'Palace dining room Rajasthan', 'Mubarak Mahal room'] },
  { file: 'room-studio.jpg', queries: ['Jantar Mantar Jaipur', 'Haveli library room', 'Heritage room desk window India'] },
  { file: 'room-studio-2.jpg', queries: ['Sheesh Mahal interior', 'Mirrored palace interior', 'Rajasthan library interior'] },
  { file: 'room-zen.jpg', queries: ['Stepwell Panna Meena Kund', 'Baoli stepwell Rajasthan', 'Chand Baori stepwell'] },
  { file: 'room-zen-2.jpg', queries: ['Courtyard garden haveli Jaipur', 'Rajasthan courtyard garden water', 'Jal Mahal courtyard'] },
  { file: 'exp-pottery.jpg', queries: ['Blue pottery Jaipur', 'Jaipur ceramic pottery workshop', 'Blue pottery of Jaipur handicraft'] },
  { file: 'exp-cooking.jpg', queries: ['Rajasthani thali food', 'Indian cooking spices Rajasthan', 'Rajasthani cuisine dal baati'] },
  { file: 'exp-chai.jpg', queries: ['Masala chai India', 'Rooftop restaurant Jaipur sunset', 'Indian tea cup'] },
  { file: 'sight-amber.jpg', queries: ['Amber Fort Jaipur exterior', 'Amer Fort Rajasthan panorama', 'Amber Fort main gate'] },
  { file: 'sight-stepwell.jpg', queries: ['Panna Meena Kund Jaipur', 'Panna Meena Kund stepwell', 'Stepwell Jaipur Badi Chaupar'] },
  { file: 'sight-hawa.jpg', queries: ['Hawa Mahal Jaipur', 'Hawa Mahal facade', 'Hawa Mahal palace of winds'] },
  { file: 'sight-bazaar.jpg', queries: ['Johari Bazaar Jaipur', 'Jaipur bazaar market', 'Tripolia Bazaar Jaipur'] },
  { file: 'post-stepwell.jpg', queries: ['Stepwell restoration', 'Baoli stepwell interior', 'Stepwell stairs stone'] },
  { file: 'post-teej.jpg', queries: ['Teej festival India celebration', 'Rajasthan festival women colourful', 'Holi festival Rajasthan'] },
  { file: 'post-blue.jpg', queries: ['Jaipur blue pottery craftsperson', 'Kishangarh pottery', 'Potter working wheel India'] },
  { file: 'footer-map.jpg', queries: ['Old Jaipur aerial street', 'Jaipur city rooftops', 'Jaipur street architecture'] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HEADERS = { 'User-Agent': 'AncestralAbode/1.0 (local build script; contact: dev@localhost)' };

/** Commons throttles aggressive clients; back off and retry on 429/5xx. */
async function politeFetch(url, { attempts = 6 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(2000 * attempt + Math.random() * 1500, 20000);
      console.warn(`    … ${res.status}, retrying in ${Math.round(wait)}ms`);
      await sleep(wait);
      continue;
    }
    throw new Error(`request failed: ${res.status}`);
  }
  throw new Error('request failed after retries');
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function search(query) {
  const url = `${API}?${new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1920',
    format: 'json',
    origin: '*',
  })}`;

  const res = await politeFetch(url);
  const json = await res.json();
  const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
  return pages
    .filter((p) => p.imageinfo?.length)
    .map((p) => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata || {};
      return {
        title: p.title,
        index: p.index ?? 99,
        width: info.width,
        height: info.height,
        url: info.thumburl || info.url,
        artist: stripHtml(meta.Artist?.value || ''),
        license: meta.LicenseShortName?.value || 'CC',
        licenseUrl: meta.LicenseUrl?.value || '',
        descriptionUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      };
    })
    .filter((c) => c.width >= 1200 && c.url)
    .sort((a, b) => a.index - b.index);
}

/** Prefer landscape images near a 16:10 ratio — they compose best as cards. */
function score(candidate) {
  const ratio = candidate.width / candidate.height;
  const ratioScore = ratio >= 1.3 && ratio <= 2.3 ? 0 : Math.min(Math.abs(ratio - 1.6) * 3, 10);
  const resolutionScore = candidate.width >= 2400 ? 0 : candidate.width >= 1600 ? 1 : 3;
  return ratioScore + resolutionScore + candidate.index * 0.08;
}

async function download(url, destination) {
  const res = await politeFetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destination, buffer);
  return buffer.length;
}

/** Normalise to a 1600px-wide progressive JPEG using macOS `sips`. */
async function optimise(destination) {
  try {
    await execFileAsync('sips', [
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', '72',
      '-Z', '1600',
      destination,
      '--out', destination,
    ]);
  } catch {
    /* sips is a convenience; the original download is already usable */
  }
}

async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  // Keep attribution for images already on disk so resumed runs stay complete.
  const creditsByFile = new Map();
  if (existsSync(CREDITS_PATH)) {
    const existing = await fs.readFile(CREDITS_PATH, 'utf8');
    for (const block of existing.split(/^### /m).slice(1)) {
      const name = block.split('\n')[0].trim();
      if (name) creditsByFile.set(name, block.trim());
    }
  }

  const manifest = [];

  for (const asset of ASSETS) {
    const destination = path.join(IMAGES_DIR, asset.file);
    let placed = false;

    // Resume support: an already-downloaded file is kept unless --force.
    if (!FORCE && existsSync(destination)) {
      const { size } = await fs.stat(destination);
      if (size > 20480) {
        manifest.push({ file: asset.file, bytes: size });
        console.log(`· ${asset.file} — already present, skipping`);
        await sleep(REQUEST_DELAY);
        continue;
      }
    }

    for (const query of asset.queries) {
      if (placed) break;
      try {
        const candidates = await search(query);
        if (!candidates.length) {
          await sleep(REQUEST_DELAY);
          continue;
        }
        const best = candidates.sort((a, b) => score(a) - score(b))[0];
        await download(best.url, destination);
        await optimise(destination);
        const { size } = await fs.stat(destination);
        manifest.push({ file: asset.file, bytes: size });
        creditsByFile.set(
          asset.file,
          [
            `### ${asset.file}`,
            `- Source: ${best.title.replace(/^File:/, '')}`,
            `- Author: ${best.artist || 'Unknown'}`,
            `- Licence: ${best.license}${best.licenseUrl ? ` — ${best.licenseUrl}` : ''}`,
            `- Page: ${best.descriptionUrl}`,
          ].join('\n')
        );
        console.log(`✓ ${asset.file} ← ${best.title.replace(/^File:/, '').slice(0, 70)}`);
        placed = true;
      } catch (error) {
        console.warn(`  ! ${asset.file} via "${query}": ${error.message}`);
      }
      await sleep(REQUEST_DELAY);
    }

    if (!placed) console.warn(`✗ ${asset.file} — no candidate found`);
  }

  const credits = [
    '# Image Credits',
    '',
    'All photography is sourced from Wikimedia Commons under the licence noted for each file.',
    'Attribution is required by several of these licences and is reproduced below.',
    '',
  ];
  for (const asset of ASSETS) {
    const entry = creditsByFile.get(asset.file);
    if (entry) credits.push(entry, '');
  }

  await fs.writeFile(CREDITS_PATH, credits.join('\n'), 'utf8');
  await fs.writeFile(
    path.join(IMAGES_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  console.log(`\n${manifest.length}/${ASSETS.length} images ready in public/assets/images`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
