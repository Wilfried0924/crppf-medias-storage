// Génère le fichier files.json à partir d'une source DRY (files.src.json)
// Usage:
//   node tools/generate-files-json.js          -> écrit files.json
//   node tools/generate-files-json.js --check  -> vérifie que files.json est à jour (exit 1 si différent)

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcPath = path.join(root, 'files.src.json');
const outPath = path.join(root, 'files.json');

function buildUrl(baseUrl, remotePath, fileBase, ext) {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const trimmedPath = remotePath.replace(/^\/+|\/+$/g, '');
  return `${trimmedBase}/${trimmedPath}/${fileBase}.${ext}`;
}

function generate() {
  const srcRaw = fs.readFileSync(srcPath, 'utf-8');
  const src = JSON.parse(srcRaw);

  const baseUrl = src.baseUrl;
  const out = {};

  for (const year of Object.keys(src.years)) {
    const yearCfg = src.years[year];
    out[year] = {};
    for (const category of Object.keys(yearCfg)) {
      const cfg = yearCfg[category];
      const files = cfg.files || [];
      if (!Array.isArray(files) || files.length === 0) {
        out[year][category] = [];
        continue;
      }
      const urls = files.map((fileBase) => buildUrl(baseUrl, cfg.remotePath, fileBase, cfg.ext));
      out[year][category] = urls;
    }
    // Catégories connues : s'assurer qu'elles existent au moins vides pour stabilité du schéma
    for (const known of ['messages', 'prieres', 'syntheses', 'temoignages']) {
      if (!(known in out[year])) out[year][known] = [];
    }
  }

  return out;
}

function writeOut(obj) {
  const content = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(outPath, content, 'utf-8');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const generated = generate();

  if (args.has('--check')) {
    if (!fs.existsSync(outPath)) {
      console.error('files.json manquant. Lancez la génération.');
      process.exit(1);
    }
    const current = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    const a = JSON.stringify(current, null, 2);
    const b = JSON.stringify(generated, null, 2);
    if (a !== b) {
      console.error("files.json n'est pas à jour avec files.src.json");
      process.exit(1);
    }
    console.log('OK: files.json est à jour.');
    return;
  }

  writeOut(generated);
  console.log(`Généré: ${path.relative(root, outPath)}`);
}

main();
