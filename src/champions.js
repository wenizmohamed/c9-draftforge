/**
 * Canonical 28-champion LCS / MSI pro meta catalog for C9 DraftForge.
 * All portraits are locally vendored from Riot Data Dragon patch 16.23.1.
 */

export const ROLES = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];

export const CHAMPIONS = [
  // MID
  {
    id: 'Azir',
    name: 'Azir',
    roles: ['MID'],
    damageType: 'AP',
    tags: ['Front-to-Back', 'Poke', 'Engage'],
    counters: ['Orianna', 'Taliyah', 'Corki'],
    synergies: ['Sejuani', 'Maokai', 'Rell', 'KSante'],
    tier: 'S',
    pickRate: 38.4,
    asset: 'assets/lol/champions/Azir.png'
  },
  {
    id: 'Orianna',
    name: 'Orianna',
    roles: ['MID'],
    damageType: 'AP',
    tags: ['Front-to-Back', 'Protect', 'Poke'],
    counters: ['Ahri', 'Taliyah'],
    synergies: ['Vi', 'LeeSin', 'XinZhao', 'Rakan', 'Jarvan'],
    tier: 'S',
    pickRate: 34.1,
    asset: 'assets/lol/champions/Orianna.png'
  },
  {
    id: 'Ahri',
    name: 'Ahri',
    roles: ['MID'],
    damageType: 'AP',
    tags: ['Pick', 'Engage'],
    counters: ['Corki', 'Jinx', 'Varus'],
    synergies: ['Vi', 'Sejuani', 'LeeSin', 'Nautilus'],
    tier: 'A',
    pickRate: 26.8,
    asset: 'assets/lol/champions/Ahri.png'
  },
  {
    id: 'Corki',
    name: 'Corki',
    roles: ['MID', 'BOT'],
    damageType: 'MIXED',
    tags: ['Poke', 'Front-to-Back'],
    counters: ['Orianna', 'Azir'],
    synergies: ['Maokai', 'Rumble', 'Skarner', 'Alistar'],
    tier: 'S',
    pickRate: 31.2,
    asset: 'assets/lol/champions/Corki.png'
  },
  {
    id: 'Taliyah',
    name: 'Taliyah',
    roles: ['MID', 'JGL'],
    damageType: 'AP',
    tags: ['Pick', 'Poke', 'Front-to-Back'],
    counters: ['Vi', 'Kalista', 'LeeSin', 'Rakan', 'KSante'],
    synergies: ['Renekton', 'Nautilus', 'Leona', 'Poppy'],
    tier: 'S',
    pickRate: 29.7,
    asset: 'assets/lol/champions/Taliyah.png'
  },

  // TOP
  {
    id: 'KSante',
    name: "K'Sante",
    roles: ['TOP'],
    damageType: 'AD',
    tags: ['Front-to-Back', 'Protect', 'Engage'],
    counters: ['Renekton', 'Gnar', 'Rumble'],
    synergies: ['Azir', 'Jinx', 'Varus', 'Orianna'],
    tier: 'S',
    pickRate: 41.0,
    asset: 'assets/lol/champions/KSante.png'
  },
  {
    id: 'Rumble',
    name: 'Rumble',
    roles: ['TOP'],
    damageType: 'AP',
    tags: ['Engage', 'Front-to-Back', 'Poke'],
    counters: ['Jax', 'Gnar', 'Renekton'],
    synergies: ['Skarner', 'Sejuani', 'Maokai', 'Corki', 'Varus'],
    tier: 'S',
    pickRate: 36.5,
    asset: 'assets/lol/champions/Rumble.png'
  },
  {
    id: 'Renekton',
    name: 'Renekton',
    roles: ['TOP'],
    damageType: 'AD',
    tags: ['Pick', 'Engage', 'Split'],
    counters: ['Jax', 'Gnar', 'KSante'],
    synergies: ['Taliyah', 'Sejuani', 'Maokai', 'Ahri'],
    tier: 'A',
    pickRate: 28.9,
    asset: 'assets/lol/champions/Renekton.png'
  },
  {
    id: 'Jax',
    name: 'Jax',
    roles: ['TOP'],
    damageType: 'MIXED',
    tags: ['Split', 'Engage'],
    counters: ['Gnar', 'KSante', 'Kalista'],
    synergies: ['Orianna', 'Ahri', 'Rakan', 'Maokai'],
    tier: 'A',
    pickRate: 22.4,
    asset: 'assets/lol/champions/Jax.png'
  },
  {
    id: 'Gnar',
    name: 'Gnar',
    roles: ['TOP'],
    damageType: 'AD',
    tags: ['Split', 'Engage', 'Front-to-Back'],
    counters: ['KSante', 'Rumble'],
    synergies: ['Orianna', 'Azir', 'Sejuani', 'Jinx'],
    tier: 'A',
    pickRate: 25.1,
    asset: 'assets/lol/champions/Gnar.png'
  },

  // JUNGLE
  {
    id: 'Vi',
    name: 'Vi',
    roles: ['JGL'],
    damageType: 'AD',
    tags: ['Pick', 'Engage'],
    counters: ['Jinx', 'Varus', 'Corki', 'Ahri'],
    synergies: ['Ahri', 'Orianna', 'Kaisa', 'Rakan'],
    tier: 'S',
    pickRate: 37.8,
    asset: 'assets/lol/champions/Vi.png'
  },
  {
    id: 'Sejuani',
    name: 'Sejuani',
    roles: ['JGL'],
    damageType: 'AP',
    tags: ['Engage', 'Front-to-Back'],
    counters: ['LeeSin', 'XinZhao'],
    synergies: ['Renekton', 'Jax', 'KSante', 'Azir', 'Jinx'],
    tier: 'S',
    pickRate: 33.0,
    asset: 'assets/lol/champions/Sejuani.png'
  },
  {
    id: 'Maokai',
    name: 'Maokai',
    roles: ['JGL', 'SUP'],
    damageType: 'AP',
    tags: ['Engage', 'Poke', 'Front-to-Back'],
    counters: ['LeeSin', 'XinZhao', 'Kaisa'],
    synergies: ['Varus', 'Corki', 'Rumble', 'Azir'],
    tier: 'S',
    pickRate: 30.6,
    asset: 'assets/lol/champions/Maokai.png'
  },
  {
    id: 'LeeSin',
    name: 'Lee Sin',
    roles: ['JGL'],
    damageType: 'AD',
    tags: ['Pick', 'Engage'],
    counters: ['Maokai', 'Sejuani', 'Jinx'],
    synergies: ['Orianna', 'Ahri', 'Rumble', 'Rakan'],
    tier: 'A',
    pickRate: 24.3,
    asset: 'assets/lol/champions/LeeSin.png'
  },
  {
    id: 'XinZhao',
    name: 'Xin Zhao',
    roles: ['JGL'],
    damageType: 'AD',
    tags: ['Engage', 'Front-to-Back'],
    counters: ['Vi', 'Varus', 'Corki'],
    synergies: ['Orianna', 'Azir', 'Rell', 'Alistar'],
    tier: 'A',
    pickRate: 27.5,
    asset: 'assets/lol/champions/XinZhao.png'
  },
  {
    id: 'Skarner',
    name: 'Skarner',
    roles: ['JGL', 'TOP'],
    damageType: 'AD',
    tags: ['Engage', 'Front-to-Back', 'Pick'],
    counters: ['Kaisa', 'Kalista', 'XinZhao'],
    synergies: ['Rumble', 'Azir', 'Orianna', 'Jinx', 'Varus'],
    tier: 'S',
    pickRate: 40.2,
    asset: 'assets/lol/champions/Skarner.png'
  },
  {
    id: 'Poppy',
    name: 'Poppy',
    roles: ['JGL', 'SUP', 'TOP'],
    damageType: 'AD',
    tags: ['Protect', 'Pick', 'Engage'],
    counters: ['Vi', 'LeeSin', 'Rakan', 'Rell', 'Kalista', 'KSante'],
    synergies: ['Jinx', 'Varus', 'Taliyah', 'Azir'],
    tier: 'A',
    pickRate: 21.8,
    asset: 'assets/lol/champions/Poppy.png'
  },

  // BOT
  {
    id: 'Varus',
    name: 'Varus',
    roles: ['BOT'],
    damageType: 'AD',
    tags: ['Poke', 'Pick', 'Front-to-Back'],
    counters: ['Kalista', 'Kaisa', 'Xayah'],
    synergies: ['Renata', 'Nautilus', 'Maokai', 'Rumble', 'Skarner'],
    tier: 'S',
    pickRate: 39.4,
    asset: 'assets/lol/champions/Varus.png'
  },
  {
    id: 'Kaisa',
    name: "Kai'Sa",
    roles: ['BOT'],
    damageType: 'MIXED',
    tags: ['Pick', 'Engage'],
    counters: ['Jinx', 'Varus'],
    synergies: ['Nautilus', 'Rell', 'Rakan', 'Vi', 'Alistar'],
    tier: 'S',
    pickRate: 35.2,
    asset: 'assets/lol/champions/Kaisa.png'
  },
  {
    id: 'Jinx',
    name: 'Jinx',
    roles: ['BOT'],
    damageType: 'AD',
    tags: ['Front-to-Back'],
    counters: ['Xayah', 'Corki'],
    synergies: ['Renata', 'Poppy', 'KSante', 'Sejuani', 'Skarner'],
    tier: 'A',
    pickRate: 24.9,
    asset: 'assets/lol/champions/Jinx.png'
  },
  {
    id: 'Kalista',
    name: 'Kalista',
    roles: ['BOT'],
    damageType: 'AD',
    tags: ['Engage', 'Pick'],
    counters: ['Kaisa', 'Jinx'],
    synergies: ['Renata', 'Nautilus', 'Rell', 'Alistar', 'Leona'],
    tier: 'S',
    pickRate: 33.7,
    asset: 'assets/lol/champions/Kalista.png'
  },
  {
    id: 'Xayah',
    name: 'Xayah',
    roles: ['BOT'],
    damageType: 'AD',
    tags: ['Front-to-Back', 'Protect'],
    counters: ['Vi', 'Kaisa', 'LeeSin', 'Alistar'],
    synergies: ['Rakan', 'Nautilus', 'Sejuani', 'Azir'],
    tier: 'A',
    pickRate: 23.6,
    asset: 'assets/lol/champions/Xayah.png'
  },

  // SUPPORT
  {
    id: 'Nautilus',
    name: 'Nautilus',
    roles: ['SUP'],
    damageType: 'AP',
    tags: ['Engage', 'Pick'],
    counters: ['Renata', 'Jinx', 'Varus'],
    synergies: ['Kaisa', 'Kalista', 'Taliyah', 'Ahri'],
    tier: 'S',
    pickRate: 36.1,
    asset: 'assets/lol/champions/Nautilus.png'
  },
  {
    id: 'Rell',
    name: 'Rell',
    roles: ['SUP'],
    damageType: 'AP',
    tags: ['Engage', 'Front-to-Back'],
    counters: ['Leona', 'Nautilus', 'Varus'],
    synergies: ['Kaisa', 'Kalista', 'Rumble', 'Azir', 'Orianna'],
    tier: 'S',
    pickRate: 34.8,
    asset: 'assets/lol/champions/Rell.png'
  },
  {
    id: 'Alistar',
    name: 'Alistar',
    roles: ['SUP'],
    damageType: 'AP',
    tags: ['Engage', 'Protect'],
    counters: ['Leona', 'Nautilus', 'Rell', 'Vi'],
    synergies: ['Kalista', 'Kaisa', 'Corki', 'XinZhao'],
    tier: 'A',
    pickRate: 27.9,
    asset: 'assets/lol/champions/Alistar.png'
  },
  {
    id: 'Rakan',
    name: 'Rakan',
    roles: ['SUP'],
    damageType: 'AP',
    tags: ['Engage', 'Pick', 'Protect'],
    counters: ['Varus', 'Jinx', 'Orianna'],
    synergies: ['Xayah', 'Kaisa', 'Vi', 'Orianna', 'Ahri'],
    tier: 'S',
    pickRate: 32.5,
    asset: 'assets/lol/champions/Rakan.png'
  },
  {
    id: 'Renata',
    name: 'Renata Glasc',
    roles: ['SUP'],
    damageType: 'AP',
    tags: ['Protect', 'Front-to-Back'],
    counters: ['Rell', 'Alistar', 'Rakan', 'Vi', 'XinZhao'],
    synergies: ['Kalista', 'Varus', 'Jinx', 'Azir'],
    tier: 'S',
    pickRate: 30.4,
    asset: 'assets/lol/champions/Renata.png'
  },
  {
    id: 'Leona',
    name: 'Leona',
    roles: ['SUP'],
    damageType: 'AP',
    tags: ['Engage', 'Pick'],
    counters: ['Varus', 'Jinx', 'Corki'],
    synergies: ['Kalista', 'Kaisa', 'Taliyah', 'Rumble'],
    tier: 'A',
    pickRate: 26.2,
    asset: 'assets/lol/champions/Leona.png'
  }
];

export const CHAMPION_BY_ID = Object.fromEntries(CHAMPIONS.map((c) => [c.id, c]));

export function getChampion(id) {
  return CHAMPION_BY_ID[id] || null;
}

export function getChampionsByRole(role) {
  if (!role || role === 'ALL') return CHAMPIONS;
  return CHAMPIONS.filter((c) => c.roles.includes(role));
}
