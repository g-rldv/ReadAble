// ============================================================
// CHARACTER_CATALOG.js — Single source of truth for all characters
// Place all PNG files in: frontend/public/characters/
// Pricing: common=50, uncommon=100-150, rare=200-300, epic=400-500, legendary=achievement-only, mythic=achievement-only
// ============================================================

export const RARITY_CONFIG = {
  common:    { label: 'Common',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', border: '#9CA3AF40', glow: 'rgba(156,163,175,0.3)'   },
  uncommon:  { label: 'Uncommon',  color: '#4ADE80', bg: 'rgba(74,222,128,0.12)',  border: '#4ADE8040', glow: 'rgba(74,222,128,0.35)'   },
  rare:      { label: 'Rare',      color: '#60B8F5', bg: 'rgba(96,184,245,0.12)',  border: '#60B8F540', glow: 'rgba(96,184,245,0.4)'    },
  epic:      { label: 'Epic',      color: '#A855F7', bg: 'rgba(168,85,247,0.12)',  border: '#A855F740', glow: 'rgba(168,85,247,0.45)'   },
  legendary: { label: 'Legendary', color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', border: '#FF6B6B40', glow: 'rgba(255,107,107,0.55)' },
  mythic:    { label: 'Mythic',    color: '#F97316', bg: 'rgba(249,115,22,0.12)',  border: '#F9731640', glow: 'rgba(249,115,22,0.5)'    },
};

export const ALL_CHARACTERS = [
  // ── COMMON (all 50 coins, except default which is free) ──
  { id:'char_common_gray',       name:'Gray',          file:'char_common_gray.png',           rarity:'common',   cost:0,   earnedBy:null,          isDefault:true, desc:'The original. Plain and proud.'              },
  { id:'char_common_blue',       name:'Blueberry',     file:'char_common_blue.png',           rarity:'common',   cost:50,  earnedBy:'first_star',                  desc:'A cool blue blob, ready to learn.'           },
  { id:'char_common_yellow',     name:'Sunny',         file:'char_common_yellow.png',         rarity:'common',   cost:50,  earnedBy:null,                          desc:'Bright and warm, like a sunny day.'          },
  { id:'char_common_pinkribbon', name:'Ribbon',        file:'char_common_pinkribbon.png',     rarity:'common',   cost:50,  earnedBy:null,                          desc:'Pretty in pink with a cute bow.'             },
  { id:'char_common_dalmatian',  name:'Spotty',        file:'char_common_dalmatian.png',      rarity:'common',   cost:50,  earnedBy:'complete_5',                  desc:'Spotted with character!'                     },
  // ── UNCOMMON (100–150 coins) ──────────────────────────────
  { id:'char_uncommon_yellowcap',  name:'Cap Kid',   file:'char_uncommon_yellowcap.png',   rarity:'uncommon', cost:100, earnedBy:null,          desc:'Rocking a fresh yellow cap.'                 },
  { id:'char_uncommon_greenglass', name:'Smarty',    file:'char_uncommon_greenglass.png',  rarity:'uncommon', cost:100, earnedBy:'xp_100',      desc:'Smart glasses for a smart reader.'           },
  { id:'char_uncommon_student',    name:'Scholar',   file:'char_uncommon_student.png',     rarity:'uncommon', cost:120, earnedBy:'level_3',     desc:'Always studying, always growing.'            },
  { id:'char_uncommon_paint',      name:'Painty',    file:'char_uncommon_paint.png',       rarity:'uncommon', cost:120, earnedBy:null,          desc:'Covered in colorful paint splatters.'        },
  { id:'char_uncommon_hero',       name:'Hero',      file:'char_uncommon_hero.png',        rarity:'uncommon', cost:130, earnedBy:'five_streak', desc:'Cape on, ready to save the day.'             },
  { id:'char_uncommon_ranger',     name:'Explorer',  file:'char_uncommon_ranger.png',      rarity:'uncommon', cost:140, earnedBy:'complete_10', desc:'Adventure awaits! Ready to explore.'         },
  { id:'char_uncommon_sweater',    name:'Bookworm',  file:'char_uncommon_sweater.png',     rarity:'uncommon', cost:150, earnedBy:null,          desc:'Cozy sweater, good book, perfect day.'       },
  // ── RARE (200–300 coins) ──────────────────────────────────
  { id:'char_rare_painter',    name:'Artist',      file:'char_rare_painter.png',    rarity:'rare', cost:200, earnedBy:'xp_500',      desc:'Beret, palette, pure creative energy.'       },
  { id:'char_rare_baker',      name:'Baker',       file:'char_rare_baker.png',      rarity:'rare', cost:220, earnedBy:'complete_25', desc:'Chef hat on, bread in hand. Magnifique!'     },
  { id:'char_rare_bluebonnet', name:'Cozy Reader', file:'char_rare_bluebonnet.png', rarity:'rare', cost:250, earnedBy:'ten_streak',  desc:'Striped beanie and a good book always.'      },
  { id:'char_rare_redpolo',    name:'Flannel',     file:'char_rare_redpolo.png',    rarity:'rare', cost:270, earnedBy:null,          desc:'Cool and casual. The classic look.'           },
  { id:'char_rare_guitar',     name:'Rockstar',    file:'char_rare_guitar.png',     rarity:'rare', cost:300, earnedBy:'level_10',    desc:'Strum along to the sound of learning.'       },
  // ── EPIC (400–500 coins) ──────────────────────────────────
  { id:'char_epic_cloudengineer', name:'Cloud Engineer',  file:'char_epic_cloudengineer.png', rarity:'epic', cost:400, earnedBy:null,       desc:'Architecting solutions high in the sky.'     },
  { id:'char_epic_devopseng',     name:'DevOps Engineer', file:'char_epic_devopseng.png',     rarity:'epic', cost:400, earnedBy:null,       desc:'Shipping code fast and breaking nothing.'    },
  { id:'char_epic_fsdev',         name:'Full Stack Dev',  file:'char_epic_fsdev.png',         rarity:'epic', cost:450, earnedBy:'level_20', desc:'Frontend, backend — all of it.'              },
  // ── LEGENDARY (achievement-only, cost:0) ──────────────────
  // Molecular Biologist: unlock by completing ALL picture_word + picture_choice activities
  { id:'char_legendary_molecularbiologist', name:'Molecular Biologist', file:'char_legendary_molecularbiologist.png', rarity:'legendary', cost:0, earnedBy:'complete_all_picture', desc:'Decoded the very building blocks of life.'        },
  { id:'char_legendary_sustainabilityconsultant', name:'Sustainability Consultant', file:'char_legendary_sustainabilityconsultant.png', rarity:'legendary', cost:0, earnedBy:'xp_1000', desc:'Sustainable and brilliant.'     },
  { id:'char_legendary_urbanplanner',       name:'Urban Planner',       file:'char_legendary_urbanplanner.png',       rarity:'legendary', cost:0, earnedBy:'ten_streak',     desc:'Designing cities one block at a time.'            },
  // ── MYTHIC (achievement-only, cost:0) ─────────────────────
  { id:'char_mythic_shadowmonarch', name:'Shadow Monarch', file:'char_mythic_shadowmonarch.png', rarity:'mythic', cost:0, earnedBy:'completionist', desc:'Mastered all activities. Power beyond measure.' },
  // Sun Armor: unlock by earning 1,500 XP
  { id:'char_mythic_sunarmor',      name:'Sun Armor',      file:'char_mythic_sunarmor.png',      rarity:'mythic', cost:0, earnedBy:'xp_1500',       desc:'Forged in XP, armored by dedication.'          },
];

export const characterById = (id) => ALL_CHARACTERS.find(c => c.id === id);
export const DEFAULT_CHARACTER_ID = 'char_common_gray';

export const ACHIEVEMENT_CHARACTER_UNLOCKS = ALL_CHARACTERS.reduce((acc, char) => {
  if (char.earnedBy) {
    if (!acc[char.earnedBy]) acc[char.earnedBy] = [];
    acc[char.earnedBy].push(char.id);
  }
  return acc;
}, {});