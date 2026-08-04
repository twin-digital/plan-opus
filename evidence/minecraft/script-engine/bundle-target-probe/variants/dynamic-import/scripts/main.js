console.warn('[probe] dynamic-import: start typeof-import-expr-parsed');
Promise.resolve()
  .then(() => import('./lazy.js'))
  .then((m) => console.warn('[probe] dynamic-import: OK lazy=' + m.lazy))
  .catch((e) => console.warn('[probe] dynamic-import: REJECTED ' + (e && e.name) + ': ' + (e && e.message)));
console.warn('[probe] dynamic-import: main body finished');
