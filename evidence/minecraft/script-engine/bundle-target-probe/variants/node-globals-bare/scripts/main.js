console.warn('[probe] node-globals-bare: start');
try { console.warn('[probe] node-globals-bare: process.env.NODE_ENV = ' + process.env.NODE_ENV); }
catch (e) { console.warn('[probe] node-globals-bare: process THREW ' + e.name + ': ' + e.message); }
try { console.warn('[probe] node-globals-bare: Buffer.from = ' + Buffer.from('hi').toString('hex')); }
catch (e) { console.warn('[probe] node-globals-bare: Buffer THREW ' + e.name + ': ' + e.message); }
try { console.warn('[probe] node-globals-bare: __dirname = ' + __dirname); }
catch (e) { console.warn('[probe] node-globals-bare: __dirname THREW ' + e.name + ': ' + e.message); }
try { console.warn('[probe] node-globals-bare: require = ' + require('node:fs')); }
catch (e) { console.warn('[probe] node-globals-bare: require THREW ' + e.name + ': ' + e.message); }
console.warn('[probe] node-globals-bare: done');
