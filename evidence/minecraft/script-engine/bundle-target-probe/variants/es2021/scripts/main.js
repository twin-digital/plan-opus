console.warn('[probe] es2021: start');
let a = null; a ??= 'set';                // logical assignment
let b = 0; b ||= 5;
let c = 1; c &&= 9;
const n = 1_000_000;                      // numeric separators
const r = 'x-y-z'.replaceAll('-', '+');
console.warn('[probe] es2021: OK a=' + a + ' b=' + b + ' c=' + c + ' n=' + n + ' r=' + r);
