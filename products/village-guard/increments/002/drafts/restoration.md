# Restoration: the settled requirement texts

Working material for this increment's review.

PR #151 converted `design/minecraft/village-guard` from `main`, but the owner's settled
amendments lived only on the unmerged branch `design/minecraft-village-guard` (tip `4f7e536`,
"settle the roster boundary and the visible-tell reading"). The conversion never saw them, so
increment 001 ratified the older text of two requirements. The owner ruled on 2026-08-04 to
restore the settled text; this increment does so with two amending requirements:

- `r-pe87rfqq` amends `r-uyqd39on` (protection survives ordinary play): loss that is not a
  death — a wandering trader's vanilla despawn among them — is outside what the pack must
  prevent.
- `r-eh0aac98` amends `r-g8trct40` (the pack changes nothing else): a mob that is hit still
  visibly takes the hit — flinch, knockback, sound, and panic as vanilla would — and the tell
  rule covers only what the protection adds.

## The brief's delta

The same commit settled the brief's "Done looks like" paragraph. Increment 001's published
`drafts/brief.md` froze with the older wording and cannot be edited, so the settled paragraph
is recorded here as the reading that governs:

> Someone downloads the pack, drops it into a vanilla world, and plays a night through a zombie
> siege: at dawn every villager, trader, and golem the village held at dusk is still there — bar a
> wandering trader whose vanilla despawn timer ran out — plus whatever it bred or spawned overnight,
> every one of them trading, restocking, and breeding as before, with nothing on screen that says a
> pack is running.
