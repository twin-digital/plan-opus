# r-82ck2fax: ambiguous antecedent, verification points at the wrong place

From the 2026-08-09 vocabulary audit: "an exception for one package is declared where that
configuration lives" has two possible antecedents, and the verification step resolves it as
the shared (generated) configuration — which the statement itself says is never edited in the
package. Exceptions must live with the monorepo's declarative configuration. Adopted by
nodejs, nodejs-library, and nodejs-cli, so the ambiguity propagates. Also: the title says
"repo-kit managed" while the body says "the monorepo's config manager" with nothing linking
the two names.
