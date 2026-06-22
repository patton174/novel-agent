#!/usr/bin/env node
/**
 * MJML → agent-common-mail/src/main/resources/mail/*.html
 * 占位符 __key__ 保留到运行时，由 Java EmailTemplateRenderer 注入（含品牌动态样式）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mjml2html from 'mjml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src', 'emails');
const partialsDir = path.join(root, 'src', 'partials');
const outDirs = [
  path.join(root, '..', 'src', 'main', 'resources', 'mail'),
  path.join(root, '..', '..', '..', '..', '..', 'novel-studio', 'studio-platform', 'studio-platform-mail', 'src', 'main', 'resources', 'mail'),
];

function listMjmlEmails() {
  return fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith('.mjml'))
    .map((f) => f.replace(/\.mjml$/, ''));
}

function compileOne(name) {
  const mjmlPath = path.join(srcDir, `${name}.mjml`);
  const txtPath = path.join(srcDir, `${name}.txt`);
  const mjmlSource = fs.readFileSync(mjmlPath, 'utf8');

  const { html, errors } = mjml2html(mjmlSource, {
    filePath: mjmlPath,
    validationLevel: 'soft',
    minify: false,
  });

  if (errors?.length) {
    for (const err of errors) {
      console.warn(`[mjml:${name}] ${err.formattedMessage ?? err.message}`);
    }
  }

  for (const outDir of outDirs) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${name}.html`), html, 'utf8');

    if (fs.existsSync(txtPath)) {
      fs.copyFileSync(txtPath, path.join(outDir, `${name}.txt`));
    }

    console.log(`[mjml] ${name} → ${path.relative(root, outDir)}/${name}.html`);
  }
}

for (const outDir of outDirs) {
  fs.mkdirSync(outDir, { recursive: true });
}

if (!fs.existsSync(partialsDir)) {
  fs.mkdirSync(partialsDir, { recursive: true });
}

for (const name of listMjmlEmails()) {
  compileOne(name);
}

console.log('[mjml] done');
