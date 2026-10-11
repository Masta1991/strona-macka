// Build an explicit public artifact; never copy the working directory wholesale.
import { cp, mkdir, readdir, lstat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const pages = [
  'index.html', 'style.css', 'main.js', 'exercises.js', 'publications.js',
  'panel/index.html', 'panel/panel.css', 'panel/panel.js', 'panel/docs.js',
];
const assets = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif', '.jfif', '.ico', '.woff2']);

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed: ${relative(root, path)}`);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

for (const folder of ['img', 'zdjecia']) {
  for (const file of await filesIn(join(root, folder))) {
    if (!assets.has(extname(file).toLowerCase())) throw new Error(`Unexpected public asset: ${relative(root, file)}`);
    pages.push(relative(root, file).replaceAll('\\', '/'));
  }
}

await mkdir(output, { recursive: true });
if ((await lstat(output)).isSymbolicLink()) throw new Error('Build output must not be a symlink.');
const allowed = new Set(pages);
for (const file of await filesIn(output)) {
  if (!allowed.has(relative(output, file).replaceAll('\\', '/'))) {
    throw new Error(`Unexpected file in dist; refusing publication: ${relative(output, file)}`);
  }
}
for (const file of pages) {
  const source = join(root, file);
  if (!(await lstat(source)).isFile()) throw new Error(`Missing public file: ${file}`);
  const destination = join(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}
console.log(`Public artifact ready: dist (${pages.length} files).`);
