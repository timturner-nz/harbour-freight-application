# meridian-derive: the worked example and the reasons

`SKILL.md` states the rules for deriving a card. This file keeps the worked
example in full and the reasons behind the rules. Open it when you are writing
a business requirement for the first time, or when a rule seems not to apply.

## Why this skill exists

Users reported it: an agent builds exactly the sentence on the card and misses
everything around it. The card said "show the overdue items", and nobody said
what the screen shows when there are none, what a read-only user sees, or that
the same count appears on two other screens that now disagree. Those answers
exist only in the code and the context around the card.

## The business requirement check

The check's questions for an outcome are `outcome` (does it state a business
result), `beneficiary` (who gains), `measurable` (how you would tell it was
achieved), `singleConcern` (one thing) and `solutionFree` (leaves out how it is
built). A constraint is a rule that must hold; an enabler is groundwork that
makes outcomes possible; a design is how something should look, usually a
mockup, and so a proposed solution. Only a business requirement whose current
check is an outcome can be the target of `set_served_outcome`. Naming the
outcome in a design's wording does not count as linking it.

An unknown `type` is refused. Reads show the type: `Type:` on `get_coverage`,
`[type: ...]` on non-outcome rows of `list_source_requirements`, and
`(type set by a person)` after the kind when somebody fixed it.
`edit_source_requirement` re-runs the check only when the title, body or
rationale changed. Two replies the check gives:

```
Business requirement check: meets, as an outcome requirement.
```

```
Business requirement check: needs work, as an outcome requirement. Advice only -- it is filed as you sent it.
- Doesn't say who benefits (beneficiary): <the model's reason>
Suggested rewording, which checks as meets (not applied): <text>
Reword it with edit_source_requirement, or pass outcome_check_ack: true to file it as it stands.
```

## The worked example

An agent first filed this:

- **Nobody is told before a signing certificate or a pipeline token
  expires.** Three code-signing certificates and several tokens used by CI
  pipelines expired in the last few months, and each one was found when a
  build or a release failed. The service desk keeps a register, but
  developers don't work there, and the expiry emails go to whoever happened
  to create the token or buy the certificate. We need expiry dates captured
  without somebody typing them in, and the warning delivered where the
  delivery team already works, early enough to renew.

It failed all five questions. It opens with a problem, asks for two
mechanisms (capture without typing, deliver where the team works), and never
says when it is done. Rewritten, it is two business requirements:

- **The delivery team hears about every signing certificate and pipeline
  token expiry at least 30 days before it lapses.** The delivery team, the
  people who build and release the product, find out that a code-signing
  certificate or a token their pipelines use is about to expire at least 30
  days before it does, so there is time to renew it. Done when: every signing
  certificate and pipeline token that expires from now on was brought to the
  delivery team's attention 30 or more days before its expiry date.

- **No build or release fails because a signing certificate or pipeline
  token expired.** Builds and releases keep working through certificate and
  token renewals, so the delivery team, and everyone waiting on a release,
  never lose a build or a release to an expired certificate or token. Done
  when: over the six months after this ships, no failed build or release is
  caused by an expired signing certificate or pipeline token.

The problem statement moved into the rationale, where it explains why. The
two mechanisms were not lost: automatic capture and the delivery channel are
build requirements derived from these two.

## How the business requirement check replies

The type (`outcome`, the default, `constraint`, `enabler` or `design`) is the
person's choice: pass `type` to either tool only when they told you to. When
the wording reads like another type the check says so (`reads as design`) and
changes nothing.

Both tools write first and then run the check; the reply ends with a block
starting `Business requirement check:` (for example
`Business requirement check: needs work, as an outcome requirement.`, naming
each unmet question and a suggested rewording that is not applied). The check
is advice and never refuses or undoes the write.
