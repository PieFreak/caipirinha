import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// After a build, write dist/sw.js: the service worker that keeps a copy of every
// built file on the phone, so the app opens without a connection. Its cache is
// named after a digest of the files, so any change makes the phone fetch anew.
function offline() {
  let out;
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
  return {
    name: 'offline-service-worker',
    apply: 'build',
    configResolved(config) {
      out = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = walk(out)
        .map((path) => relative(out, path).split(sep).join('/'))
        .filter((file) => file !== 'sw.js')
        .sort();
      const digest = createHash('sha256');
      for (const file of files) digest.update(file).update(readFileSync(join(out, file)));
      const template = readFileSync(resolve('src/sw.template.js'), 'utf8');
      writeFileSync(join(out, 'sw.js'), template
        .replace('__VERSION__', digest.digest('hex').slice(0, 12))
        .replace('__FILES__', JSON.stringify(['./', ...files])));
    },
  };
}

export default defineConfig({
  // Relative, so the app works from any address (a sub-folder of a free file host).
  base: './',
  plugins: [vue(), offline()],
  // PORT lets whatever starts the server choose where it listens.
  server: { port: Number(process.env.PORT) || 5173, strictPort: true, host: true },
  preview: { port: 4173, host: true },
});
