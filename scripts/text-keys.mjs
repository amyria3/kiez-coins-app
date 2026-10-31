// Sammelt alle deutschen Texte aus dem Code (Schlüssel für t(), Übersetzungen und das Texte-CMS).
// Genutzt von scripts/i18n.mjs und scripts/app-texts.mjs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

export async function collectKeys() {
  const root = new URL('..', import.meta.url).pathname;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  const walk = (d) =>
    readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : [];
    });
  const skipFile = (f) => /data\/(sample|texts)\.ts$|icons\/|i18n\//.test(f);

  const keys = new Map(); // Text → erster Fundort
  const all = new Map(); // Text → alle Fundorte (scripts/text-pages.mjs)
  const add = (text, where) => {
    const k = norm(text);
    if (!k || !/[A-Za-zÄÖÜäöüß]/.test(k)) return;
    if (!keys.has(k)) keys.set(k, where);
    if (!all.has(k)) all.set(k, new Set());
    all.get(k).add(where);
  };
  const looksText = (s) => {
    const v = s.trim();
    if (!/[a-zäöüß]{2,}|^[A-ZÄÖÜ][a-zäöüß]/.test(v)) return false;
    if (/^[\/.#@]|^https?:|^\w+:\/\/|_|\.(png|svg|jpe?g|json|tsx?)$|^[a-z]+([A-Z][a-z]*)+$|^[A-Z][a-z]+[A-Z]\w*$/.test(v)) return false;
    if (/^[a-z][a-z0-9-]*$/.test(v) || /^rgba?\(|^use[A-Z]|muss innerhalb|nur innerhalb/.test(v)) return false; // Bezeichner, Farben, Fehler für Entwickler
    return /\s/.test(v) || /^[A-ZÄÖÜ][a-zäöüß.:!?…-]+$/.test(v) || /^[A-ZÄÖÜ][a-zäöüß]*-[A-ZÄÖÜ]?[a-zäöüß]+$/.test(v) || /^\d+ \w/.test(v);
  };
  const SKIP_CALLS = /(^|\.)(require|push|replace|navigate|dismissTo|from|select|eq|neq|in|rpc|order|getItem|setItem|removeItem|includes|startsWith|endsWith|split|join|test|match|log|warn|error|useFonts|addEventListener|Error)$/;
  const SKIP_ATTRS = /^(style|key|testID|name|icon|variant|mood|status|navigation|tone|accessibilityRole|autoCapitalize|keyboardType|returnKeyType|textContentType|autoComplete|presentation|source|href|contentFit|resizeMode|pathname)$/;

  for (const file of walk(join(root, 'src')).filter((f) => !skipFile(f))) {
    const where = relative(root, file);
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n) => {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
      if (ts.isJsxText(n)) add(n.text, where);
      if (ts.isCallExpression(n) && /^(t|tx|lookup)$/.test(n.expression.getText(sf)) && n.arguments[0]) {
        // Erstes Argument: Text oder Fallunterscheidung aus Texten
        const collect = (e) => {
          if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) add(e.text, where);
          else if (ts.isConditionalExpression(e)) (collect(e.whenTrue), collect(e.whenFalse));
          else if (ts.isParenthesizedExpression(e)) collect(e.expression);
        };
        collect(n.arguments[0]);
      }
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const p = n.parent;
        const skipped =
          (ts.isCallExpression(p) && SKIP_CALLS.test(p.expression.getText(sf))) ||
          (ts.isJsxAttribute(p) && SKIP_ATTRS.test(p.name.getText(sf))) ||
          (ts.isPropertyAssignment(p) && (p.name === n || /^(key|icon|kind|type|mode|status|method|reason|href|pathname|code|variant|fontFamily)$/.test(p.name.getText(sf)))) ||
          (ts.isBinaryExpression(p) && /===|!==|==|!=/.test(p.operatorToken.getText(sf))) ||
          ts.isLiteralTypeNode(p) ||
          ts.isElementAccessExpression(p) ||
          ts.isCaseClause(p);
        // `label` ist immer sichtbarer Text, auch als einzelnes kleines Wort („er“, „sie“ in src/data/format.ts)
        const isLabel = ts.isPropertyAssignment(p) && p.initializer === n && p.name.getText(sf) === 'label';
        if (!skipped && (isLabel || looksText(n.text))) add(n.text, where);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  // Sprüche des Katers (StartKater, Website /kater)
  {
    const file = 'src/data/kater-sprueche.json';
    const data = JSON.parse(readFileSync(join(root, file), 'utf8'));
    for (const [k, v] of Object.entries(data)) if (!k.startsWith('_') && Array.isArray(v)) for (const e of v) add(typeof e === 'string' ? e : e.text, file);
  }

  // Rechtstexte
  {
    const file = join(root, 'src/data/legal.ts');
    const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const { LEGAL_STAND, legalDocIds, legalDocs } = await import(`data:text/javascript,${encodeURIComponent(js)}`);
    add(`Stand ${LEGAL_STAND}`, 'src/data/legal.ts');
    for (const id of legalDocIds) {
      const doc = legalDocs[id];
      for (const s of [doc.title, doc.intro, ...doc.sections.flatMap((x) => [x.heading, ...x.paragraphs])]) if (s) add(s, `src/data/legal.ts (${doc.title})`);
    }
  }

  keys.all = all;
  return keys;
}
