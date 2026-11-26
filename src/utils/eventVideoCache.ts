import type { WeddingEventDetail } from '../data/weddingEventDetails';

export interface VideoCacheFetcherResponse {
  ok: boolean;
  headers?: {
    get(name: string): string | null;
  };
  blob(): Promise<Blob>;
}

export interface VideoAssetCacheOptions {
  fetcher?: (url: string) => Promise<VideoCacheFetcherResponse>;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  defaultConcurrency?: number;
}

export interface VideoAssetCache {
  getCachedUrl(src?: string | null): string | null;
  hasCachedUrl(src?: string | null): boolean;
  ensureLoaded(
    src?: string | null,
    options?: { highPriority?: boolean }
  ): Promise<string | null>;
  preload(
    urls: ReadonlyArray<string | null | undefined>,
    options?: {
      priorityUrls?: ReadonlyArray<string | null | undefined>;
      concurrency?: number;
    }
  ): void;
  evict(src?: string | null): void;
  clear(): void;
  getStats(): {
    cachedCount: number;
    inFlightCount: number;
    queuedCount: number;
  };
}

const MIN_VALID_VIDEO_BYTES = 1024;

/**
 * Normalizes a video URL string, returning null when blank or missing.
 */
export function normalizeVideoSrc(src?: string | null): string | null {
  if (typeof src !== 'string') return null;
  const trimmed = src.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extracts all unique normalized video URLs for a list of wedding events in
 * canonical chronological order, including both Bride's and Groom's videos
 * for combined/generic side-specific events.
 */
export function collectInviteVideoUrls(
  events: ReadonlyArray<Pick<WeddingEventDetail, 'videoSrc' | 'combinedSides'>>
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const push = (raw?: string | null) => {
    const normalized = normalizeVideoSrc(raw);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    urls.push(normalized);
  };

  for (const ev of events) {
    if (ev.combinedSides) {
      push(ev.combinedSides.bride.videoSrc);
      push(ev.combinedSides.groom.videoSrc);
    } else {
      push(ev.videoSrc);
    }
  }

  return urls;
}

/**
 * Builds a deduplicated preload order placing priorityUrls first, followed by
 * remaining urls in their original order.
 */
export function buildVideoPreloadPlan(
  urls: ReadonlyArray<string | null | undefined>,
  priorityUrls: ReadonlyArray<string | null | undefined> = []
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const push = (raw?: string | null) => {
    const normalized = normalizeVideoSrc(raw);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  for (const u of priorityUrls) push(u);
  for (const u of urls) push(u);

  return ordered;
}

/**
 * Determines whether a media element has enough decoded frame data to be painted
 * visibly (HTMLMediaElement.HAVE_CURRENT_DATA === 2 or higher).
 */
export function isVideoElementReady(readyState: number): boolean {
  return Number.isFinite(readyState) && readyState >= 2;
}

/**
 * Ensures MP4 blobs carry an explicit video/mp4 MIME type so Safari / WebKit
 * always accepts the resulting blob: URL inside <video>.
 */
export function normalizeVideoBlob(blob: Blob, src: string): Blob {
  const currentType = (blob.type || '').toLowerCase();
  if (currentType.startsWith('video/')) {
    return blob;
  }
  if (/\.mp4($|\?)/i.test(src)) {
    return blob.slice(0, blob.size, 'video/mp4');
  }
  return blob;
}

/**
 * Validates that a fetch response actually returned binary video content rather
 * than an SPA HTML fallback page (e.g. index.html served with HTTP 200).
 */
export function isValidVideoResponse(
  contentType: string | null | undefined,
  blobSize: number
): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
    return false;
  }
  return blobSize >= MIN_VALID_VIDEO_BYTES;
}

/**
 * Creates a concurrency-limited, priority-aware in-memory Blob URL cache for
 * wedding event videos. Using standard HTTP 200 fetch() -> Blob URLs eliminates:
 *  - Chromium's HTTP 206 Partial-Content cache-lock deadlocks across SPA navigations
 *  - 6-connection-per-origin saturation when 6–8 <video> tags mount simultaneously
 *  - Re-buffering delays when creating/previewing new invitations from Studio
 */
export function createVideoAssetCache(
  options: VideoAssetCacheOptions = {}
): VideoAssetCache {
  const defaultConcurrency = Math.max(1, options.defaultConcurrency ?? 3);

  const blobUrlBySrc = new Map<string, string>();
  const inFlightBySrc = new Map<string, Promise<string | null>>();

  interface QueueEntry {
    src: string;
    resolve: (url: string | null) => void;
    started: boolean;
  }

  const queue: QueueEntry[] = [];
  const queueEntryBySrc = new Map<string, QueueEntry>();
  let activeCount = 0;
  let activeConcurrencyLimit = defaultConcurrency;

  const getFetcher = (): ((url: string) => Promise<VideoCacheFetcherResponse>) | null => {
    if (options.fetcher) return options.fetcher;
    if (typeof fetch === 'function') {
      return (url: string) => fetch(url, { credentials: 'same-origin' });
    }
    return null;
  };

  const getCreateObjectURL = (): ((blob: Blob) => string) | null => {
    if (options.createObjectURL) return options.createObjectURL;
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return (blob: Blob) => URL.createObjectURL(blob);
    }
    return null;
  };

  const getRevokeObjectURL = (): ((url: string) => void) | null => {
    if (options.revokeObjectURL) return options.revokeObjectURL;
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      return (url: string) => URL.revokeObjectURL(url);
    }
    return null;
  };

  const pumpQueue = () => {
    const fetcher = getFetcher();
    const createObjectURL = getCreateObjectURL();

    while (activeCount < activeConcurrencyLimit && queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;
      queueEntryBySrc.delete(entry.src);

      const alreadyCached = blobUrlBySrc.get(entry.src);
      if (alreadyCached) {
        inFlightBySrc.delete(entry.src);
        entry.resolve(alreadyCached);
        continue;
      }

      if (!fetcher || !createObjectURL) {
        inFlightBySrc.delete(entry.src);
        entry.resolve(null);
        continue;
      }

      entry.started = true;
      activeCount += 1;

      void (async () => {
        try {
          const response = await fetcher(entry.src);
          if (!response.ok) {
            entry.resolve(null);
            return;
          }
          const contentType = response.headers?.get('content-type') ?? null;
          const rawBlob = await response.blob();
          if (!isValidVideoResponse(contentType || rawBlob.type, rawBlob.size)) {
            entry.resolve(null);
            return;
          }
          const typedBlob = normalizeVideoBlob(rawBlob, entry.src);
          const blobUrl = createObjectURL(typedBlob);
          blobUrlBySrc.set(entry.src, blobUrl);
          entry.resolve(blobUrl);
        } catch {
          entry.resolve(null);
        } finally {
          inFlightBySrc.delete(entry.src);
          activeCount = Math.max(0, activeCount - 1);
          pumpQueue();
        }
      })();
    }
  };

  const ensureLoaded = (
    rawSrc?: string | null,
    loadOptions?: { highPriority?: boolean }
  ): Promise<string | null> => {
    const src = normalizeVideoSrc(rawSrc);
    if (!src) return Promise.resolve(null);

    const cached = blobUrlBySrc.get(src);
    if (cached) return Promise.resolve(cached);

    const existingPromise = inFlightBySrc.get(src);
    if (existingPromise) {
      // Promote queued (not-yet-started) entries to the front when requested at high priority
      if (loadOptions?.highPriority) {
        const queued = queueEntryBySrc.get(src);
        if (queued && !queued.started) {
          const idx = queue.indexOf(queued);
          if (idx > 0) {
            queue.splice(idx, 1);
            queue.unshift(queued);
          }
        }
      }
      return existingPromise;
    }

    const promise = new Promise<string | null>((resolve) => {
      const entry: QueueEntry = { src, resolve, started: false };
      queueEntryBySrc.set(src, entry);
      if (loadOptions?.highPriority) {
        queue.unshift(entry);
      } else {
        queue.push(entry);
      }
    });

    inFlightBySrc.set(src, promise);
    pumpQueue();
    return promise;
  };

  const preload = (
    urls: ReadonlyArray<string | null | undefined>,
    preloadOptions?: {
      priorityUrls?: ReadonlyArray<string | null | undefined>;
      concurrency?: number;
    }
  ) => {
    if (typeof preloadOptions?.concurrency === 'number' && preloadOptions.concurrency >= 1) {
      activeConcurrencyLimit = Math.max(activeConcurrencyLimit, preloadOptions.concurrency);
    }

    const prioritySet = new Set(
      (preloadOptions?.priorityUrls ?? [])
        .map((u) => normalizeVideoSrc(u))
        .filter((u): u is string => Boolean(u))
    );
    const plan = buildVideoPreloadPlan(urls, preloadOptions?.priorityUrls);

    // Enqueue priority URLs in reverse order with highPriority so the first priority URL lands at index 0
    const prioritized = plan.filter((u) => prioritySet.has(u));
    const regular = plan.filter((u) => !prioritySet.has(u));

    for (let i = prioritized.length - 1; i >= 0; i--) {
      void ensureLoaded(prioritized[i], { highPriority: true });
    }
    for (const url of regular) {
      void ensureLoaded(url, { highPriority: false });
    }
  };

  const evict = (rawSrc?: string | null) => {
    const src = normalizeVideoSrc(rawSrc);
    if (!src) return;
    const existing = blobUrlBySrc.get(src);
    if (existing) {
      blobUrlBySrc.delete(src);
      const revoke = getRevokeObjectURL();
      if (revoke) {
        try {
          revoke(existing);
        } catch {
          // Ignore revoke errors
        }
      }
    }
  };

  const clear = () => {
    const revoke = getRevokeObjectURL();
    for (const blobUrl of blobUrlBySrc.values()) {
      if (revoke) {
        try {
          revoke(blobUrl);
        } catch {
          // Ignore revoke errors
        }
      }
    }
    blobUrlBySrc.clear();
    while (queue.length > 0) {
      const entry = queue.shift();
      if (entry) {
        queueEntryBySrc.delete(entry.src);
        inFlightBySrc.delete(entry.src);
        entry.resolve(null);
      }
    }
    inFlightBySrc.clear();
    activeCount = 0;
  };

  return {
    getCachedUrl: (src?: string | null) => {
      const normalized = normalizeVideoSrc(src);
      return normalized ? blobUrlBySrc.get(normalized) ?? null : null;
    },
    hasCachedUrl: (src?: string | null) => {
      const normalized = normalizeVideoSrc(src);
      return normalized ? blobUrlBySrc.has(normalized) : false;
    },
    ensureLoaded,
    preload,
    evict,
    clear,
    getStats: () => ({
      cachedCount: blobUrlBySrc.size,
      inFlightCount: inFlightBySrc.size,
      queuedCount: queue.length,
    }),
  };
}

/** Shared SPA-lifetime event video cache so newly created & previewed invites play instantly from RAM. */
export const eventVideoCache: VideoAssetCache = createVideoAssetCache({
  defaultConcurrency: 3,
});
