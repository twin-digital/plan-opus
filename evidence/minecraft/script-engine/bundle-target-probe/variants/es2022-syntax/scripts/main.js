console.warn('[probe] es2022-syntax: start');
class Counter {
  #count = 0;                              // private field
  static #kind = 'counter';                // static private field
  static registry = [];
  static { Counter.registry.push('static-block-ran'); }   // static init block
  #bump() { return ++this.#count; }         // private method
  static isCounter(x) { return #count in x; }  // ergonomic brand check
  get value() { return this.#bump(); }
  static kind() { return Counter.#kind; }
}
const c = new Counter();
console.warn('[probe] es2022-syntax: OK value=' + c.value + ' brand=' + Counter.isCounter(c) +
  ' static=' + Counter.registry.join(',') + ' kind=' + Counter.kind() +
  ' at=' + [1,2,3].at(-1) + ' cause=' + new Error('e', { cause: 'why' }).cause);
