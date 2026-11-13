'use strict';

// npm install --no-save --package-lock=false typescript@5.9.3
// node tools/localize.cjs extract|build|check
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const ts = require('typescript');

process.chdir(path.join(__dirname, '..'));
const action = process.argv[2];
const languages = ['en'];
const arabic = /\p{Script=Arabic}/u;
const phrases = new Set();
const missing = new Set();
const sourceFiles = fs.readdirSync('.').filter(name =>
  /\.(html|js|webmanifest)$/.test(name) &&
  !['audio-index.js', 'cloud-state.js', 'hz-data.js', 'pinyin-data.js', 'stroke-order.js', 'sfx.js', 'sw.js', 'test.html'].includes(name)
);
const scripts = new Set(sourceFiles.filter(name => name.endsWith('.js')));
const textAttributes = /\b(title|alt|aria-label|placeholder|content)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
let translations;
let locale;

const marker = /(__LOCALIZE_EXPR_\d+__)/g;

function phrase(value) {
  if (!arabic.test(value)) return value;
  if (value.includes('__LOCALIZE_EXPR_')) {
    return value.split(marker).map((part, i) => i % 2 ? part : phrase(part)).join('');
  }
  return value.replace(/[^\r\n]+/g, line => {
    const core = line.trim();
    if (!arabic.test(core)) return line;
    phrases.add(core);
    if (!translations) return line;
    if (!Object.hasOwn(translations, core)) {
      missing.add(core);
      return line;
    }
    return line.replace(core, () => translations[core].replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))));
  });
}

function markup(value) {
  if (!arabic.test(value)) return value;
  return value.split(/(<!--[\s\S]*?-->|<\/?[a-z][\w:-]*(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\s*\/?>|<\/?[a-z][\w:-]*[^<>]*$)/gi)
    .map((chunk, index) => index % 2 === 0 ? phrase(chunk) :
      chunk.replace(textAttributes, (attribute, name, double, single) => {
        const quote = double === undefined ? "'" : '"';
        const original = double ?? single;
        const localized = phrase(original);
        if (original === localized) return attribute;
        const escaped = quote === '"' ? localized.replace(/"/g, '&quot;') : localized.replace(/'/g, '&#39;');
        return name + '=' + quote + escaped + quote;
      })).join('');
}

function editsApplied(source, edits) {
  const parts = [];
  let last = 0;
  for (const [start, end, value] of edits) {
    parts.push(source.slice(last, start), value);
    last = end;
  }
  return parts.join('') + source.slice(last);
}

function script(source, name) {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) throw Error('JavaScript syntax error in ' + name);
  const edits = [];
  const templateParts = new Map();
  function visit(node) {
    if (ts.isTemplateExpression(node)) {
      const parts = [node.head, ...node.templateSpans.map(span => span.literal)];
      const template = parts.map((part, i) => (i ? '__LOCALIZE_EXPR_' + i + '__' : '') + part.text).join('');
      const localized = markup(template).split(marker).filter((_, i) => i % 2 === 0);
      if (localized.length !== parts.length) throw Error('Lost template expressions in ' + name);
      parts.forEach((part, i) => templateParts.set(part, localized[i]));
    }
    if (ts.isVariableDeclaration(node) && ['AR_PINYIN', 'T_STOP'].includes(node.name.getText(file))) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      // Property names and lookup IDs are part of the data contract.
      if (node.parent.name === node || ts.isElementAccessExpression(node.parent)) return;
      if (node.text === 'مرحبًا' && node.parent.getText(file).startsWith("neuralSrc('ar'")) return;
      const localized = templateParts.get(node) ?? markup(node.text);
      if (localized !== node.text) {
        let replacement = JSON.stringify(localized);
        if (!ts.isStringLiteral(node)) {
          const start = ts.isTemplateMiddle(node) || ts.isTemplateTail(node) ? '}' : '`';
          const end = ts.isTemplateHead(node) || ts.isTemplateMiddle(node) ? '${' : '`';
          replacement = start + replacement.slice(1, -1).replace(/[`]/g, '\\`').replace(/\$\{/g, '\\${') + end;
        }
        edits.push([node.getStart(file), node.end, replacement]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  const result = editsApplied(source, edits);
  if (ts.createSourceFile(name, result, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS).parseDiagnostics.length) {
    throw Error('Localized JavaScript syntax error in ' + name);
  }
  return result;
}

const labels = {
  ar: ['العربية', 'لغة الموقع'], en: ['English', 'Site language']
};
const urls = { ar: '/', en: '/en/' };
function languageMenu(page) {
  const links = Object.keys(urls).map(lang =>
    '<a href="' + urls[lang] + (page === 'privacy.html' ? page : '') + '" lang="' + lang + '" hreflang="' + lang + '"' +
    (lang === locale ? ' aria-current="page"' : '') + '>' + labels[lang][0] + '</a>'
  ).join('');
  return '<div class="site-language" role="group" aria-label="' + labels[locale][1] + '">' + links + '</div>';
}

function html(source, name, versions) {
  const special = /(<(?:script|style)\b[^>]*>)([\s\S]*?)(<\/(?:script|style)>)/gi;
  let last = 0;
  let result = '';
  for (const match of source.matchAll(special)) {
    let [, open, code, close] = match;
    result += markup(source.slice(last, match.index));
    if (/^<script/i.test(open)) {
      code = script(code, name + '.js');
      open = open.replace(/(\bsrc=["'])\/?([^"'/]+\.js)(\?[^"']*)?(?=["'])/i, (attr, prefix, file, query) =>
        scripts.has(file) ? prefix + '/' + locale + '/' + file + '?v=' + versions.get(file) : prefix + '/' + file + (query || '')
      );
    }
    result += open + code + close;
    last = match.index + match[0].length;
  }
  result += markup(source.slice(last));
  if (locale === 'ar') return result;
  result = result
    .replace('<html lang="ar" dir="rtl">', '<html lang="' + locale + '" dir="ltr">')
    .replace('<head>', '<head>\n<base href="/">')
    .replace(/(<link rel="canonical" href="[^"]*?)("\s*>)/, '$1' + locale + '/$2')
    .replace('href="privacy.html"', 'href="/' + locale + '/privacy.html"')
    .replace(/<div class="en"[^>]*>[\s\S]*?<\/div>/, '')
    .replace('href="manifest.webmanifest"', 'href="/' + locale + '/manifest.webmanifest"');
  return result;
}

function json(value) {
  if (typeof value === 'string') return markup(value);
  if (Array.isArray(value)) return value.map(json);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, json(item)])
  );
  return value;
}

function build(language) {
  locale = language;
  const read = name => fs.readFileSync(name, 'utf8').replace(/\r\n/g, '\n');
  const outputs = new Map([...scripts].map(name => [name, script(read(name), name)]));
  const versions = new Map([...outputs].map(([name, output]) => [
    name, createHash('sha256').update(output).digest('hex').slice(0, 12)
  ]));
  for (const name of sourceFiles) {
    const source = read(name);
    let output;
    if (name.endsWith('.html')) {
      output = html(source, name, versions).replace(
        /<!-- language-menu -->[\s\S]*?<!-- \/language-menu -->/,
        '<!-- language-menu -->' + languageMenu(name) + '<!-- /language-menu -->'
      );
    } else if (name.endsWith('.webmanifest')) {
      const manifest = json(JSON.parse(source));
      manifest.lang = locale;
      manifest.dir = 'ltr';
      manifest.id = '/' + locale + '/';
      manifest.start_url = '/' + locale + '/';
      manifest.scope = '/';
      manifest.icons.forEach(icon => { icon.src = '/' + icon.src.replace(/^\.\//, ''); });
      output = JSON.stringify(manifest, null, 2) + '\n';
    } else {
      output = outputs.get(name);
    }
    if (action === 'extract') continue;
    const target = path.join(locale, name);
    if (action === 'check') {
      if (!fs.existsSync(target) || read(target) !== output) {
        throw Error('Run localization build to update ' + target);
      }
    } else {
      fs.mkdirSync(locale, { recursive: true });
      fs.writeFileSync(target, output);
    }
  }
}

if (action === 'extract') {
  build('ar');
  process.stdout.write(JSON.stringify([...phrases].sort()));
} else if (action === 'build' || action === 'check') {
  for (const language of languages) {
    translations = JSON.parse(fs.readFileSync('locales/' + language + '.json', 'utf8'));
    build(language);
  }
  if (missing.size) {
    const message = 'Missing translations: ' + [...missing].join('\n');
    if (process.argv.includes('--allow-untranslated')) process.stderr.write(message + '\n');
    else throw Error(message);
  }
} else {
  throw Error('Expected extract, build or check');
}
