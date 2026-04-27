// Tiny module-level cache for puzzle images.
//
// Both PlantImage (canvas mosaic) and FinishScreen (<img>) point at the
// same plant photo. Each remount of those components otherwise kicks off
// its own `new Image()` + decode, which produces a one-frame flash even
// when the bytes are already in the HTTP cache.
//
// We hold one HTMLImageElement per URL and pre-decode it via image.decode()
// so the next paint is synchronous. PlantImage reads the cached element on
// first render and skips the LOADING placeholder when the cache is warm.

const cache = new Map(); // url -> { img: HTMLImageElement, promise: Promise<HTMLImageElement> }

export function preloadImage(url, { crossOrigin = "anonymous" } = {}) {
  if (!url) return Promise.resolve(null);
  const hit = cache.get(url);
  if (hit) return hit.promise;

  const img = new Image();
  if (crossOrigin) img.crossOrigin = crossOrigin;
  // Start the network request immediately.
  img.src = url;

  const promise = new Promise((resolve) => {
    const finish = () => resolve(img);
    if (img.complete && img.naturalWidth > 0) {
      // Already cached by the browser — pre-decode then resolve.
      if (typeof img.decode === "function") {
        img.decode().then(finish, finish);
      } else {
        finish();
      }
      return;
    }
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(finish, finish);
      } else {
        finish();
      }
    };
    img.onerror = () => {
      cache.delete(url);
      resolve(null);
    };
  });

  cache.set(url, { img, promise });
  return promise;
}

export function getCachedImage(url) {
  if (!url) return null;
  const entry = cache.get(url);
  if (!entry) return null;
  const { img } = entry;
  return img.complete && img.naturalWidth > 0 ? img : null;
}
