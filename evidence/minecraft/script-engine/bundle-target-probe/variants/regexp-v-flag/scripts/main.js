console.warn('[probe] regexp-v-flag: start');
const re = /[\p{ASCII}--[a-z]]/v;
console.warn('[probe] regexp-v-flag: OK test=' + re.test('A'));
