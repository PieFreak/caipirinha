// The service worker's logic, run against a stand-in for the browser's cache.
// It shows the rules hold; that a phone really opens the app offline is checked on the phone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BASE = 'https://example.test/app/';
const FILES = ['./', 'index.html', 'assets/app.js', 'icons/icon-192.png'];
const source = readFileSync(new URL('../src/sw.template.js', import.meta.url), 'utf8')
  .replace('__VERSION__', 'test')
  .replace('__FILES__', JSON.stringify(FILES));

function world() {
  const stores = new Map();
  const address = (request) => new URL(typeof request === 'string' ? request : request.url, BASE);
  const caches = {
    stores,
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async (requests) => requests.forEach((request) => {
          const url = address(request);
          store.set(url.href, `copy of ${FILES.find((file) => new URL(file, BASE).href === url.href)}`);
        }),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (request, options = {}) => {
      const url = address(request);
      if (options.ignoreSearch) url.search = '';
      for (const store of stores.values()) if (store.has(url.href)) return store.get(url.href);
      return undefined;
    },
  };
  const handlers = {};
  const calls = { skipWaiting: 0, claim: 0, network: [], requests: [] };
  const self = {
    location: new URL('sw.js', BASE),
    addEventListener: (type, handler) => { handlers[type] = handler; },
    skipWaiting: async () => { calls.skipWaiting++; },
    clients: { claim: async () => { calls.claim++; } },
  };
  const fetch = async (request) => { calls.network.push(request.url); return `network copy of ${request.url}`; };
  class Request {
    constructor(url, init = {}) { this.url = String(url); this.cache = init.cache; calls.requests.push(this); }
  }
  new Function('self', 'caches', 'fetch', 'Request', source)(self, caches, fetch, Request);
  const fire = async (type, request) => {
    let waited;
    let answer;
    handlers[type]({ request, waitUntil: (promise) => { waited = promise; }, respondWith: (promise) => { answer = promise; } });
    await waited;
    return answer === undefined ? undefined : answer;
  };
  return { caches, calls, fire };
}

const get = (path, mode = 'no-cors') => ({ url: new URL(path, BASE).href, method: 'GET', mode });

test('installing keeps a copy of every file and takes over at once', async () => {
  const { caches, calls, fire } = world();
  await fire('install');
  assert.ok(calls.requests.length === FILES.length && calls.requests.every((request) => request.cache === 'reload'),
    'every file fetched past the browser cache');
  assert.deepEqual(await caches.keys(), ['caipirinha-test']);
  assert.equal(caches.stores.get('caipirinha-test').size, FILES.length);
  assert.equal(calls.skipWaiting, 1);
});

test('a new version removes the copies of the one before', async () => {
  const { caches, calls, fire } = world();
  await caches.open('caipirinha-old');
  await fire('install');
  await fire('activate');
  assert.deepEqual(await caches.keys(), ['caipirinha-test']);
  assert.equal(calls.claim, 1);
});

test('files are answered from the copy, without the network', async () => {
  const { calls, fire } = world();
  await fire('install');
  assert.equal(await fire('fetch', get('assets/app.js')), 'copy of assets/app.js');
  assert.equal(await fire('fetch', get('assets/app.js?v=2')), 'copy of assets/app.js');
  assert.equal(await fire('fetch', get('./', 'navigate')), 'copy of ./');
  assert.equal(await fire('fetch', get('index.html', 'navigate')), 'copy of index.html');
  assert.equal(await fire('fetch', get('somewhere/else', 'navigate')), 'copy of index.html');
  assert.deepEqual(calls.network, []);
});

test('what the copy lacks goes to the network, and other sites are left alone', async () => {
  const { calls, fire } = world();
  await fire('install');
  assert.equal(await fire('fetch', get('new-file.png')), `network copy of ${BASE}new-file.png`);
  assert.equal(calls.network.length, 1);
  assert.equal(await fire('fetch', { url: 'https://elsewhere.test/x.js', method: 'GET', mode: 'no-cors' }), undefined);
  assert.equal(await fire('fetch', { url: `${BASE}index.html`, method: 'POST', mode: 'cors' }), undefined);
});
