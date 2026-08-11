# Refuse a backlog item for a product that does not exist

`backlog add <product>` takes any string as the product and files the item under it. Nothing
checks that the product exists, so a typo or a guess produces a directory on the backlog branch
that no product will ever adopt from, and the item is only found by someone listing the whole
backlog and noticing the odd name.

Observed 2026-08-11: two items were captured against `mc-dev-server` on the assumption that was
where the dev-server design lives; it is a stale product whose fold duplicates mc-dev-kit's
(`b-p1708ram`), and the items had to be re-captured and deleted by hand to move them.

**What to settle when this is taken up:**

- What "exists" means: a `product.yaml` at the product root on main is the obvious test, since
  that is already what makes a product a product.
- The backlog branch is orphan and its writes never touch the working tree, so the check reads
  main rather than the checked-out branch — worth stating, since a product added on an unmerged
  branch would then be refused until it lands.
- Whether `send` and `update` need the same guard, or whether `add` is the only door.
- Whether a retired product should also be refused: an item filed against a product nobody will
  adopt from is the same failure, arriving later.
- The refusal should name the products that do exist — a typo is the common case, and the fix is
  usually one character.
