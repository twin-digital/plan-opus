console.warn('[probe] async-generators: start');
async function* gen() { yield 1; yield 2; }
(async () => {
  let sum = 0;
  for await (const v of gen()) sum += v;
  console.warn('[probe] async-generators: OK sum=' + sum);
})().catch(e => console.warn('[probe] async-generators: THREW ' + e));
