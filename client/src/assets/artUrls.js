// AI-generated art via Pollinations.ai (free, no API key, deterministic by seed)
// Images are generated and cached on first load — subsequent visits are instant.

const BASE = 'https://image.pollinations.ai/prompt';
const STYLE = ', fantasy trading card illustration, dark purple mystical background, dramatic lighting, highly detailed digital art, magic the gathering style';

function art(prompt, w = 256, h = 256, seed = 42) {
  return `${BASE}/${encodeURIComponent(prompt + STYLE)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`;
}

// ── Face cards ────────────────────────────────────────────────────────────────
export const FACE_ART = {
  K: art('wizard king face playing card, ornate golden crown studded with gems, flowing purple velvet royal robes with gold embroidery, holding a glowing magical scepter topped with a star, long white beard, wise and powerful expression, portrait',               220, 300, 101),
  Q: art('sorceress queen face playing card, jeweled silver tiara, holding a glowing crystal orb with swirling purple mist inside, elegant flowing violet gown with silver trim, silver hair adorned with stars, enigmatic smile, portrait',                          220, 300, 102),
  J: art('wizard jester jack playing card, two-toned purple and gold jester hat with bells, young mischievous face, holding a wand with a bright glowing amethyst crystal tip, colorful tunic with magical runes, sparkling magical energy around hands, portrait', 220, 300, 103),
  A: art('magical ace playing card center art, enormous glowing suit symbol radiating power, surrounded by intricate arcane runes and sparkling magical energy, golden light rays, ancient mystical power, dramatic center composition',                              220, 300, 104),
};

// ── Card back ─────────────────────────────────────────────────────────────────
export const CARD_BACK_ART = art(
  'ornate playing card back design, intricate gold and purple symmetrical mandala pattern, magical pentagram in center, diamond lattice border, arcane symbols in corners, velvet dark background, premium luxury playing card',
  220, 300, 105
);

// ── Atmospheric backgrounds ───────────────────────────────────────────────────
export const GAME_BG_ART = envArt(
  'top-down overhead view cartoon style magical wizard tavern wooden floor, warm oak wood planks with visible grain, scattered magical glowing runes carved into the wood, small candles in corners casting warm orange pools of light, a few scattered spell books and potion bottles on the floor edges, cozy rustic fantasy atmosphere, cel-shaded cartoon game art style, bright warm colors, clean thick outlines, cute chibi fantasy board game environment, 4k',
  1920, 1080, 108
);

// Different style suffix for background/character art — no card game style
function envArt(prompt, w, h, seed) {
  return `${BASE}/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}`;
}

export const HOME_BG_ART = envArt(
  'grand magical casino interior, vaulted gothic stone ceiling, glowing purple crystal chandeliers, ornate poker tables with arcane runes, rich purple velvet drapes, golden candlelight, ancient tomes floating in air, swirling magical mist on floor, ultra wide cinematic shot, photorealistic fantasy environment, 8k, masterpiece',
  1920, 1080, 501
);

export const HOME_HERO_ART = envArt(
  'dramatic full body portrait of a powerful dark wizard standing at a luxury magical poker table, holding glowing enchanted playing cards with golden arcane runes, wearing elegant dark robes with purple and gold trim, long fingers with magical rings, confident commanding pose, dramatic rim lighting, ultra detailed fantasy oil painting, dark atmospheric background, masterpiece, 8k',
  640, 900, 502
);

export const LOBBY_BG_ART = envArt(
  'intimate luxury magical waiting lounge, deep leather armchairs by roaring enchanted fireplace with purple flames, floating candelabras, arcane tapestries on ancient stone walls, warm golden and violet atmospheric glow, cozy mysterious fantasy interior, ultra detailed environment art, masterpiece',
  1920, 1080, 503
);

// ── Player portraits ──────────────────────────────────────────────────────────
function portrait(prompt, seed) {
  return envArt(`close-up portrait, ${prompt}, dramatic lighting, ultra detailed realistic digital painting, dark background, sharp focus, professional fantasy character art, 8k`, 256, 256, seed);
}

export const AVATAR_ART = {
  Merlin:     portrait('ancient wizard Merlin, long flowing white beard, tall pointed star-covered hat, wise twinkling blue eyes, ornate midnight blue and gold robes, warm candlelight from below', 601),
  Gandalf:    portrait('grey wizard with wide brimmed weathered hat, deeply carved wrinkled face, bushy grey eyebrows, wise stern grey eyes, grey travel-worn robes, subtle magical aura, pipe smoke', 602),
  Dumbledore: portrait('elderly benevolent headmaster wizard, half-moon gold spectacles, long silver beard, kind powerful eyes, dark midnight blue starry robes, warm soft light', 603),
  Morgana:    portrait('dark sorceress, fierce violet eyes, long silver-white hair, black silk robes with dark magic runes, shadow energy crackling around hands, beautiful and dangerous expression', 604),
  Saruman:    portrait('commanding white wizard, long immaculate white beard, piercing cold intelligent eyes, white and gold ornate robes, imperious arrogant expression, magical staff', 605),
  Circe:      portrait('enchantress witch, cascading auburn red hair, golden circlet headband, mysterious knowing smile, flowing white robes with gold accents, ancient magical wand', 606),
  Hex:        portrait('young rebel street wizard, wild black hair with glowing blue tips, glowing arcane tattoos on face, intense eyes, dark leather jacket with runic patches, urban dark fantasy', 607),
  Vex:        portrait('mysterious hooded shadowy wizard, only glowing violet eyes visible under deep dark hood, cloak covered in constellation patterns, supernatural ominous presence', 608),
  human:      portrait('mysterious cloaked figure, face half in shadow, only piercing eyes visible, elegant dark hood, unknown dangerous energy, playing card motifs on cloak', 609),
  bot:        portrait('arcane clockwork automaton wizard, brass and copper mechanical face with glowing blue crystal eyes, intricate magical gears and runes etched in chassis, steampunk sorcery hybrid', 610),
};

// ── Power card art — one unique image per card ────────────────────────────────
export const POWER_ART = {
  promotion:       art('glowing upward arrow surrounded by magical energy, rank upgrade spell, golden power promotion, magical glyph', 192, 192, 201),
  copy_machine:    art('magical mirror showing identical duplicate, copy spell, twin images emerging from enchanted glass, purple magic', 192, 192, 202),
  mirrored:        art('enchanted obsidian mirror reflecting playing cards, mirror spell, symmetrical magical reflection, arcane magic', 192, 192, 203),
  burned:          art('playing cards consumed by purple arcane fire, burn spell, cards turning to ash and embers, dramatic fire magic', 192, 192, 204),
  yes_you:         art('magical pointing spectral hand summoning spell, accusatory glowing finger of fate, blue ethereal magic', 192, 192, 205),
  third_eye_blind: art('glowing mystical third eye opening wide, all-seeing eye spell, golden iris with magical symbols, clairvoyance', 192, 192, 206),
  reflop:          art('three playing cards spinning in magical vortex being replaced by new cards, reflop swap spell, time magic', 192, 192, 207),
  prophecy:        art('luminous crystal ball showing playing cards in the future, prophecy vision spell, swirling golden mist inside', 192, 192, 208),
  hot_potato:      art('glowing magical potato on fire passing between wizard hands, chaotic exchange spell, explosive energy', 192, 192, 209),
  return_reriver:  art('magical time reversal arrow, playing card being replaced by new one, undo spell, clockwork time magic', 192, 192, 210),
  call_in:         art('magical gavel forcing all players to call, compulsion spell, golden gavel with magical aura, crowd magic', 192, 192, 211),
  '404_error':     art('magical glitch error in spell matrix, corrupted arcane code, forbidden rank struck out, digital magic', 192, 192, 212),
  chain_reaction:  art('magical energy chain linking multiple hands passing cards left, domino chain spell, cascade magic, purple lightning', 192, 192, 213),
  change_clothes:  art('playing card changing its suit magically, transformation spell, card morphing with magical sparkles', 192, 192, 214),
  drained:         art('magical coin spinning in air above frightened wizard, drain spell, purple energy being siphoned away', 192, 192, 215),
  sixth_sense:     art('sixth magical playing card rising from below the table, extra card spell, ethereal ghostly sixth card', 192, 192, 216),
  reborn:          art('phoenix rising from ashes holding two new playing cards, rebirth spell, fiery magical resurrection', 192, 192, 217),
  show_me:         art('magical eye forcing all players to reveal hidden cards, reveal spell, glowing all-seeing eye above card table', 192, 192, 218),
  wild_style:      art('wild card chaos explosion, joker energy, cards of all suits swirling in magical frenzy, wild transformation', 192, 192, 219),
  eye_patch:       art('magical pirate eye patch glowing with dark magic, sight blocking curse, one eye covered by enchanted patch', 192, 192, 220),
  risk_taker:      art('enchanted gold coin in mid-flip glowing with fate magic, gamble spell, yin yang of luck and risk', 192, 192, 221),
  veto:            art('powerful red magical X cancellation spell, veto rune, spell shattering with crimson energy explosion', 192, 192, 222),
  blurred:         art('four suit symbols merging and blurring together, suits combining spell, heart and diamond merging magically', 192, 192, 223),
  push_through:    art('magical ace wrapping around a straight from high to low, ace of spades connecting a circular sequence', 192, 192, 224),
  king_me:         art('magical crown landing on jack and queen cards transforming them into kings, coronation spell, golden crown magic', 192, 192, 225),
  reverse_reverse: art('upside down hourglass reversing time, lowest wins spell, world turned upside down magical vortex, reversal', 192, 192, 226),
  thats_odd:       art('even numbers 2 4 6 8 10 being struck with lightning and vanishing, odd numbers only spell, mathematical magic', 192, 192, 227),
  royalty:         art('royal flush of playing cards hovering in magical golden crown of glory, royalty bonus, majestic card formation', 192, 192, 228),
  in_the_shadows:  art('dark spades and clubs cards lurking in shadows winning, shadow stealth victory, dark suit triumph spell', 192, 192, 229),
  lucky_7:         art('lucky number seven glowing with golden magical energy, fortune spell, dice showing seven, luck aura', 192, 192, 230),
  straight_up:     art('five playing cards in perfect sequential magical line ascending, straight sequence spell, ordered card magic', 192, 192, 231),
  underdog:        art('small underdog wizard defeating enormous opponent with single high card, unlikely victory spell, against all odds', 192, 192, 232),
  blurred2:        art('blurred vision spell affecting suits, confusion magic', 192, 192, 233),
};
