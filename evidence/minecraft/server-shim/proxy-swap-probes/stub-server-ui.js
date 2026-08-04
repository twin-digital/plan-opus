// The pack imports a second @minecraft/* module. Nothing in these probes drives a form, so this is
// the smallest thing that lets the pack's module graph resolve: a chainable builder whose `show`
// never resolves.
export class ActionFormData {
  title() { return this }
  body() { return this }
  button() { return this }
  show() { return new Promise(() => {}) }
}
