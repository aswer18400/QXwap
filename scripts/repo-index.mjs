#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'agent-index');
const ignoreDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.cache', '.local', '.expo', '.next', 'docs/agent-index']);
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.sql', '.yml', '.yaml', '.toml', '.txt', '.sh']);

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function shouldSkip(relativePath) {
  return relativePath.split('/').some((part) => ignoreDirs.has(part));
}

function isText(file) {
  const base = path.basename(file);
  const ext = path.extname(file).toLowerCase();
  return textExtensions.has(ext) || base === 'Dockerfile' || base === '.gitignore';
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    const rel = relative(full);
    if (entry.isDirectory()) {
      if (!shouldSkip(rel)) walk(full, files);
      continue;
    }
    if (!entry.isFile() || !isText(full)) continue;
    const stat = fs.statSync(full);
    if (stat.size > 1000000) continue;
    files.push(full);
  }
  return files;
}

function matches(text, pattern) {
  return [...new Set([...text.matchAll(pattern)].map((m) => m[1] || m[0]))].slice(0, 40);
}

function tags(file, text) {
  const haystack = `${file}\n${text.slice(0, 5000)}`.toLowerCase();
  const out = [];
  if (/supabase|postgres|sql/.test(haystack)) out.push('database');
  if (/express|router\.|app\.(get|post|put|delete)|api/.test(haystack)) out.push('api');
  if (/react|jsx|tsx|vite|expo|react-native/.test(haystack)) out.push('frontend');
  if (/auth|signin|signup|oauth/.test(haystack)) out.push('auth');
  if (/render\.yaml|workflow|deploy/.test(haystack)) out.push('deployment');
  return out;
}

function summarize(full) {
  const file = relative(full);
  const text = fs.readFileSync(full, 'utf8');
  const lines = text.split(/\r?\n/);
  return {
    path: file,
    bytes: Buffer.byteLength(text),
    lines: lines.length,
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
    tags: tags(file, text),
    imports: matches(text, /import\s+(?:[^'\"]+\s+from\s+)?['\"]([^'\"]+)['\"]/g),
    routes: matches(text, /(?:router|app)\.(?:get|post|put|patch|delete)\(['\"]([^'\"]+)['\"]/g),
    env: matches(text, /process\.env\.([A-Z0-9_]+)/g),
    preview: lines.filter((line) => line.trim()).slice(0, 6).join('\n').slice(0, 800)
  };
}

const files = walk(root).map(summarize);
const index = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY || path.basename(root),
  commit: process.env.GITHUB_SHA || null,
  summary: {
    files_indexed: files.length,
    lines_indexed: files.reduce((sum, file) => sum + file.lines, 0),
    bytes_indexed: files.reduce((sum, file) => sum + file.bytes, 0)
  },
  files
};

const markdown = `# QXwap Repository Index\n\nGenerated: ${index.generated_at}\n\n- Files indexed: ${index.summary.files_indexed}\n- Lines indexed: ${index.summary.lines_indexed}\n- Bytes indexed: ${index.summary.bytes_indexed}\n\n## Files\n\n${files.map((file) => `### ${file.path}\n- tags: ${file.tags.join(', ') || '-'}\n- lines: ${file.lines}\n- imports: ${file.imports.slice(0, 12).join(', ') || '-'}\n- routes: ${file.routes.join(', ') || '-'}\n- env: ${file.env.join(', ') || '-'}`).join('\n\n')}\n`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'repository-index.json'), `${JSON.stringify(index, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'repository-index.md'), markdown);
console.log(`Indexed ${files.length} files into docs/agent-index/`);
