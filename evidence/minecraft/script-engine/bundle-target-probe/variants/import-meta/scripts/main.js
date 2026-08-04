console.warn('[probe] import-meta: start');
try {
  console.warn('[probe] import-meta: typeof import.meta = ' + (typeof import.meta));
  console.warn('[probe] import-meta: url = ' + (import.meta && import.meta.url));
  console.warn('[probe] import-meta: keys = ' + Object.keys(import.meta || {}).join(','));
} catch (e) { console.warn('[probe] import-meta: THREW ' + e); }
