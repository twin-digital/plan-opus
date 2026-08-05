console.warn('[probe] es2023-2024: start');
const arr = [3, 1, 2];
console.warn('[probe] es2023-2024: findLast=' + arr.findLast(x => x > 0));
console.warn('[probe] es2023-2024: toSorted=' + JSON.stringify(arr.toSorted()));
console.warn('[probe] es2023-2024: with=' + JSON.stringify(arr.with(0, 9)));
console.warn('[probe] es2023-2024: hasOwn=' + Object.hasOwn({ x: 1 }, 'x'));
console.warn('[probe] es2023-2024: groupBy=' + (typeof Object.groupBy === 'function'
  ? JSON.stringify(Object.groupBy([1,2,3], n => n % 2 ? 'odd' : 'even')) : 'ABSENT'));
console.warn('[probe] es2023-2024: withResolvers=' + typeof Promise.withResolvers);
console.warn('[probe] es2023-2024: done');
