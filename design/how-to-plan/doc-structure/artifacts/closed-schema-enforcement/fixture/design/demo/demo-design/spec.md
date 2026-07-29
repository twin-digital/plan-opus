# Demo design

## Summary

A fixture spec whose live blocks each carry an entry with a `checked` field no schema defines. The
open question keeps the design in draft, so the settle gate stays out of the observation.

## Open questions

```yaml
questions:
  - id: demo-question
    question: does the checker report a field outside an entry's schema?
    closes: fact
    checked: true
```

## Components

```yaml
components:
  - id: demo-component
    responsibility: stand in for a real component so the block is not empty
    checked: true
```
