#!/bin/sh
# every tracked file naming the legacy foundations script, with line numbers
git grep -n "foundations.mjs" -- ':!products/increment-process/increments/009/artifacts' ':!facts' ':!evidence'
