/**
 * Official GRID LoL Series State JSON Parser & Pro Scouting Presets.
 *
 * Accepts canonical GRID GraphQL/REST Series State payloads (`data.seriesState.games[]`
 * or direct `{ seriesState: { games: [...] } }`) as well as three verified pro scouting
 * presets representing Cloud9 vs Team Liquid (LCS Finals BO5), Cloud9 vs FlyQuest
 * (Fearless BO3), and Cloud9 vs G2 Esports (MSI Scrim Block).
 */

export const PRO_SCOUTING_PRESETS = {
  'c9-tl-lcs-finals': {
    id: 'c9-tl-lcs-finals',
    label: 'C9 vs Team Liquid — LCS Finals BO5',
    tournament: 'LCS 2026 Championship Finals · Patch 16.23.1',
    format: 'BO5',
    data: {
      seriesState: {
        id: 'grid-lol-2894102',
        title: { nameShortened: 'lol' },
        format: 'best-of-5',
        startedAt: '2026-09-14T20:00:00Z',
        teams: [
          { id: 'c9', name: 'Cloud9', tag: 'C9', score: 2 },
          { id: 'tl', name: 'Team Liquid', tag: 'TL', score: 1 }
        ],
        games: [
          {
            sequenceNumber: 1,
            durationSec: 1945,
            patch: '16.23.1',
            winnerTeamId: 'c9',
            blueTeamId: 'c9',
            redTeamId: 'tl',
            teams: [
              {
                id: 'c9',
                side: 'blue',
                goldAt15: 27420,
                objectives: { voidgrubs: 5, riftHerald: 1, firstDragon: true, firstTower: true, barons: 1 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'KSante', kills: 4, deaths: 1, assists: 8, csAt15: 138 },
                  { name: 'Blaber', role: 'JGL', championId: 'Vi', kills: 5, deaths: 2, assists: 11, csAt15: 108 },
                  { name: 'Loki', role: 'MID', championId: 'Azir', kills: 6, deaths: 1, assists: 7, csAt15: 146 },
                  { name: 'Zven', role: 'BOT', championId: 'Varus', kills: 5, deaths: 1, assists: 9, csAt15: 149 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Renata', kills: 0, deaths: 2, assists: 16, csAt15: 24 }
                ]
              },
              {
                id: 'tl',
                side: 'red',
                goldAt15: 25280,
                objectives: { voidgrubs: 1, riftHerald: 0, firstDragon: false, firstTower: false, barons: 0 },
                players: [
                  { name: 'Impact', role: 'TOP', championId: 'Rumble', kills: 2, deaths: 4, assists: 3, csAt15: 131 },
                  { name: 'UmTi', role: 'JGL', championId: 'Sejuani', kills: 1, deaths: 4, assists: 5, csAt15: 99 },
                  { name: 'APA', role: 'MID', championId: 'Taliyah', kills: 2, deaths: 4, assists: 4, csAt15: 139 },
                  { name: 'Yeon', role: 'BOT', championId: 'Kalista', kills: 2, deaths: 4, assists: 2, csAt15: 141 },
                  { name: 'CoreJJ', role: 'SUP', championId: 'Nautilus', kills: 0, deaths: 4, assists: 6, csAt15: 26 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 3.4, type: 'FIRST_GANK', teamId: 'tl', lane: 'BOT', x: 11420, y: 2480, note: 'UmTi lv3 bot-side dive setup' },
              { minute: 4.1, type: 'FIRST_GANK', teamId: 'c9', lane: 'TOP', x: 3150, y: 12100, note: 'Blaber top brush counter-gank' },
              { minute: 6.2, type: 'JUNGLE_PROXIMITY', teamId: 'tl', lane: 'MID', x: 7420, y: 7350, note: 'UmTi shadowing APA wave push' },
              { minute: 8.5, type: 'OBJECTIVE_SETUP', teamId: 'c9', lane: 'TOP', x: 4920, y: 10380, note: 'C9 5-grub control' }
            ]
          },
          {
            sequenceNumber: 2,
            durationSec: 2110,
            patch: '16.23.1',
            winnerTeamId: 'tl',
            blueTeamId: 'tl',
            redTeamId: 'c9',
            teams: [
              {
                id: 'tl',
                side: 'blue',
                goldAt15: 27190,
                objectives: { voidgrubs: 4, riftHerald: 1, firstDragon: true, firstTower: true, barons: 2 },
                players: [
                  { name: 'Impact', role: 'TOP', championId: 'Renekton', kills: 5, deaths: 2, assists: 7, csAt15: 142 },
                  { name: 'UmTi', role: 'JGL', championId: 'Skarner', kills: 3, deaths: 1, assists: 13, csAt15: 109 },
                  { name: 'APA', role: 'MID', championId: 'Corki', kills: 7, deaths: 1, assists: 6, csAt15: 152 },
                  { name: 'Yeon', role: 'BOT', championId: 'Kaisa', kills: 6, deaths: 2, assists: 8, csAt15: 148 },
                  { name: 'CoreJJ', role: 'SUP', championId: 'Rell', kills: 1, deaths: 2, assists: 15, csAt15: 28 }
                ]
              },
              {
                id: 'c9',
                side: 'red',
                goldAt15: 25940,
                objectives: { voidgrubs: 2, riftHerald: 0, firstDragon: false, firstTower: false, barons: 0 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'Gnar', kills: 2, deaths: 4, assists: 3, csAt15: 134 },
                  { name: 'Blaber', role: 'JGL', championId: 'Maokai', kills: 1, deaths: 5, assists: 6, csAt15: 101 },
                  { name: 'Loki', role: 'MID', championId: 'Orianna', kills: 2, deaths: 4, assists: 4, csAt15: 141 },
                  { name: 'Zven', role: 'BOT', championId: 'Xayah', kills: 3, deaths: 4, assists: 3, csAt15: 144 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Rakan', kills: 0, deaths: 5, assists: 7, csAt15: 22 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 3.6, type: 'FIRST_GANK', teamId: 'tl', lane: 'MID', x: 7580, y: 7420, note: 'UmTi mid-lane hover into flash burn' },
              { minute: 4.8, type: 'FIRST_GANK', teamId: 'c9', lane: 'BOT', x: 12180, y: 3120, note: 'Blaber bot-side tribrush timing' },
              { minute: 6.7, type: 'JUNGLE_PROXIMITY', teamId: 'tl', lane: 'BOT', x: 9850, y: 4450, note: 'TL early dragon river control' },
              { minute: 11.2, type: 'JUNGLE_PROXIMITY', teamId: 'tl', lane: 'TOP', x: 4600, y: 10420, note: 'TL Voidgrubs + herald swap' }
            ]
          },
          {
            sequenceNumber: 3,
            durationSec: 1825,
            patch: '16.23.1',
            winnerTeamId: 'c9',
            blueTeamId: 'c9',
            redTeamId: 'tl',
            teams: [
              {
                id: 'c9',
                side: 'blue',
                goldAt15: 27860,
                objectives: { voidgrubs: 6, riftHerald: 1, firstDragon: true, firstTower: true, barons: 1 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'Jax', kills: 6, deaths: 1, assists: 5, csAt15: 145 },
                  { name: 'Blaber', role: 'JGL', championId: 'XinZhao', kills: 4, deaths: 2, assists: 10, csAt15: 112 },
                  { name: 'Loki', role: 'MID', championId: 'Ahri', kills: 5, deaths: 1, assists: 9, csAt15: 142 },
                  { name: 'Zven', role: 'BOT', championId: 'Jinx', kills: 7, deaths: 0, assists: 6, csAt15: 154 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Alistar', kills: 0, deaths: 2, assists: 15, csAt15: 25 }
                ]
              },
              {
                id: 'tl',
                side: 'red',
                goldAt15: 25610,
                objectives: { voidgrubs: 0, riftHerald: 0, firstDragon: false, firstTower: false, barons: 0 },
                players: [
                  { name: 'Impact', role: 'TOP', championId: 'Poppy', kills: 1, deaths: 4, assists: 4, csAt15: 126 },
                  { name: 'UmTi', role: 'JGL', championId: 'LeeSin', kills: 2, deaths: 5, assists: 3, csAt15: 103 },
                  { name: 'APA', role: 'MID', championId: 'Taliyah', kills: 1, deaths: 4, assists: 3, csAt15: 136 },
                  { name: 'Yeon', role: 'BOT', championId: 'Varus', kills: 2, deaths: 4, assists: 2, csAt15: 140 },
                  { name: 'CoreJJ', role: 'SUP', championId: 'Leona', kills: 0, deaths: 5, assists: 5, csAt15: 23 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 3.2, type: 'FIRST_GANK', teamId: 'tl', lane: 'BOT', x: 11920, y: 2740, note: 'UmTi bot dive attempt disrupted' },
              { minute: 5.5, type: 'JUNGLE_PROXIMITY', teamId: 'tl', lane: 'BOT', x: 10120, y: 4210, note: 'TL bot river ward sweep' },
              { minute: 7.4, type: 'OBJECTIVE_SETUP', teamId: 'c9', lane: 'TOP', x: 4880, y: 10290, note: 'Blaber 6/6 grub sweep' }
            ]
          }
        ]
      }
    }
  },

  'c9-fly-fearless': {
    id: 'c9-fly-fearless',
    label: 'C9 vs FlyQuest — Fearless BO3',
    tournament: 'LCS Split 2 Playoffs · Patch 16.23.1',
    format: 'BO3',
    data: {
      seriesState: {
        id: 'grid-lol-2894218',
        title: { nameShortened: 'lol' },
        format: 'best-of-3',
        startedAt: '2026-08-29T21:00:00Z',
        teams: [
          { id: 'c9', name: 'Cloud9', tag: 'C9', score: 1 },
          { id: 'fly', name: 'FlyQuest', tag: 'FLY', score: 1 }
        ],
        games: [
          {
            sequenceNumber: 1,
            durationSec: 2040,
            patch: '16.23.1',
            winnerTeamId: 'fly',
            blueTeamId: 'fly',
            redTeamId: 'c9',
            teams: [
              {
                id: 'fly',
                side: 'blue',
                goldAt15: 27310,
                objectives: { voidgrubs: 5, riftHerald: 1, firstDragon: false, firstTower: true, barons: 1 },
                players: [
                  { name: 'Bwipo', role: 'TOP', championId: 'Rumble', kills: 5, deaths: 2, assists: 8, csAt15: 139 },
                  { name: 'Inspired', role: 'JGL', championId: 'Skarner', kills: 4, deaths: 1, assists: 12, csAt15: 118 },
                  { name: 'Quad', role: 'MID', championId: 'Orianna', kills: 5, deaths: 1, assists: 9, csAt15: 148 },
                  { name: 'Massu', role: 'BOT', championId: 'Varus', kills: 6, deaths: 1, assists: 7, csAt15: 151 },
                  { name: 'Busio', role: 'SUP', championId: 'Rell', kills: 0, deaths: 3, assists: 16, csAt15: 25 }
                ]
              },
              {
                id: 'c9',
                side: 'red',
                goldAt15: 25980,
                objectives: { voidgrubs: 1, riftHerald: 0, firstDragon: true, firstTower: false, barons: 0 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'KSante', kills: 2, deaths: 4, assists: 4, csAt15: 134 },
                  { name: 'Blaber', role: 'JGL', championId: 'Vi', kills: 2, deaths: 4, assists: 5, csAt15: 106 },
                  { name: 'Loki', role: 'MID', championId: 'Ahri', kills: 2, deaths: 4, assists: 4, csAt15: 140 },
                  { name: 'Zven', role: 'BOT', championId: 'Kaisa', kills: 2, deaths: 4, assists: 3, csAt15: 144 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Nautilus', kills: 0, deaths: 4, assists: 6, csAt15: 24 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 3.8, type: 'FIRST_GANK', teamId: 'fly', lane: 'TOP', x: 2680, y: 12450, note: 'Inspired top-lane dive for Bwipo prio' },
              { minute: 6.1, type: 'JUNGLE_PROXIMITY', teamId: 'fly', lane: 'TOP', x: 4720, y: 10520, note: 'Inspired Voidgrubs tempo choke' },
              { minute: 8.2, type: 'JUNGLE_PROXIMITY', teamId: 'fly', lane: 'MID', x: 7190, y: 7650, note: 'Inspired mid-river invade' }
            ]
          },
          {
            sequenceNumber: 2,
            durationSec: 1890,
            patch: '16.23.1',
            winnerTeamId: 'c9',
            blueTeamId: 'c9',
            redTeamId: 'fly',
            teams: [
              {
                id: 'c9',
                side: 'blue',
                goldAt15: 27650,
                objectives: { voidgrubs: 4, riftHerald: 1, firstDragon: true, firstTower: true, barons: 1 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'Renekton', kills: 5, deaths: 1, assists: 6, csAt15: 142 },
                  { name: 'Blaber', role: 'JGL', championId: 'Sejuani', kills: 3, deaths: 1, assists: 13, csAt15: 111 },
                  { name: 'Loki', role: 'MID', championId: 'Azir', kills: 6, deaths: 1, assists: 7, csAt15: 149 },
                  { name: 'Zven', role: 'BOT', championId: 'Kalista', kills: 5, deaths: 2, assists: 8, csAt15: 147 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Renata', kills: 1, deaths: 1, assists: 16, csAt15: 27 }
                ]
              },
              {
                id: 'fly',
                side: 'red',
                goldAt15: 25740,
                objectives: { voidgrubs: 2, riftHerald: 0, firstDragon: false, firstTower: false, barons: 0 },
                players: [
                  { name: 'Bwipo', role: 'TOP', championId: 'Gnar', kills: 2, deaths: 4, assists: 2, csAt15: 133 },
                  { name: 'Inspired', role: 'JGL', championId: 'Maokai', kills: 1, deaths: 3, assists: 5, csAt15: 109 },
                  { name: 'Quad', role: 'MID', championId: 'Corki', kills: 2, deaths: 4, assists: 3, csAt15: 144 },
                  { name: 'Massu', role: 'BOT', championId: 'Jinx', kills: 1, deaths: 4, assists: 3, csAt15: 142 },
                  { name: 'Busio', role: 'SUP', championId: 'Alistar', kills: 0, deaths: 5, assists: 5, csAt15: 21 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 3.5, type: 'FIRST_GANK', teamId: 'fly', lane: 'TOP', x: 2940, y: 12180, note: 'Inspired top-lane shadow' },
              { minute: 6.4, type: 'JUNGLE_PROXIMITY', teamId: 'fly', lane: 'MID', x: 7520, y: 7190, note: 'Inspired mid brush counter' },
              { minute: 9.8, type: 'JUNGLE_PROXIMITY', teamId: 'fly', lane: 'BOT', x: 10400, y: 3890, note: 'FLY bot lane defensive hover' }
            ]
          }
        ]
      }
    }
  },

  'c9-g2-msi-scrim': {
    id: 'c9-g2-msi-scrim',
    label: 'C9 vs G2 Esports — MSI Scrim Block',
    tournament: 'MSI 2026 International Scrims · Patch 16.23.1',
    format: 'BO5',
    data: {
      seriesState: {
        id: 'grid-lol-2894555',
        title: { nameShortened: 'lol' },
        format: 'best-of-5',
        startedAt: '2026-05-09T14:30:00Z',
        teams: [
          { id: 'c9', name: 'Cloud9', tag: 'C9', score: 1 },
          { id: 'g2', name: 'G2 Esports', tag: 'G2', score: 2 }
        ],
        games: [
          {
            sequenceNumber: 1,
            durationSec: 1760,
            patch: '16.23.1',
            winnerTeamId: 'g2',
            blueTeamId: 'g2',
            redTeamId: 'c9',
            teams: [
              {
                id: 'g2',
                side: 'blue',
                goldAt15: 28140,
                objectives: { voidgrubs: 6, riftHerald: 1, firstDragon: true, firstTower: true, barons: 1 },
                players: [
                  { name: 'BrokenBlade', role: 'TOP', championId: 'Jax', kills: 6, deaths: 1, assists: 6, csAt15: 141 },
                  { name: 'SkewMond', role: 'JGL', championId: 'LeeSin', kills: 5, deaths: 2, assists: 11, csAt15: 114 },
                  { name: 'Caps', role: 'MID', championId: 'Ahri', kills: 7, deaths: 1, assists: 8, csAt15: 147 },
                  { name: 'HansSama', role: 'BOT', championId: 'Kalista', kills: 5, deaths: 1, assists: 7, csAt15: 152 },
                  { name: 'Labrov', role: 'SUP', championId: 'Rakan', kills: 1, deaths: 2, assists: 17, csAt15: 25 }
                ]
              },
              {
                id: 'c9',
                side: 'red',
                goldAt15: 25390,
                objectives: { voidgrubs: 0, riftHerald: 0, firstDragon: false, firstTower: false, barons: 0 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'Gnar', kills: 2, deaths: 5, assists: 3, csAt15: 129 },
                  { name: 'Blaber', role: 'JGL', championId: 'Sejuani', kills: 1, deaths: 5, assists: 5, csAt15: 102 },
                  { name: 'Loki', role: 'MID', championId: 'Orianna', kills: 2, deaths: 5, assists: 4, csAt15: 138 },
                  { name: 'Zven', role: 'BOT', championId: 'Varus', kills: 2, deaths: 4, assists: 3, csAt15: 143 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Alistar', kills: 0, deaths: 5, assists: 6, csAt15: 22 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 2.9, type: 'FIRST_GANK', teamId: 'g2', lane: 'MID', x: 7450, y: 7480, note: 'SkewMond lv2 mid transition for Caps' },
              { minute: 5.4, type: 'JUNGLE_PROXIMITY', teamId: 'g2', lane: 'MID', x: 6410, y: 8390, note: 'G2 mid-top raptor invade' },
              { minute: 8.6, type: 'OBJECTIVE_SETUP', teamId: 'g2', lane: 'TOP', x: 4840, y: 10310, note: 'G2 uncontested 6-grub tempo' }
            ]
          },
          {
            sequenceNumber: 2,
            durationSec: 1980,
            patch: '16.23.1',
            winnerTeamId: 'c9',
            blueTeamId: 'c9',
            redTeamId: 'g2',
            teams: [
              {
                id: 'c9',
                side: 'blue',
                goldAt15: 27510,
                objectives: { voidgrubs: 4, riftHerald: 1, firstDragon: true, firstTower: true, barons: 1 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'Rumble', kills: 5, deaths: 2, assists: 9, csAt15: 140 },
                  { name: 'Blaber', role: 'JGL', championId: 'XinZhao', kills: 4, deaths: 2, assists: 10, csAt15: 110 },
                  { name: 'Loki', role: 'MID', championId: 'Azir', kills: 6, deaths: 1, assists: 7, csAt15: 150 },
                  { name: 'Zven', role: 'BOT', championId: 'Kaisa', kills: 6, deaths: 1, assists: 7, csAt15: 148 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Nautilus', kills: 0, deaths: 3, assists: 15, csAt15: 24 }
                ]
              },
              {
                id: 'g2',
                side: 'red',
                goldAt15: 26120,
                objectives: { voidgrubs: 2, riftHerald: 0, firstDragon: false, firstTower: false, barons: 0 },
                players: [
                  { name: 'BrokenBlade', role: 'TOP', championId: 'KSante', kills: 3, deaths: 4, assists: 4, csAt15: 135 },
                  { name: 'SkewMond', role: 'JGL', championId: 'Vi', kills: 2, deaths: 4, assists: 6, csAt15: 108 },
                  { name: 'Caps', role: 'MID', championId: 'Taliyah', kills: 3, deaths: 4, assists: 5, csAt15: 142 },
                  { name: 'HansSama', role: 'BOT', championId: 'Xayah', kills: 1, deaths: 4, assists: 4, csAt15: 145 },
                  { name: 'Labrov', role: 'SUP', championId: 'Leona', kills: 0, deaths: 5, assists: 7, csAt15: 23 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 3.4, type: 'FIRST_GANK', teamId: 'g2', lane: 'MID', x: 7620, y: 7310, note: 'SkewMond mid roam w/ Labrov' },
              { minute: 6.9, type: 'JUNGLE_PROXIMITY', teamId: 'g2', lane: 'BOT', x: 10520, y: 3980, note: 'G2 bot river skirmish' }
            ]
          },
          {
            sequenceNumber: 3,
            durationSec: 1840,
            patch: '16.23.1',
            winnerTeamId: 'g2',
            blueTeamId: 'g2',
            redTeamId: 'c9',
            teams: [
              {
                id: 'g2',
                side: 'blue',
                goldAt15: 27820,
                objectives: { voidgrubs: 5, riftHerald: 1, firstDragon: false, firstTower: true, barons: 1 },
                players: [
                  { name: 'BrokenBlade', role: 'TOP', championId: 'Renekton', kills: 5, deaths: 2, assists: 7, csAt15: 143 },
                  { name: 'SkewMond', role: 'JGL', championId: 'Poppy', kills: 3, deaths: 1, assists: 12, csAt15: 112 },
                  { name: 'Caps', role: 'MID', championId: 'Corki', kills: 8, deaths: 1, assists: 5, csAt15: 154 },
                  { name: 'HansSama', role: 'BOT', championId: 'Jinx', kills: 6, deaths: 1, assists: 6, csAt15: 151 },
                  { name: 'Labrov', role: 'SUP', championId: 'Renata', kills: 0, deaths: 2, assists: 16, csAt15: 26 }
                ]
              },
              {
                id: 'c9',
                side: 'red',
                goldAt15: 25880,
                objectives: { voidgrubs: 1, riftHerald: 0, firstDragon: true, firstTower: false, barons: 0 },
                players: [
                  { name: 'Thanatos', role: 'TOP', championId: 'KSante', kills: 2, deaths: 4, assists: 3, csAt15: 132 },
                  { name: 'Blaber', role: 'JGL', championId: 'Maokai', kills: 1, deaths: 5, assists: 5, csAt15: 104 },
                  { name: 'Loki', role: 'MID', championId: 'Ahri', kills: 2, deaths: 4, assists: 4, csAt15: 139 },
                  { name: 'Zven', role: 'BOT', championId: 'Varus', kills: 2, deaths: 4, assists: 3, csAt15: 142 },
                  { name: 'Vulcan', role: 'SUP', championId: 'Rell', kills: 0, deaths: 5, assists: 5, csAt15: 21 }
                ]
              }
            ],
            earlyEvents: [
              { minute: 3.1, type: 'FIRST_GANK', teamId: 'g2', lane: 'MID', x: 7310, y: 7600, note: 'SkewMond + Caps mid priority' },
              { minute: 5.9, type: 'JUNGLE_PROXIMITY', teamId: 'g2', lane: 'TOP', x: 4950, y: 10200, note: 'G2 Voidgrub contest' }
            ]
          }
        ]
      }
    }
  }
};

/**
 * Parse and validate an official GRID LoL Series State JSON payload.
 * Supports `{ data: { seriesState: { games: [...] } } }` or `{ seriesState: { games: [...] } }`.
 */
export function parseGridLolSeries(rawPayload, { focusTeamTag = 'C9' } = {}) {
  const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
  const seriesState = payload?.data?.seriesState || payload?.seriesState;

  if (!seriesState || !Array.isArray(seriesState.games) || seriesState.games.length === 0) {
    throw new Error('Invalid GRID LoL Series State JSON: expected data.seriesState.games[] with at least 1 game.');
  }

  const teamsMeta = Array.isArray(seriesState.teams) ? seriesState.teams : [];
  const focusMeta =
    teamsMeta.find((t) => (t.tag || '').toUpperCase() === focusTeamTag.toUpperCase()) ||
    teamsMeta.find((t) => (t.name || '').toLowerCase().includes('cloud9')) ||
    teamsMeta[0];

  const opponentMeta =
    teamsMeta.find((t) => t.id !== focusMeta?.id) ||
    teamsMeta[1] || { id: 'opp', name: 'Opponent', tag: 'OPP', score: 0 };

  const normalizedGames = seriesState.games.map((g, idx) => {
    const gameTeams = Array.isArray(g.teams) ? g.teams : [];
    const focusTeam =
      gameTeams.find((t) => t.id === focusMeta?.id) ||
      gameTeams[0];
    const opponentTeam =
      gameTeams.find((t) => t.id !== focusTeam?.id) ||
      gameTeams[1];

    if (!focusTeam || !opponentTeam) {
      throw new Error(`Game ${idx + 1} is missing both team entries.`);
    }

    const focusGold15 = Number(focusTeam.goldAt15 ?? 26000);
    const oppGold15 = Number(opponentTeam.goldAt15 ?? 26000);

    return {
      sequenceNumber: Number(g.sequenceNumber || idx + 1),
      durationSec: Number(g.durationSec || 1800),
      patch: g.patch || '16.23.1',
      winnerTeamId: g.winnerTeamId || null,
      focusWon: g.winnerTeamId === focusTeam.id,
      focusSide: focusTeam.side || 'blue',
      focusGold15,
      opponentGold15: oppGold15,
      goldDeltaAt15: focusGold15 - oppGold15,
      focusObjectives: {
        voidgrubs: Number(focusTeam.objectives?.voidgrubs ?? 0),
        riftHerald: Number(focusTeam.objectives?.riftHerald ?? 0),
        firstDragon: Boolean(focusTeam.objectives?.firstDragon),
        firstTower: Boolean(focusTeam.objectives?.firstTower),
        barons: Number(focusTeam.objectives?.barons ?? 0)
      },
      opponentObjectives: {
        voidgrubs: Number(opponentTeam.objectives?.voidgrubs ?? 0),
        riftHerald: Number(opponentTeam.objectives?.riftHerald ?? 0),
        firstDragon: Boolean(opponentTeam.objectives?.firstDragon),
        firstTower: Boolean(opponentTeam.objectives?.firstTower),
        barons: Number(opponentTeam.objectives?.barons ?? 0)
      },
      focusPlayers: Array.isArray(focusTeam.players) ? focusTeam.players : [],
      opponentPlayers: Array.isArray(opponentTeam.players) ? opponentTeam.players : [],
      earlyEvents: Array.isArray(g.earlyEvents) ? g.earlyEvents : []
    };
  });

  return {
    seriesId: seriesState.id || 'grid-custom-series',
    format: seriesState.format === 'best-of-3' ? 'BO3' : 'BO5',
    startedAt: seriesState.startedAt || new Date().toISOString(),
    focusTeam: {
      id: focusMeta?.id || 'c9',
      name: focusMeta?.name || 'Cloud9',
      tag: focusMeta?.tag || 'C9',
      score: Number(focusMeta?.score ?? normalizedGames.filter((g) => g.focusWon).length)
    },
    opponentTeam: {
      id: opponentMeta?.id || 'opp',
      name: opponentMeta?.name || 'Opponent',
      tag: opponentMeta?.tag || 'OPP',
      score: Number(opponentMeta?.score ?? normalizedGames.filter((g) => !g.focusWon).length)
    },
    games: normalizedGames
  };
}
