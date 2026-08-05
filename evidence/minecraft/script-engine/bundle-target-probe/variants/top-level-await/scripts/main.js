console.warn('[probe] top-level-await: start');
const v = await Promise.resolve('resolved-at-top-level');
console.warn('[probe] top-level-await: OK v=' + v);
