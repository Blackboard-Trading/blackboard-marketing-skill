// Original Blackboard chalk drawings for the share card, viewBox 240×230

export type ArtId = 'none' | 'rocket' | 'moon' | 'lambo' | 'bull' | 'pump' | 'dip' | 'satoshi' | 'shiba' | 'bear' | 'ramen' | 'rip'

export interface ShareArt { id: Exclude<ArtId, 'none'>; label: string; body: string }

const INK = 'rgba(239,238,230,.82)'
const DIM = 'rgba(239,238,230,.3)'
const B = '#1b1d1e'
const VOID = '#0c0d0e'
const SH = 'rgba(0,0,0,.35)'
const WOOD = '#c9a46e'
const WATER = '#9fd3ff'

/** The theme's chalk yellow, read from the token so the PNG matches the page. */
export const chalkYellow = () => getComputedStyle(document.documentElement).getPropertyValue('--color-chalk-yellow').trim() || '#f4c430'

const shape = (d: string, fill = B, op = 1) => `<path d="${d}" stroke="${SH}" stroke-width="6"/><path d="${d}" fill="${fill}" fill-opacity="${op}" stroke="{{ink}}" stroke-width="2.8"/>`
// A wide ink stroke under a narrower board stroke reads as an outlined arm or leg.
const limb = (d: string, w = 12) => `<path d="${d}" stroke="{{ink}}" stroke-width="${w}"/><path d="${d}" stroke="${B}" stroke-width="${w - 5}"/>`
const dot = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>`
const stars = (d: string) => `<path d="${d}" stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.6"/>`

const EARS = `<path d="M-23,0 q-9,-3 -8,8 q1,9 9,7" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/><path d="M23,0 q9,-3 8,8 q-1,9 -9,7" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>`
const SKULL = 'M-23,-6 C-24,-30 24,-30 23,-6 C24,14 14,28 0,29 C-14,28 -24,14 -23,-6 Z'
const HEAD = `${EARS}${shape(SKULL)}
<path d="M-24,-4 C-30,-22 -20,-36 -6,-34 C-2,-42 14,-40 17,-32 C28,-32 30,-16 24,-4 C22,-14 14,-20 6,-16 C2,-22 -10,-22 -14,-14 C-18,-16 -22,-10 -24,-4 Z" fill="{{ink}}" fill-opacity=".75" stroke="{{ink}}" stroke-width="2"/>
<path d="M-4,-30 q4,-6 10,-6 M-14,-26 q2,-6 8,-8 M10,-26 q6,0 8,6" stroke="${B}" stroke-opacity=".55" stroke-width="1.4"/>`
const HEAD_BACK = `${EARS}${shape(SKULL)}
<path d="M-25,6 C-30,-24 -16,-38 0,-37 C16,-38 30,-24 25,6 L20,18 L14,12 L8,22 L2,14 L-4,22 L-10,13 L-16,20 L-20,10 Z" fill="{{ink}}" fill-opacity=".75" stroke="{{ink}}" stroke-width="2"/>
<path d="M-14,-22 q4,8 2,16 M2,-28 q3,10 0,18 M14,-20 q-2,8 0,14" stroke="${B}" stroke-opacity=".55" stroke-width="1.4"/>`

const FACES = {
  grin: `<path d="M-14,1 q5,-7 10,0 M4,1 q5,-7 10,0" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M-11,10 Q0,27 11,10 Z" fill="${VOID}" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M-6,19 q6,-4 12,0" stroke="{{tone}}" stroke-width="2"/>
<path d="M-20,9 l4,-3 M-17,12 l4,-3 M20,9 l-4,-3 M17,12 l-4,-3" stroke="{{tone}}" stroke-opacity=".7" stroke-width="1.4"/>`,
  sad: `<path d="M-16,-6 l10,-5 M16,-6 l-10,-5" stroke="{{ink}}" stroke-width="2.2"/>
<circle cx="-9" cy="2" r="2.6" fill="{{ink}}"/><circle cx="9" cy="2" r="2.6" fill="{{ink}}"/>
<path d="M-8,19 q8,-7 16,0" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M-12,7 q-4,7 0,10 q4,-3 0,-10 Z" fill="${WATER}" stroke="${WATER}" stroke-width="1"/>`,
  cool: `<path d="M-21,-3 H21" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M-19,-3 q0,11 9,11 q8,0 8,-11 Z M2,-3 q0,11 8,11 q9,0 9,-11 Z" fill="${VOID}" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M-15,0 l4,-2 M6,0 l4,-2" stroke="{{ink}}" stroke-opacity=".8" stroke-width="1.6"/>
<path d="M-7,16 q9,5 14,-3" stroke="{{ink}}" stroke-width="2.4"/>`,
}

/** "anon", the recurring trader: head centred on (x, y), about 52×70 at scale 1. */
const anon = (x: number, y: number, s: number, face: keyof typeof FACES, r = 0) => `<g transform="translate(${x},${y}) rotate(${r}) scale(${s})">${HEAD}${FACES[face]}</g>`
const anonBack = (x: number, y: number, s: number) => `<g transform="translate(${x},${y}) scale(${s})">${HEAD_BACK}</g>`
const hoodie = (cx: number, top: number) => `${shape(`M${cx - 58},232 C${cx - 58},${top + 20} ${cx - 36},${top + 2} ${cx},${top} C${cx + 36},${top + 2} ${cx + 58},${top + 20} ${cx + 58},232 Z`)}
<path d="M${cx - 8},${top + 6} v18 M${cx + 8},${top + 6} v18" stroke="{{ink}}" stroke-width="2"/><circle cx="${cx - 8}" cy="${top + 26}" r="2" fill="{{ink}}"/><circle cx="${cx + 8}" cy="${top + 26}" r="2" fill="{{ink}}"/>
<path d="M${cx - 50},${top + 30} l8,6 M${cx - 53},${top + 44} l8,6 M${cx + 50},${top + 30} l-8,6 M${cx + 53},${top + 44} l-8,6" stroke="{{dim}}" stroke-width="1.6"/>`

const ROCKET = `
${stars('M40,44 v10 M35,49 h10 M214,118 v8 M210,122 h8 M150,26 v6 M147,29 h6 M222,30 v6 M219,33 h6')}
<circle cx="190" cy="170" r="2" fill="{{ink}}" fill-opacity=".5"/><circle cx="22" cy="96" r="1.6" fill="{{ink}}" fill-opacity=".5"/>
<path d="M168,150 l-30,26 M186,140 l-22,19 M152,174 l-20,17" stroke="{{dim}}" stroke-width="1.8"/>
<g transform="translate(126,128) rotate(-41)">
<path d="M-84,-13 Q-124,-24 -148,0 Q-124,24 -84,13 Z" fill="{{tone}}" fill-opacity=".85" stroke="{{tone}}" stroke-width="1.4"/>
<path d="M-84,-7 Q-108,-11 -122,0 Q-108,11 -84,7 Z" fill="{{gold}}" stroke="{{gold}}" stroke-width="1"/>
<path d="M-52,-20 L-80,-50 L-88,-46 L-76,-18 Z M-52,20 L-80,50 L-88,46 L-76,18 Z" fill="{{tone}}" fill-opacity=".4" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M-78,-15 L-88,-11 L-88,11 L-78,15 Z" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>
${shape('M98,0 C82,-18 52,-23 -20,-23 L-78,-18 L-78,18 L-20,23 C52,23 82,18 98,0 Z')}
<path d="M64,-19 C82,-14 92,-6 98,0 C92,6 82,14 64,19 C69,8 69,-8 64,-19 Z" fill="{{tone}}" fill-opacity=".55" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M-58,-20 C-54,-8 -54,8 -58,20" stroke="{{ink}}" stroke-opacity=".6" stroke-width="2"/>
<circle cx="32" cy="2" r="10" fill="${VOID}" stroke="{{ink}}" stroke-width="2.6"/>
<path d="M27,-2 a6,6 0 0 1 7,-4" stroke="{{ink}}" stroke-opacity=".7" stroke-width="1.4"/>
<path d="M-40,13 l7,8 M-26,14 l7,8 M-12,14 l7,8 M2,14 l7,8 M16,13 l7,8 M44,11 l5,6" stroke="{{dim}}" stroke-width="1.6"/>
</g>
<path d="M84,98 C70,104 58,96 44,104 C36,108 28,104 20,110 L26,118 C34,112 44,118 54,112 C66,106 74,112 88,104 Z" fill="{{tone}}" fill-opacity=".8" stroke="{{tone}}" stroke-width="1.6"/>
${limb('M80,104 Q60,92 58,66', 13)}${dot(57, 60, 7)}
${shape('M76,142 C70,126 70,108 78,99 Q90,93 100,99 C106,107 104,116 100,121 Z')}
<path d="M80,112 l6,6 M78,122 l7,7 M80,132 l5,5" stroke="{{dim}}" stroke-width="1.6"/>
${limb('M98,104 L114,106', 12)}${dot(118, 106, 5.5)}
${limb('M90,132 L112,122 L120,146', 13)}
<path d="M113,146 h15 q5,0 5,6 h-20 Z" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>
${anon(86, 74, 0.82, 'grin', -10)}`

const MOON = `
${stars('M150,26 v8 M146,30 h8 M222,22 v6 M219,25 h6 M86,30 v6 M83,33 h6 M224,112 v8 M220,116 h8')}
<circle cx="40" cy="52" r="20" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M24,46 q8,-6 12,2 q4,8 14,3 M30,62 q6,-2 10,4 M42,36 q6,2 10,-2" stroke="{{tone}}" stroke-width="2"/>
<circle cx="72" cy="94" r="1.8" fill="{{ink}}" fill-opacity=".5"/><circle cx="200" cy="140" r="1.6" fill="{{ink}}" fill-opacity=".5"/>
${shape('M-6,186 C50,164 190,162 246,182 L246,236 L-6,236 Z')}
<g stroke="{{ink}}" stroke-opacity=".6" stroke-width="2"><ellipse cx="44" cy="202" rx="16" ry="5"/><ellipse cx="198" cy="206" rx="20" ry="6"/><ellipse cx="132" cy="218" rx="10" ry="3"/></g>
<path d="M14,216 l10,-8 M24,224 l12,-10 M212,190 l10,-8 M222,198 l10,-8 M160,222 l8,-6" stroke="{{dim}}" stroke-width="1.6"/>
<g fill="{{dim}}"><ellipse cx="80" cy="182" rx="4" ry="2.4"/><ellipse cx="66" cy="188" rx="4" ry="2.4"/><ellipse cx="52" cy="183" rx="4" ry="2.4"/></g>
<path d="M166,180 L170,44" stroke="{{ink}}" stroke-width="2.6"/>
<path d="M170,46 C182,40 194,52 210,46 L210,78 C194,84 182,72 170,78 Z" fill="{{tone}}" fill-opacity=".8" stroke="{{tone}}" stroke-width="1.6"/>
<path d="M176,70 l8,-8 l6,5 l12,-14 M196,52 h6 v6" stroke="${B}" stroke-width="2.4"/>
<path d="M86,106 h12 v44 h-12 Z" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>
${limb('M106,150 L102,176', 16)}${limb('M126,150 L130,176', 16)}
<path d="M92,174 h18 q3,7 -2,9 h-17 q-3,-6 1,-9 Z M122,174 h18 q4,3 2,9 h-17 q-5,-2 -3,-9 Z" fill="${B}" stroke="{{ink}}" stroke-width="2.2"/>
${shape('M94,112 Q92,104 102,102 H130 Q138,104 136,112 L134,152 Q115,158 96,152 Z')}
<rect x="104" y="118" width="22" height="14" rx="2" stroke="{{ink}}" stroke-width="2"/>
<circle cx="110" cy="125" r="2.2" fill="{{tone}}"/><circle cx="119" cy="125" r="2.2" fill="{{gold}}"/>
<path d="M98,140 l6,6 M104,140 l6,6" stroke="{{dim}}" stroke-width="1.6"/>
${limb('M98,112 L82,130 L86,144', 15)}${dot(87, 149, 6)}
${limb('M132,112 L150,120 L162,112', 15)}${dot(167, 110, 6)}
<path d="M96,60 l-6,-10" stroke="{{ink}}" stroke-width="2"/><circle cx="89" cy="48" r="2.6" fill="{{tone}}"/>
<circle cx="114" cy="80" r="26" stroke="${SH}" stroke-width="6"/><circle cx="114" cy="80" r="26" fill="${B}" stroke="{{ink}}" stroke-width="2.8"/>
<ellipse cx="116" cy="83" rx="18" ry="15" fill="${VOID}" stroke="{{ink}}" stroke-width="2.2"/>
<g transform="translate(116,79) scale(.6)">${FACES.grin}</g>
<path d="M103,76 q4,-6 10,-7" stroke="{{ink}}" stroke-opacity=".7" stroke-width="1.6"/>`

const LAMBO = `
<path d="M0,128 h26 M6,144 h18 M0,158 h12" stroke="{{dim}}" stroke-width="2"/>
<g transform="translate(34,92) rotate(-18)"><rect width="26" height="14" rx="2" fill="${B}" stroke="{{tone}}" stroke-width="1.8"/><circle cx="13" cy="7" r="3.5" stroke="{{tone}}" stroke-width="1.4"/></g>
<g transform="translate(66,58) rotate(14)"><rect width="26" height="14" rx="2" fill="${B}" stroke="{{tone}}" stroke-width="1.8"/><circle cx="13" cy="7" r="3.5" stroke="{{tone}}" stroke-width="1.4"/></g>
${stars('M200,40 v8 M196,44 h8 M224,80 v6 M221,83 h6')}
<ellipse cx="124" cy="196" rx="106" ry="6" stroke="{{dim}}" stroke-width="2"/>
<path d="M18,190 a7,7 0 1 1 10,-8 a6,6 0 1 1 6,10 a6,6 0 0 1 -16,-2 Z" stroke="{{ink}}" stroke-opacity=".45" stroke-width="1.6"/>
<path d="M102,92 h-16 M104,102 h-22 M108,84 h-10" stroke="{{dim}}" stroke-width="2"/>
${anon(132, 102, 0.72, 'cool', 6)}
${shape('M20,172 L20,158 Q22,150 40,148 L96,128 Q114,121 142,121 L164,122 Q178,125 198,138 L222,146 Q230,149 229,160 L228,170 Q227,173 222,173 L202,173 A24,24 0 0 0 154,173 L90,173 A24,24 0 0 0 42,173 Z')}
<path d="M160,122 L172,106 L176,108 L170,126" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M40,158 L208,150" stroke="{{ink}}" stroke-opacity=".5" stroke-width="1.8"/>
<path d="M116,150 L158,148 L150,164 L122,165 Z" fill="${VOID}" stroke="{{ink}}" stroke-width="2"/>
<path d="M128,152 l-2,10 M136,152 l-2,10 M144,151 l-2,10" stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.6"/>
<path d="M28,150 L22,138 L52,135 L50,144" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M210,146 l14,5" stroke="{{gold}}" stroke-width="3"/><path d="M22,158 h9" stroke="{{tone}}" stroke-width="3"/>
<path d="M60,140 l8,-3 M72,136 l8,-3" stroke="{{dim}}" stroke-width="1.6"/>
${limb('M148,130 L164,110 L168,92', 11)}${dot(169, 86, 6)}
<g stroke="{{ink}}" stroke-width="2.8" fill="${B}"><circle cx="66" cy="175" r="19"/><circle cx="178" cy="175" r="19"/></g>
<g stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.6"><circle cx="66" cy="175" r="12"/><circle cx="178" cy="175" r="12"/><path d="M66,163 V187 M54,175 H78 M57.5,166.5 L74.5,183.5 M74.5,166.5 L57.5,183.5 M178,163 V187 M166,175 H190 M169.5,166.5 L186.5,183.5 M186.5,166.5 L169.5,183.5"/></g>
<circle cx="66" cy="175" r="3" fill="{{ink}}"/><circle cx="178" cy="175" r="3" fill="{{ink}}"/>`

const BULL = `
<path d="M14,210 L50,194 L74,202 L104,180 L126,188 L170,154 L196,162 L228,126" stroke="{{tone}}" stroke-width="2.6"/>
<path d="M212,124 L230,124 L228,142" stroke="{{tone}}" stroke-width="2.6"/>
<path d="M96,60 C72,62 48,50 42,20 C54,36 72,42 98,46 Z M164,60 C188,62 212,50 218,20 C206,36 188,42 162,46 Z" fill="{{ink}}" fill-opacity=".85" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M58,46 l5,-7 M70,50 l3,-8 M82,52 l2,-8 M202,46 l-5,-7 M190,50 l-3,-8 M178,52 l-2,-8" stroke="${B}" stroke-opacity=".6" stroke-width="1.6"/>
<path d="M100,66 C86,58 70,64 64,78 C78,86 92,84 102,80 Z M160,66 C174,58 190,64 196,78 C182,86 168,84 158,80 Z" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M74,74 q10,2 20,0 M186,74 q-10,2 -20,0" stroke="{{tone}}" stroke-opacity=".7" stroke-width="2"/>
${shape('M96,48 C112,40 148,40 164,48 C174,58 176,80 170,102 C166,118 162,128 160,138 L100,138 C98,128 94,118 90,102 C84,80 86,58 96,48 Z')}
<path d="M112,48 C114,36 124,42 120,32 C130,38 132,44 138,40 C138,46 144,46 148,50" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M98,66 l-4,10 M96,82 l-4,10 M98,98 l-3,8 M162,66 l4,10 M164,82 l4,10 M162,98 l3,8" stroke="{{dim}}" stroke-width="1.8"/>
<path d="M102,84 L122,94 M158,84 L138,94" stroke="{{ink}}" stroke-width="3"/>
<circle cx="114" cy="101" r="4" fill="{{ink}}"/><circle cx="146" cy="101" r="4" fill="{{ink}}"/>
<circle cx="112.6" cy="99.6" r="1.2" fill="${B}"/><circle cx="144.6" cy="99.6" r="1.2" fill="${B}"/>
<ellipse cx="130" cy="150" rx="34" ry="22" fill="${B}" stroke="{{ink}}" stroke-width="2.8"/>
<path d="M104,160 q26,10 52,0" stroke="{{dim}}" stroke-width="1.8"/>
<ellipse cx="117" cy="146" rx="5" ry="7" fill="{{ink}}" fill-opacity=".85"/><ellipse cx="143" cy="146" rx="5" ry="7" fill="{{ink}}" fill-opacity=".85"/>
<circle cx="130" cy="174" r="9" stroke="{{gold}}" stroke-width="2.8"/>
<path d="M94,160 q-8,-3 -14,3 q-6,-4 -12,2 M92,170 q-10,0 -16,8 M166,160 q8,-3 14,3 q6,-4 12,2 M168,170 q10,0 16,8" stroke="{{ink}}" stroke-opacity=".5" stroke-width="2"/>`

const CANDLES: [number, number, number, number, number][] = [[84, 80, 100, 86, 98], [96, 76, 96, 80, 94], [108, 80, 98, 84, 95], [120, 64, 90, 70, 88], [132, 68, 90, 74, 86], [144, 50, 82, 56, 78], [160, 28, 76, 34, 72]]
const PUMP = `
<path d="M30,12 a13,13 0 1 0 8,24 a10,10 0 1 1 -8,-24 Z" fill="{{ink}}" fill-opacity=".7" stroke="{{ink}}" stroke-width="1.6"/>
${stars('M206,12 v8 M202,16 h8 M188,30 v6 M185,33 h6 M60,18 v6 M57,21 h6')}
${shape('M8,52 H70 V100 H8 Z')}
<path d="M16,64 h30 M16,74 h40 M16,84 h22" stroke="{{dim}}" stroke-width="2"/><path d="M50,64 h12 M44,84 h16" stroke="{{tone}}" stroke-width="2"/>
${shape('M174,52 H234 V100 H174 Z')}
<path d="M182,90 L194,84 L204,88 L214,72 L226,64" stroke="{{tone}}" stroke-width="2"/>
${shape('M70,26 H178 V108 H70 Z')}
${CANDLES.map(([x, hi, lo, top, bot]) => `<path d="M${x},${hi} V${lo}" stroke="{{tone}}" stroke-width="1.6"/><rect x="${x - 4}" y="${top}" width="8" height="${bot - top}" fill="{{tone}}" fill-opacity=".55" stroke="{{tone}}" stroke-width="1.6"/>`).join('')}
<path d="M168,24 l2,-6 l2,6 l6,2 l-6,2 l-2,6 l-2,-6 l-6,-2 Z" fill="{{gold}}" stroke="{{gold}}" stroke-width="1"/>
<path d="M124,108 v14 M106,124 h36 M38,100 v14 M204,100 v14" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M0,140 H240" stroke="{{ink}}" stroke-opacity=".7" stroke-width="2.4"/>
<path d="M8,140 l-6,10 M26,140 l-6,10 M44,140 l-6,10 M196,140 l-6,10 M214,140 l-6,10 M232,140 l-6,10" stroke="{{dim}}" stroke-width="1.6"/>
${shape('M20,118 h20 v22 h-20 Z')}<path d="M40,122 q8,0 8,7 q0,7 -8,7" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M26,112 q-4,-6 0,-10 M34,112 q-4,-6 0,-10" stroke="{{dim}}" stroke-width="1.8"/>
${shape('M78,232 C78,192 96,166 120,164 C144,166 162,192 162,232 Z')}
<path d="M100,166 Q120,188 140,166" stroke="{{ink}}" stroke-width="2.2"/><path d="M104,174 Q120,192 136,174" stroke="{{dim}}" stroke-width="1.8"/>
<path d="M88,202 l8,6 M86,216 l8,6 M152,202 l-8,6 M154,216 l-8,6" stroke="{{dim}}" stroke-width="1.6"/>
${limb('M92,182 Q54,152 56,108', 14)}${dot(55, 100, 8)}
${limb('M148,182 Q186,152 184,108', 14)}${dot(185, 100, 8)}
${anonBack(120, 138, 1)}`

const DIP = `
<path d="M0,40 L30,50 L50,42 L84,190 L168,190 L200,54 L220,64 L240,30" stroke="{{tone}}" stroke-width="2.8"/>
<path d="M84,190 L168,190" stroke="{{tone}}" stroke-opacity=".35" stroke-width="10"/>
${stars('M120,20 v8 M116,24 h8 M30,110 v6 M27,113 h6 M214,120 v8 M210,124 h8')}
<path d="M136,38 v14 M150,70 v12 M128,94 v10" stroke="{{dim}}" stroke-width="1.8"/>
<g fill="{{gold}}" fill-opacity=".85" stroke="{{gold}}" stroke-width="1.4"><circle cx="136" cy="62" r="5"/><circle cx="150" cy="92" r="4.5"/><circle cx="128" cy="114" r="4"/></g>
${limb('M100,178 L96,190', 11)}${limb('M112,178 L118,190', 11)}
<path d="M88,188 h12 q3,2 1,5 h-13 Z M112,188 h12 q3,2 1,5 h-13 Z" fill="${B}" stroke="{{ink}}" stroke-width="2"/>
<g fill="{{gold}}" fill-opacity=".85" stroke="{{gold}}" stroke-width="1.4"><circle cx="146" cy="150" r="6"/><circle cx="158" cy="148" r="6"/><circle cx="152" cy="140" r="6"/><circle cx="166" cy="154" r="5"/></g>
${shape('M136,154 H176 L168,178 H142 Z')}
<path d="M144,160 l2,14 M152,160 l1,14 M160,160 l-1,14 M168,160 l-2,14 M138,166 H172" stroke="{{ink}}" stroke-opacity=".55" stroke-width="1.6"/>
<path d="M136,154 L130,146 h-6" stroke="{{ink}}" stroke-width="2.6"/>
<g fill="${B}" stroke="{{ink}}" stroke-width="2.4"><circle cx="148" cy="186" r="4.5"/><circle cx="166" cy="186" r="4.5"/></g>
${shape('M92,180 C88,158 94,142 106,142 C118,142 124,158 120,180 Z')}
<path d="M96,160 l6,6 M95,170 l6,6" stroke="{{dim}}" stroke-width="1.6"/>
${limb('M114,152 Q120,158 126,148', 10)}${dot(126, 146, 4.5)}
${anon(106, 116, 0.74, 'grin', 4)}
`

const SATOSHI = `
<path d="M40,54 v8 M36,58 h8 M206,40 v8 M202,44 h8 M218,120 v6 M215,123 h6" stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.6"/>
<g transform="translate(176,58) rotate(10)">
<path d="M0,0 h30 l8,8 v40 h-38 Z" fill="#1b1d1e" stroke="{{ink}}" stroke-width="2"/>
<path d="M30,0 v8 h8" stroke="{{ink}}" stroke-width="1.6"/>
<path d="M6,16 h24 M6,23 h24 M6,30 h18 M6,37 h22" stroke="{{dim}}" stroke-width="1.6"/>
</g>
<path d="M26,228 C32,186 60,158 92,146 M214,228 C208,186 180,158 148,146" stroke="{{ink}}" stroke-width="2.8"/>
<path d="M46,214 l16,-22 M60,222 l18,-24 M194,222 l-18,-24 M180,214 l-16,-22" stroke="{{dim}}" stroke-width="1.8"/>
<path d="M92,146 C64,126 60,62 88,38 C106,22 134,22 152,38 C180,62 176,126 148,146 C136,160 104,160 92,146 Z" fill="#1b1d1e" stroke="rgba(0,0,0,.35)" stroke-width="6"/>
<path d="M92,146 C64,126 60,62 88,38 C106,22 134,22 152,38 C180,62 176,126 148,146 C136,160 104,160 92,146 Z" stroke="{{ink}}" stroke-width="2.8"/>
<path d="M120,28 C112,38 106,50 104,60 M80,72 C78,98 84,122 96,140 M160,72 C162,98 156,122 144,140" stroke="{{dim}}" stroke-width="1.8"/>
<path d="M101,132 C90,104 94,66 120,58 C146,66 150,104 139,132 C130,142 110,142 101,132 Z" fill="#0c0d0e" stroke="{{ink}}" stroke-width="2.2"/>
<circle cx="110" cy="100" r="2.8" fill="{{tone}}" stroke="{{tone}}"/><circle cx="130" cy="100" r="2.8" fill="{{tone}}" stroke="{{tone}}"/>
<path d="M112,174 v32 M112,174 h11 q9,0 9,8 q0,8 -9,8 h-11 M112,190 h13 q9,0 9,8 q0,8 -9,8 h-13 M116,168 v6 M122,168 v6 M116,206 v6 M122,206 v6" stroke="{{gold}}" stroke-width="2.6"/>`

const SHIBA = `
<path d="M96,174 l6,12 l6,-8 l6,10 l6,-10 l6,8 l6,-12" stroke="{{dim}}" stroke-width="2"/>
<path d="M68,100 L72,38 L106,70 C114,66 126,66 134,70 L168,38 L172,100 C180,126 170,156 148,170 C134,178 106,178 92,170 C70,156 60,126 68,100 Z" fill="#1b1d1e" stroke="rgba(0,0,0,.35)" stroke-width="6"/>
<path d="M68,100 L72,38 L106,70 C114,66 126,66 134,70 L168,38 L172,100 C180,126 170,156 148,170 C134,178 106,178 92,170 C70,156 60,126 68,100 Z" fill="{{gold}}" fill-opacity=".3" stroke="{{ink}}" stroke-width="2.8"/>
<path d="M78,52 L81,88 L99,72 Z M162,52 L159,88 L141,72 Z" fill="{{gold}}" fill-opacity=".35" stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.6"/>
<path d="M76,110 C82,150 102,170 120,170 C138,170 158,150 164,110 C152,122 138,126 120,126 C102,126 88,122 76,110 Z" fill="#efeee6" fill-opacity=".85" stroke="{{ink}}" stroke-width="1.8"/>
<ellipse cx="100" cy="90" rx="5" ry="3" fill="#efeee6" fill-opacity=".85"/><ellipse cx="140" cy="90" rx="5" ry="3" fill="#efeee6" fill-opacity=".85"/>
<path d="M90,105 Q100,96 111,105 Q100,111 90,105 Z M129,105 Q139,96 150,105 Q139,111 129,105 Z" fill="#0c0d0e" stroke="{{ink}}" stroke-width="2.2"/>
<circle cx="106" cy="104.5" r="2.8" fill="{{ink}}"/><circle cx="145" cy="104.5" r="2.8" fill="{{ink}}"/>
<path d="M112,136 Q120,129 128,136 Q120,144 112,136 Z" fill="#1b1d1e" stroke="#1b1d1e" stroke-width="1.6"/>
<path d="M120,142 v6 M120,148 q-7,6 -13,1 M120,148 q7,6 13,1" stroke="#1b1d1e" stroke-width="2.2"/>
<path d="M68,128 l-9,4 l9,3 M172,128 l9,4 l-9,3" stroke="{{dim}}" stroke-width="1.8"/>
<path d="M166,194 l4,14 l4,-10 l4,10 l4,-14 M190,201 m-6,0 a6,6 0 1 0 12,0 a6,6 0 1 0 -12,0 M200,194 l4,14 l4,-10 l4,10 l4,-14" stroke="{{gold}}" stroke-width="2.4"/>
<path d="M30,52 v8 M26,56 h8 M206,72 v6 M203,75 h6 M40,180 v6 M37,183 h6" stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.6"/>`

const BEAR = `
<path d="M10,40 L40,58 L60,50 L92,84 L110,78 L150,128 L176,122 L226,196" stroke="{{tone}}" stroke-width="2.6"/>
<path d="M210,198 L228,198 L226,180" stroke="{{tone}}" stroke-width="2.6"/>
${shape('M66,232 C58,184 72,146 120,142 C168,146 182,184 174,232 Z')}
<path d="M92,232 C90,196 102,178 120,176 C138,178 150,196 148,232" stroke="{{ink}}" stroke-opacity=".5" stroke-width="2"/>
<path d="M76,182 l8,6 M74,198 l8,6 M72,214 l8,6 M164,182 l-8,6 M166,198 l-8,6 M168,214 l-8,6 M112,196 l4,6 M124,206 l4,6 M114,218 l4,6" stroke="{{dim}}" stroke-width="1.6"/>
${limb('M82,160 Q44,152 46,104', 22)}${limb('M158,160 Q196,152 194,104', 22)}
<g fill="${B}" stroke="{{ink}}" stroke-width="2.6"><circle cx="45" cy="94" r="13"/><circle cx="195" cy="94" r="13"/></g>
<path d="M35,82 l-4,-9 M44,80 l-1,-10 M53,82 l3,-9 M205,82 l4,-9 M196,80 l1,-10 M187,82 l-3,-9" stroke="{{ink}}" stroke-width="2.4"/>
<g fill="${B}" stroke="{{ink}}" stroke-width="2.6"><circle cx="92" cy="64" r="13"/><circle cx="148" cy="64" r="13"/></g>
<circle cx="92" cy="64" r="6" stroke="{{ink}}" stroke-opacity=".5" stroke-width="2"/><circle cx="148" cy="64" r="6" stroke="{{ink}}" stroke-opacity=".5" stroke-width="2"/>
${shape('M84,94 C82,64 158,64 156,94 C160,122 146,140 120,142 C94,140 80,122 84,94 Z')}
<path d="M88,88 l-6,-6 M86,102 l-8,-4 M152,88 l6,-6 M154,102 l8,-4" stroke="{{dim}}" stroke-width="1.8"/>
<path d="M98,86 L114,94 M142,86 L126,94" stroke="{{ink}}" stroke-width="2.8"/>
<circle cx="108" cy="100" r="3.4" fill="{{ink}}"/><circle cx="132" cy="100" r="3.4" fill="{{ink}}"/>
<ellipse cx="120" cy="120" rx="19" ry="15" fill="${B}" stroke="{{ink}}" stroke-width="2.4"/>
<path d="M112,110 Q120,104 128,110 Q120,117 112,110 Z" fill="{{ink}}" stroke="{{ink}}" stroke-width="1.6"/>
<path d="M107,121 Q120,140 133,121 Z" fill="${VOID}" stroke="{{ink}}" stroke-width="2"/>
<path d="M110,122 l2,5 l2,-5 M126,122 l2,5 l2,-5" fill="{{ink}}" stroke="{{ink}}" stroke-width="1.4"/>`

const RAMEN = `
<path d="M168,20 L184,32 L194,26 L210,46 L226,58" stroke="{{tone}}" stroke-width="2.2"/><path d="M214,59 L227,59 L225,46" stroke="{{tone}}" stroke-width="2.2"/>
${stars('M30,40 v8 M26,44 h8 M210,110 v6 M207,113 h6')}
${hoodie(114, 132)}
${anon(110, 100, 1, 'sad')}
${limb('M74,196 L86,208 L96,198', 13)}
${shape('M92,158 L150,158 L143,216 L99,216 Z')}
<path d="M95,176 H147 M96,186 H146" stroke="{{tone}}" stroke-width="2.4"/>
<path d="M108,200 q6,-5 12,0 q6,5 12,0" stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.8"/>
${dot(96, 196, 7)}
<ellipse cx="121" cy="158" rx="29" ry="5" fill="${VOID}" stroke="{{ink}}" stroke-width="2.2"/>
<path d="M102,158 q4,-4 8,0 q4,-4 8,0 q4,-4 8,0 q4,-4 8,0 q4,-4 8,0" stroke="{{gold}}" stroke-opacity=".8" stroke-width="1.8"/>
<path d="M104,148 q-6,-8 0,-14 q6,-6 0,-14 M142,148 q-6,-8 0,-14 q6,-6 0,-14" stroke="{{dim}}" stroke-width="2"/>
${limb('M166,198 L178,176 L168,154', 13)}
<path d="M176,140 L118,124 M178,148 L120,136" stroke="${WOOD}" stroke-width="3"/>
<path d="M121,128 q-5,7 0,13 q5,7 0,15 M127,134 q-4,6 0,11 q4,6 0,10" stroke="{{gold}}" stroke-width="2"/>
${dot(168, 148, 7)}`

const RIP = `
<path d="M8,204 Q70,196 128,202 T236,200" stroke="{{ink}}" stroke-opacity=".7" stroke-width="2.4"/>
${shape('M52,202 L52,88 C52,40 144,40 144,88 L144,200 Z')}
<path d="M60,196 L60,92 C60,54 136,54 136,92" stroke="{{dim}}" stroke-width="1.6"/>
<path d="M74,96 L74,130 M74,96 Q92,96 92,106 Q92,115 74,115 L92,130 M102,96 L102,130 M112,96 L112,130 M112,96 Q130,96 130,106 Q130,116 112,116" stroke="{{ink}}" stroke-width="3"/>
<path d="M74,148 L122,148" stroke="{{tone}}" stroke-width="2.4"/>
<path d="M82,160 L114,160 M88,170 L108,170" stroke="{{dim}}" stroke-width="2"/>
<path d="M130,62 l-6,14 l8,8 l-6,12" stroke="{{ink}}" stroke-opacity=".6" stroke-width="1.8"/>
<path d="M36,203 l4,-12 l3,12 l4,-14 l3,14 M148,201 l3,-10 l3,10 l4,-13 l3,13 M12,205 l3,-9 l3,9 M210,201 l3,-9 l3,9" stroke="{{tone}}" stroke-width="2"/>
<path d="M176,200 v-22 M176,180 c-8,-2 -10,-10 -4,-14 c4,4 6,8 4,14 c2,-6 8,-10 12,-6 c-2,6 -6,8 -12,6" stroke="{{tone}}" stroke-width="2"/>
<path d="M146,124 q8,-6 16,0 q6,4 10,-2" stroke="{{dim}}" stroke-width="1.8" stroke-dasharray="3 5"/>
<ellipse cx="190" cy="48" rx="15" ry="4.5" stroke="{{gold}}" stroke-width="2.4"/>
${shape('M166,96 C164,58 216,58 214,96 L214,128 l-8,-7 l-8,7 l-8,-7 l-8,7 l-8,-7 l-8,7 Z', '{{ink}}', 0.14)}
<path d="M176,66 q4,-10 12,-6 q6,-8 14,2" stroke="{{ink}}" stroke-width="2"/>
<g fill="${VOID}" stroke="{{ink}}" stroke-width="1.8"><ellipse cx="182" cy="90" rx="3.5" ry="5"/><ellipse cx="198" cy="90" rx="3.5" ry="5"/><ellipse cx="190" cy="108" rx="4" ry="5"/></g>`

export const SHARE_ARTS: ShareArt[] = [
  { id: 'rocket', label: 'Rocket', body: ROCKET },
  { id: 'moon', label: 'Moon landing', body: MOON },
  { id: 'lambo', label: 'Lambo', body: LAMBO },
  { id: 'bull', label: 'Bull', body: BULL },
  { id: 'pump', label: '3 AM pump', body: PUMP },
  { id: 'dip', label: 'Buy the dip', body: DIP },
  { id: 'satoshi', label: 'Satoshi', body: SATOSHI },
  { id: 'shiba', label: 'Wow', body: SHIBA },
  { id: 'bear', label: 'Bear', body: BEAR },
  { id: 'ramen', label: 'Ramen again', body: RAMEN },
  { id: 'rip', label: 'RIP', body: RIP },
]

const BY_ID = new Map(SHARE_ARTS.map((a) => [a.id, a]))

export const defaultArt = (roi: number, liquidated: boolean): ArtId => (liquidated ? 'rip' : roi < 0 ? 'ramen' : 'rocket')

/** `mono` drops all colour, for drawing the art faded behind a chart. */
export function artSvg(id: ArtId, tone: string, uid: string, w = 240, h = 230, mono = false): string | null {
  const art = id === 'none' ? null : BY_ID.get(id)
  if (!art) return null
  const gold = chalkYellow()
  const fill = (s: string) => s.split('{{tone}}').join(tone).split('{{ink}}').join(INK).split('{{dim}}').join(DIM).split('{{gold}}').join(gold)
  // Inline SVGs share one id namespace, so each instance gets its own filter id.
  const f = `bbChalk-${uid}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 230" width="${w}" height="${h}"><defs><filter id="${f}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="2.2"/>${mono ? '<feColorMatrix type="saturate" values="0"/>' : ''}</filter></defs><g filter="url(#${f})" fill="none" stroke-linecap="round" stroke-linejoin="round">${fill(art.body)}</g></svg>`
}
