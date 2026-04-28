import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = ['package.json', 'app.json', 'App.js'];
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error(`Missing required Expo files: ${missing.join(', ')}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

const dependencies = packageJson.dependencies || {};
const requiredDeps = ['expo', 'react', 'react-native', 'react-native-webview', 'expo-constants'];
const missingDeps = requiredDeps.filter((dep) => !dependencies[dep]);

if (missingDeps.length) {
  console.error(`Missing required Expo dependencies: ${missingDeps.join(', ')}`);
  process.exit(1);
}

if (!appJson.expo?.name || !appJson.expo?.slug) {
  console.error('app.json must define expo.name and expo.slug');
  process.exit(1);
}

const defaultWebUrl = appJson.expo?.extra?.defaultWebUrl;
if (!defaultWebUrl || !/^https?:\/\//i.test(defaultWebUrl)) {
  console.error('app.json expo.extra.defaultWebUrl must be an absolute http(s) URL');
  process.exit(1);
}

const appJs = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
for (const needle of ['WebView', 'sharedCookiesEnabled', 'thirdPartyCookiesEnabled', 'defaultWebUrl']) {
  if (!appJs.includes(needle)) {
    console.error(`App.js is missing expected Expo Go WebView marker: ${needle}`);
    process.exit(1);
  }
}

console.log('Expo Go preview config OK');
