export function getItemImage(itemId) {
  if (!itemId) return ''
  return `https://render.albiononline.com/v1/item/${itemId}.png`
}

const ITEM_NAMES = {
  MAIN_AXE: 'Battleaxe',
  MAIN_RAPIER_MORGANA: 'Bloodletter',
  MAIN_HOLYSTAFF: 'Holy Staff',
  MAIN_FIRESTAFF: 'Fire Staff',
  MAIN_CURSEDSTAFF: 'Cursed Staff',
  MAIN_SPEAR: 'Spear',
  MAIN_DAGGER: 'Dagger',
  MAIN_1HCROSSBOW: 'Light Crossbow',
  MAIN_SCIMITAR_MORGANA: 'Clarent Blade',
  MAIN_FROSTSTAFF: 'Frost Staff',
  MAIN_SWORD: 'Broadsword',
  MAIN_NATURESTAFF: 'Nature Staff',
  MAIN_ARCANESTAFF: 'Arcane Staff',
  MAIN_MACE: 'Mace',
  MAIN_SPEAR_KEEPER: 'Heron Spear',
  MAIN_FIRESTAFF_KEEPER: 'Wildfire Staff',
  MAIN_CURSEDSTAFF_UNDEAD: 'Lifecurse Staff',
  MAIN_HOLYSTAFF_MORGANA: 'Lifetouch Staff',
  MAIN_NATURESTAFF_KEEPER: 'Druidic Staff',
  MAIN_HOLYSTAFF_AVALON: 'Hallowfall',
  MAIN_FROSTSTAFF_AVALON: 'Chillhowl',
  MAIN_CURSEDSTAFF_AVALON: 'Shadowcaller',
  MAIN_MACE_HELL: 'Camlann Mace',
  MAIN_FIRESTAFF_CRYSTAL: 'Dawnsong',

  '2H_BOW_KEEPER': 'Bow of Badon',
  '2H_DUALAXE_KEEPER': 'Bear Paws',
  '2H_DUALSWORD': 'Dual Swords',
  '2H_LONGBOW': 'Longbow',
  '2H_DAGGERPAIR': 'Dagger Pair',
  '2H_QUARTERSTAFF': 'Quarterstaff',
  '2H_CLAYMORE': 'Claymore',
  '2H_DUALSICKLE_UNDEAD': 'Deathgivers',
  '2H_INFERNOSTAFF_MORGANA': 'Blazing Staff',
  '2H_CROSSBOWLARGE': 'Heavy Crossbow',
  '2H_FROSTSTAFF': 'Great Frost Staff',
  '2H_DOUBLEBLADEDSTAFF': 'Double Bladed Staff',
  '2H_BOW': 'Bow',
  '2H_WARBOW': 'Warbow',
  '2H_AXE': 'Greataxe',
  '2H_HAMMER_UNDEAD': 'Tombhammer',
  '2H_POLEHAMMER': 'Polehammer',
  '2H_CROSSBOW': 'Crossbow',
  '2H_HAMMER': 'Great Hammer',
  '2H_INFERNOSTAFF': 'Infernal Staff',
  '2H_NATURESTAFF': 'Great Nature Staff',
  '2H_NATURESTAFF_HELL': 'Blight Staff',
  '2H_FIRESTAFF': 'Great Fire Staff',
  '2H_IRONCLADEDSTAFF': 'Iron-clad Staff',
  '2H_DEMONICSTAFF': 'Demonic Staff',
  '2H_GLACIALSTAFF': 'Glacial Staff',
  '2H_CLAWPAIR': 'Claws',
  '2H_LONGBOW_UNDEAD': 'Wailing Bow',
  '2H_HALBERD_MORGANA': 'Carrioncaller',
  '2H_TRIDENT_UNDEAD': 'Trinity Spear',
  '2H_DUALHAMMER_HELL': 'Forge Hammers',
  '2H_CLAYMORE_AVALON': 'Kingmaker',
  '2H_BOW_AVALON': 'Mistpiercer',
  '2H_CROSSBOW_CANNON_AVALON': 'Energy Shaper',
  '2H_QUARTERSTAFF_AVALON': 'Grailseeker',
  '2H_ROCKSTAFF_KEEPER': 'Staff of Balance',
  '2H_ARCANESTAFF_CRYSTAL': 'Evensong',
  '2H_FROSTSTAFF_CRYSTAL': 'Arctic Staff',
  '2H_DAGGERPAIR_CRYSTAL': 'Bridled Fury',
  '2H_DUALCROSSBOW_HELL': 'Boltcasters',
  '2H_DUALCROSSBOW_CRYSTAL': 'Arclight Blasters',
  '2H_SHAPESHIFTER_SET1': 'Prowling Staff',
  '2H_SHAPESHIFTER_SET2': 'Rootbound Staff',
  '2H_SHAPESHIFTER_SET3': 'Primal Staff',
  '2H_SHAPESHIFTER_MORGANA': 'Bloodmoon Staff',
  '2H_SHAPESHIFTER_HELL': 'Hellspawn Staff',
  '2H_SHAPESHIFTER_KEEPER': 'Earthrune Staff',
  '2H_SHAPESHIFTER_AVALON': 'Lightcaller',
  '2H_SHAPESHIFTER_CRYSTAL': 'Stillgaze Staff',
}

function getBaseItemId(itemId) {
  return String(itemId || '')
    .replace(/^T\d_/, '')
    .replace(/@.*/, '')
}

function formatFallbackName(baseId) {
  return baseId
    .replace(/^2H_/i, '')
    .replace(/^MAIN_/i, '')
    .replace(/^OFF_/i, '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function cleanItemName(itemId) {
  if (!itemId) return 'Inconnu'

  const baseId = getBaseItemId(itemId)

  return ITEM_NAMES[baseId] || formatFallbackName(baseId)
}
