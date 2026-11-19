import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'lol');
const CHAMP_DIR = path.join(OUT_DIR, 'champions');
const SPLASH_DIR = path.join(OUT_DIR, 'splashes');

const CHAMPIONS = [
  'Azir', 'Orianna', 'Ahri', 'Corki', 'Taliyah',
  'KSante', 'Rumble', 'Renekton', 'Jax', 'Gnar',
  'Vi', 'Sejuani', 'Maokai', 'LeeSin', 'XinZhao',
  'Varus', 'Kaisa', 'Jinx', 'Kalista', 'Xayah',
  'Nautilus', 'Rell', 'Alistar', 'Rakan', 'Renata',
  'Leona', 'Poppy', 'Skarner'
];

const SPLASHES = ['Azir', 'Orianna', 'KSante', 'Vi'];

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} downloading ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) {
    throw new Error(`Suspiciously small file (${buf.length} bytes) from ${url}`);
  }
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function main() {
  await fs.mkdir(CHAMP_DIR, { recursive: true });
  await fs.mkdir(SPLASH_DIR, { recursive: true });

  const versionsRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  if (!versionsRes.ok) throw new Error(`Failed to fetch versions.json: ${versionsRes.status}`);
  const versions = await versionsRes.json();
  const patch = versions[0];
  console.log(`Live Riot Data Dragon patch: ${patch}`);

  const manifest = {
    patch,
    fetchedAt: new Date().toISOString(),
    champions: {},
    splashes: {},
    map: null
  };

  // Download all 28 champion portraits in parallel batches
  for (const id of CHAMPIONS) {
    const url = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${id}.png`;
    const dest = path.join(CHAMP_DIR, `${id}.png`);
    const bytes = await downloadFile(url, dest);
    manifest.champions[id] = { file: `assets/lol/champions/${id}.png`, bytes };
  }
  console.log(`Downloaded ${CHAMPIONS.length} champion square portraits.`);

  // Download 4 hero splashes
  for (const id of SPLASHES) {
    const url = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg`;
    const dest = path.join(SPLASH_DIR, `${id}_0.jpg`);
    const bytes = await downloadFile(url, dest);
    manifest.splashes[id] = { file: `assets/lol/splashes/${id}_0.jpg`, bytes };
  }
  console.log(`Downloaded ${SPLASHES.length} hero splashes.`);

  // Download Summoner's Rift official minimap
  const mapUrl = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/map/map11.png`;
  const mapDest = path.join(OUT_DIR, 'map11.png');
  const mapBytes = await downloadFile(mapUrl, mapDest);
  manifest.map = { file: 'assets/lol/map11.png', bytes: mapBytes };
  console.log(`Downloaded Summoner's Rift map11.png (${mapBytes} bytes).`);

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Saved assets/lol/manifest.json successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
