import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllWeddingEventDetails } from '../data/weddingEventDetails';
import {
  buildVideoPreloadPlan,
  collectInviteVideoUrls,
  createVideoAssetCache,
  isValidVideoResponse,
  isVideoElementReady,
  normalizeVideoBlob,
  normalizeVideoSrc,
} from './eventVideoCache';

test('normalizeVideoSrc trims valid URLs and rejects empty inputs', () => {
  assert.equal(normalizeVideoSrc('  /videos/Wedding.mp4  '), '/videos/Wedding.mp4');
  assert.equal(normalizeVideoSrc(''), null);
  assert.equal(normalizeVideoSrc('   '), null);
  assert.equal(normalizeVideoSrc(null), null);
  assert.equal(normalizeVideoSrc(undefined), null);
});

test('collectInviteVideoUrls extracts unique videos in chronological order for bride, groom, and generic combined modes', () => {
  const brideUrls = collectInviteVideoUrls(getAllWeddingEventDetails('bride'));
  assert.deepEqual(brideUrls, [
    '/videos/Mehendi_Cocktail.mp4',
    '/videos/Aiburobhat_Bride.mp4',
    '/videos/Haldi_Bride.mp4',
    '/videos/Wedding.mp4',
    '/videos/Boubhat.mp4',
    '/videos/Reception.mp4',
  ]);

  const groomUrls = collectInviteVideoUrls(getAllWeddingEventDetails('groom'));
  assert.deepEqual(groomUrls, [
    '/videos/Mehendi_Cocktail.mp4',
    '/videos/Aiburobhat_Groom.mp4',
    '/videos/Haldi_Groom.mp4',
    '/videos/Wedding.mp4',
    '/videos/Boubhat.mp4',
    '/videos/Reception.mp4',
  ]);

  const genericUrls = collectInviteVideoUrls(getAllWeddingEventDetails('generic'));
  assert.deepEqual(genericUrls, [
    '/videos/Mehendi_Cocktail.mp4',
    '/videos/Aiburobhat_Bride.mp4',
    '/videos/Aiburobhat_Groom.mp4',
    '/videos/Haldi_Bride.mp4',
    '/videos/Haldi_Groom.mp4',
    '/videos/Wedding.mp4',
    '/videos/Boubhat.mp4',
    '/videos/Reception.mp4',
  ]);
});

test('buildVideoPreloadPlan prioritizes requested URLs and deduplicates entries', () => {
  const plan = buildVideoPreloadPlan(
    ['/videos/Mehendi_Cocktail.mp4', '/videos/Wedding.mp4', '/videos/Reception.mp4', null],
    ['/videos/Wedding.mp4', '  /videos/Reception.mp4  ', '/videos/Wedding.mp4']
  );

  assert.deepEqual(plan, [
    '/videos/Wedding.mp4',
    '/videos/Reception.mp4',
    '/videos/Mehendi_Cocktail.mp4',
  ]);
});

test('isVideoElementReady requires HAVE_CURRENT_DATA (readyState >= 2)', () => {
  assert.equal(isVideoElementReady(0), false);
  assert.equal(isVideoElementReady(1), false);
  assert.equal(isVideoElementReady(2), true);
  assert.equal(isVideoElementReady(3), true);
  assert.equal(isVideoElementReady(4), true);
  assert.equal(isVideoElementReady(Number.NaN), false);
});

test('isValidVideoResponse rejects SPA HTML fallbacks and undersized payloads', () => {
  assert.equal(isValidVideoResponse('video/mp4', 4096), true);
  assert.equal(isValidVideoResponse('application/octet-stream', 4096), true);
  assert.equal(isValidVideoResponse(null, 4096), true);
  assert.equal(isValidVideoResponse('text/html; charset=utf-8', 50000), false);
  assert.equal(isValidVideoResponse('application/json', 50000), false);
  assert.equal(isValidVideoResponse('video/mp4', 256), false);
});

test('normalizeVideoBlob ensures video/mp4 MIME type for .mp4 assets when server omits video type', () => {
  const genericBlob = new Blob([new Uint8Array(2048)], { type: 'application/octet-stream' });
  const normalized = normalizeVideoBlob(genericBlob, '/videos/Wedding.mp4');
  assert.equal(normalized.type, 'video/mp4');
  assert.equal(normalized.size, 2048);

  const alreadyVideo = new Blob([new Uint8Array(2048)], { type: 'video/mp4' });
  assert.equal(normalizeVideoBlob(alreadyVideo, '/videos/Wedding.mp4'), alreadyVideo);
});

test('createVideoAssetCache deduplicates requests, enforces concurrency, promotes priority items, caches blobs, and allows retry after failure', async () => {
  const fetchCalls: string[] = [];
  const pendingResolvers = new Map<string, () => void>();
  let blobCounter = 0;
  const revokedUrls: string[] = [];
  let failOnce = true;

  const cache = createVideoAssetCache({
    defaultConcurrency: 2,
    createObjectURL: () => `blob:test-video-${++blobCounter}`,
    revokeObjectURL: (u) => {
      revokedUrls.push(u);
    },
    fetcher: (url) => {
      fetchCalls.push(url);
      return new Promise((resolve) => {
        pendingResolvers.set(url, () => {
          if (url === '/videos/Flaky.mp4' && failOnce) {
            failOnce = false;
            resolve({ ok: false, blob: async () => new Blob([]) });
            return;
          }
          resolve({
            ok: true,
            headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'video/mp4' : null) },
            blob: async () => new Blob([new Uint8Array(2048)], { type: 'video/mp4' }),
          });
        });
      });
    },
  });

  // Enqueue 4 videos with concurrency 2; first two should start immediately
  const p1 = cache.ensureLoaded('/videos/A.mp4');
  const p2 = cache.ensureLoaded('/videos/B.mp4');
  const p3 = cache.ensureLoaded('/videos/C.mp4');
  const p4 = cache.ensureLoaded('/videos/D.mp4');

  assert.deepEqual(fetchCalls, ['/videos/A.mp4', '/videos/B.mp4']);

  // Duplicate call returns same in-flight promise without extra fetch
  const p1Dup = cache.ensureLoaded('/videos/A.mp4');
  assert.equal(p1Dup, p1);

  // Promote D ahead of C before either starts
  const p4High = cache.ensureLoaded('/videos/D.mp4', { highPriority: true });
  assert.equal(p4High, p4);

  // Finish A -> D should start before C!
  pendingResolvers.get('/videos/A.mp4')?.();
  const urlA = await p1;
  assert.equal(urlA, 'blob:test-video-1');
  assert.equal(cache.getCachedUrl('/videos/A.mp4'), 'blob:test-video-1');

  // Allow microtasks to pump queue
  await Promise.resolve();
  assert.deepEqual(fetchCalls, ['/videos/A.mp4', '/videos/B.mp4', '/videos/D.mp4']);

  // Finish remaining
  pendingResolvers.get('/videos/B.mp4')?.();
  pendingResolvers.get('/videos/D.mp4')?.();
  await Promise.all([p2, p4]);
  await Promise.resolve();
  pendingResolvers.get('/videos/C.mp4')?.();
  await p3;

  // Cached hit does NOT re-fetch
  const cachedA = await cache.ensureLoaded('/videos/A.mp4');
  assert.equal(cachedA, 'blob:test-video-1');
  assert.equal(fetchCalls.filter((u) => u === '/videos/A.mp4').length, 1);

  // Eviction revokes blob URL and allows clean reload
  cache.evict('/videos/A.mp4');
  assert.equal(cache.getCachedUrl('/videos/A.mp4'), null);
  assert.deepEqual(revokedUrls, ['blob:test-video-1']);

  // Transient failure returns null without poisoning cache, so retry succeeds
  const flaky1 = cache.ensureLoaded('/videos/Flaky.mp4');
  pendingResolvers.get('/videos/Flaky.mp4')?.();
  assert.equal(await flaky1, null);
  assert.equal(cache.hasCachedUrl('/videos/Flaky.mp4'), false);

  const flaky2 = cache.ensureLoaded('/videos/Flaky.mp4');
  pendingResolvers.get('/videos/Flaky.mp4')?.();
  const flakyUrl = await flaky2;
  assert.ok(flakyUrl?.startsWith('blob:test-video-'));
});
