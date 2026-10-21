// Illustrationen für die Startseite (kiezcoins.de): drei Figuren und drei Kartenbilder für den Prototyp.
// Stil wie Kater und Coins aus Figma: kräftige Flächen, helle Kontur, leicht zittrige Linie.
// Das Zittern kommt vom Filter `kc-wobble`, den `filterDefs` einmal pro Seite anlegt.

const LINE = '#F0F0F0';
const DARK = '#1F2123';

/** Einmal pro Seite: Filter für die handgezeichnete Linie. */
export const filterDefs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<filter id="kc-wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
</defs></svg>`;

const g = (body) =>
  `<g filter="url(#kc-wobble)" stroke="${LINE}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${body}</g>`;
const dot = (x, y, r = 2.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${DARK}" stroke="none"/>`;
const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.5" fill="#FF7E8B" opacity=".35" stroke="none"/>`;
const fig = (label, body) =>
  `<svg class="figur" viewBox="0 56 220 226" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${g(body)}</svg>`;

// Nachbarin mit Dutt, Brille, Strickjacke und Gießkanne
const nachbarin = fig(
  'Illustration: Nachbarin mit Brille und Gießkanne',
  `<path d="M40 282 C42 226 60 194 110 188 C160 194 178 226 180 282 Z" fill="#FFAD7E"/>
<path d="M92 190 L110 222 L128 190" fill="${LINE}"/>
${dot(110, 238, 2.8)}${dot(110, 258, 2.8)}
<path d="M97 168 L97 192 Q110 198 123 192 L123 168" fill="#F2C9A5"/>
<circle cx="110" cy="78" r="16" fill="#A0A0A0"/>
<ellipse cx="110" cy="136" rx="37" ry="41" fill="#F2C9A5"/>
<path d="M73 134 C68 100 90 92 110 93 C130 92 152 100 147 134 C140 114 126 106 110 108 C94 106 80 114 73 134 Z" fill="#A0A0A0"/>
<circle cx="95" cy="140" r="11" fill="none"/><circle cx="125" cy="140" r="11" fill="none"/><path d="M106 139 L114 139" fill="none"/>
${dot(96, 141)}${dot(124, 141)}${blush(86, 156)}${blush(134, 156)}
<path d="M101 162 Q110 170 119 162" fill="none"/>
<path d="M150 232 C160 222 170 222 176 232" fill="none"/>
<rect x="150" y="228" width="44" height="36" rx="6" fill="#93F4A7"/>
<path d="M194 236 L214 214 L218 220" fill="none"/>
<path d="M156 228 C158 210 186 210 188 228" fill="none"/>
<circle cx="152" cy="242" r="9" fill="#F2C9A5"/>`,
);

// Junger Mann mit Mütze und Kapuzenpulli, das Handy in der Hand
const muetze = fig(
  'Illustration: junger Mann mit Mütze und Handy',
  `<path d="M38 282 C40 224 60 192 110 186 C160 192 180 224 182 282 Z" fill="#7E94FF"/>
<path d="M74 196 C80 214 140 214 146 196" fill="none"/>
<path d="M100 206 L98 236 M120 206 L122 236" fill="none"/>
<path d="M97 166 L97 190 Q110 196 123 190 L123 166" fill="#8D5A3B"/>
<ellipse cx="110" cy="136" rx="36" ry="40" fill="#8D5A3B"/>
<path d="M75 146 C76 184 144 184 145 146 C138 166 124 172 110 172 C96 172 82 166 75 146 Z" fill="#3A2A22"/>
<path d="M72 124 C70 88 92 78 110 78 C130 78 150 88 148 124 Z" fill="#93F4A7"/>
<path d="M70 122 L150 122 L150 132 L70 132 Z" fill="#93F4A7"/>
<path d="M88 92 L88 120 M100 86 L100 120 M112 84 L112 120 M124 86 L124 120 M136 92 L136 120" fill="none" stroke-width="1.6"/>
<path d="M88 142 L102 140 M118 138 L132 134" fill="none"/>
${dot(96, 150)}${dot(124, 148)}
<path d="M100 158 Q111 165 121 157" fill="none"/>
<rect x="126" y="214" width="30" height="50" rx="7" fill="${DARK}" transform="rotate(-8 141 239)"/>
<rect x="131" y="220" width="20" height="34" rx="3" fill="#7E94FF" opacity=".55" stroke="none" transform="rotate(-8 141 239)"/>
<circle cx="138" cy="258" r="10" fill="#8D5A3B"/>`,
);

// Person mit pinken Locken, Jacke, Jutebeutel und Ohrring
const locken = fig(
  'Illustration: Person mit pinken Locken und Jutebeutel',
  `<path d="M40 282 C42 226 60 194 110 188 C160 194 178 226 180 282 Z" fill="#2B2D31"/>
<path d="M88 192 L104 230 L110 196 L116 230 L132 192" fill="#2B2D31"/>
<path d="M66 204 L150 282" fill="none" stroke-width="3.4"/>
<circle cx="146" cy="232" r="9" fill="#FFAD7E"/><path d="M141 232 L151 232 M146 227 L146 237" fill="none" stroke="${DARK}" stroke-width="2"/>
<path d="M97 168 L97 192 Q110 198 123 192 L123 168" fill="#C68B5E"/>
<g fill="#FFB2E5">
<circle cx="80" cy="128" r="16"/><circle cx="140" cy="128" r="16"/><circle cx="84" cy="102" r="17"/><circle cx="136" cy="102" r="17"/>
<circle cx="100" cy="86" r="18"/><circle cx="122" cy="86" r="18"/><circle cx="110" cy="96" r="18"/>
</g>
<ellipse cx="110" cy="140" rx="34" ry="38" fill="#C68B5E"/>
<path d="M80 124 C84 106 100 102 110 112 C120 102 136 106 140 124 C130 116 120 118 110 122 C100 118 90 116 80 124 Z" fill="#FFB2E5"/>
<circle cx="76" cy="158" r="6" fill="none" stroke="#FFAD7E" stroke-width="2.4"/>
<path d="M92 138 Q97 133 102 138 M118 138 Q123 133 128 138" fill="none"/>
${blush(90, 154)}${blush(130, 154)}
<path d="M98 160 Q110 174 122 160 Z" fill="${LINE}"/>`,
);

export const figuren = { nachbarin, muetze, locken };

// Kartenbilder: Format wie die Fotos in der App (Querformat, wird mit object-fit gefüllt)
const scene = (label, bg, body) =>
  `<svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><rect width="360" height="300" fill="${bg}"/>${g(body)}</svg>`;

const igel = scene(
  'Igelhaus im Hinterhof',
  '#33413A',
  `<path d="M-10 214 C80 200 260 206 370 216 L370 310 L-10 310 Z" fill="#4E6B52"/>
<path d="M120 214 L120 150 L180 112 L240 150 L240 214 Z" fill="#B9774B"/>
<path d="M110 156 L180 106 L250 156" fill="none" stroke-width="5"/>
<path d="M162 214 C162 186 198 186 198 214 Z" fill="${DARK}"/>
<path d="M136 170 L224 170 M136 190 L156 190 M204 190 L224 190" fill="none" stroke-width="1.6"/>
<g stroke-width="2"><ellipse cx="70" cy="230" rx="12" ry="6" fill="#FFAD7E" transform="rotate(-20 70 230)"/><ellipse cx="290" cy="236" rx="12" ry="6" fill="#FF7E8B" transform="rotate(25 290 236)"/><ellipse cx="96" cy="250" rx="11" ry="5" fill="#FFC500" transform="rotate(10 96 250)"/><ellipse cx="262" cy="258" rx="12" ry="6" fill="#FFAD7E" transform="rotate(-35 262 258)"/><ellipse cx="320" cy="214" rx="10" ry="5" fill="#FFC500" transform="rotate(15 320 214)"/></g>
<path d="M232 252 C230 220 260 206 286 214 C300 218 314 232 318 250 Z" fill="#A0A0A0"/>
<path d="M240 230 L234 222 M252 220 L250 210 M266 214 L268 204 M282 214 L288 206 M296 222 L304 216 M306 234 L314 230" fill="none" stroke-width="2"/>
<path d="M318 250 C330 248 336 240 330 234 C324 230 318 236 312 238" fill="#C9A27E"/>
${dot(320, 240, 2.4)}${dot(333, 238, 2)}`,
);

const muell = scene(
  'Grünstreifen mit Flaschen und Verpackungen',
  '#2E3440',
  `<path d="M-10 150 L370 150 L370 170 L-10 170 Z" fill="#A0A0A0"/>
<path d="M-10 170 C60 160 300 164 370 172 L370 310 L-10 310 Z" fill="#4E6B52"/>
<path d="M20 172 L26 154 L32 172 M70 176 L78 156 L84 176 M300 176 L306 158 L312 176 M330 172 L336 156 L340 172" fill="none" stroke-width="2"/>
<g transform="rotate(-70 110 236)"><rect x="96" y="210" width="28" height="56" rx="8" fill="#93F4A7" opacity=".9"/><rect x="104" y="196" width="12" height="16" rx="3" fill="#93F4A7"/></g>
<g transform="rotate(20 214 222)"><rect x="202" y="198" width="24" height="50" rx="7" fill="${LINE}" opacity=".85"/><rect x="208" y="186" width="12" height="14" rx="3" fill="${LINE}"/></g>
<path d="M248 258 L292 246 L300 274 L256 284 Z" fill="#FFB2E5"/>
<path d="M258 262 L288 254" fill="none" stroke="${DARK}" stroke-width="2"/>
<rect x="150" y="256" width="34" height="24" rx="4" fill="#FFAD7E" transform="rotate(12 167 268)"/>
<circle cx="60" cy="60" r="18" fill="#FFE99E" stroke="none" opacity=".9"/>`,
);

const tonnen = scene(
  'Drei Mülltonnen vor einer Hauswand',
  '#3A3340',
  `<path d="M-10 228 L370 228 L370 310 L-10 310 Z" fill="#A0A0A0"/>
<path d="M30 40 L90 40 L90 110 L30 110 Z M270 40 L330 40 L330 110 L270 110 Z" fill="#2B2D31"/>
<path d="M60 40 L60 110 M30 75 L90 75 M300 40 L300 110 M270 75 L330 75" fill="none" stroke-width="1.6"/>
<path d="M58 238 L66 136 L122 136 L130 238 Z" fill="#4A4D55"/>
<path d="M52 136 L136 136 L134 120 L54 120 Z" fill="#4A4D55"/>
<path d="M140 238 L148 136 L204 136 L212 238 Z" fill="#7E94FF"/>
<path d="M134 136 L218 136 L216 120 L136 120 Z" fill="#7E94FF"/>
<path d="M222 238 L230 136 L286 136 L294 238 Z" fill="#FFC500"/>
<path d="M216 136 L300 136 L298 120 L218 120 Z" fill="#FFC500"/>
<circle cx="74" cy="242" r="8" fill="${DARK}"/><circle cx="196" cy="242" r="8" fill="${DARK}"/><circle cx="278" cy="242" r="8" fill="${DARK}"/>`,
);

export const kartenbilder = { igel, muell, tonnen };
