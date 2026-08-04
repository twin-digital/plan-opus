console.warn('[probe] es2020: start');
const o = { a: { b: 1 }, f() { return 7; } };
const oc = o?.a?.b;                       // optional chaining
const ocCall = o.f?.();                   // optional call
const nn = null ?? 'fallback';            // nullish coalescing
const big = 10n ** 3n;                    // BigInt literal
const ms = [...'aab'.matchAll(/a/g)].length;
console.warn('[probe] es2020: OK oc=' + oc + ' ocCall=' + ocCall + ' nn=' + nn + ' big=' + big + ' matchAll=' + ms);
