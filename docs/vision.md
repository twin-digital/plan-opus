# Vision: Opus Planning & Design

## The Problem

Working with LLM coding agents has been frustrating in a specific way, and the whole design below is just an answer to these. So let me start by writing down what actually goes wrong.

- **The changes are too big to steer.** I ask for something and get back a 50–100 file PR. By the time I can actually read it, the bad decisions are already baked in and everything else is built on top of them.
- **I can't see the intent.** I have no idea *why* the agent made the choices it did. There's no reasoning to review, just code.
- **A bad base doesn't get better.** When something feels off, it's usually wrong at the core, not the surface. But the agent just keeps patching — dozens of little band-aid revisions — and it never comes together, because the foundation was wrong the whole time.
- **Aborting is painful, so I don't do it enough.** Throwing the work out feels worse than patching, even when patching is the slower path. So I patch.
- **Reviewing fries my brain.** The output is fluent and confident everywhere, so every sentence reads as equally important. I end up parsing all of it at full attention, and the wrong parts hide at the same weight as the right ones.
- **It's not obviously faster than doing it myself.** If I have to dictate the entire design to get a good result, I haven't saved anything.

Ironically, the solution to spending less time planning was to create a whole repository dedicated to nothing but planning!

## The Vision

I want to stop directing keystrokes and start setting direction. I decide what matters and where the boundaries go. Agents do the building. The machine — types, tests, lint — holds the quality line so I don't have to read for it. And when something's wrong, it's cheap to throw out and redo, because the pieces are small and independent. Being wrong should cost a small redo, not a week of untangling. The day-to-day feeling I'm after: I spend my attention on design and judgment, and almost none of it babysitting output.

## Principles

A few years back, writing about game prototyping, I landed on "place the big rocks first" — get the high-impact stuff settled before fine-tuning details, because tuning is wasted if the core changes. That instinct is the root of most of this.

1. **Sort by reversal cost.** Decide how much care something gets by how expensive it is to be wrong and undo it. Architecture is expensive to unwind, so it earns scrutiny up front. A parameter's default is cheap to change, so it doesn't. *Skip this and I spend my scarcest attention guarding my cheapest mistakes.*

2. **Review where the wrongness is, not where it's easy to read.** The bad-base problem lives at the level of design coherence. That's what I need to look at — not the prose around it. *Skip this and I'm back to parsing 100 files at full attention and missing the one bad boundary.*

3. **Make intent explicit.** Every claim in a design should say what it rests on — a known fact, a requirement, or a decision the agent made. Reasoning that stays in the agent's head can't be reviewed. *Skip this and I'm back to "I can't see why it did that."*

4. **Let machines catch every problem they can.** Types, tests, and linters don't get tired and don't miss the 80th case. Anything they can enforce, I stop reviewing by hand. And it compounds — once the machine enforces the tactics, agents build to pass, so the quality I stopped hand-checking actually goes up. *Skip this and quality depends on my attention, which doesn't scale and gets burnt out.*
