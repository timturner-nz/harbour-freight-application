---
name: meridian-business-requirement
description: Work out a business requirement with a person, one question at a time, and put it on Meridian's Proposals screen for somebody to approve. Use when a person asks you to help write, draft or work out a business requirement, says what they need but not why, or wants to turn a rough idea into something Meridian can trace work to. Also use it when a person is answering Meridian's "Whose need is it?" questions about work with no business requirement. It needs no AI set up in Meridian. When the business requirement already exists and you are building from it, use meridian-derive instead.
---

# Working out a business requirement with a person

A **business requirement** says what the business needs and why, in its own
words, so that work can be traced back to it. Most people arrive with a
solution ("we need a dashboard of expiring certificates") and not the result
they want. Your job is the conversation that gets from one to the other, then
a proposal a person approves. You are the interviewer, not the author: every
fact in it comes from them.

Nothing you do here writes a business requirement. `propose_business_requirement`
puts one proposal on Meridian's Proposals screen, exactly as you wrote it, and
a person approves it there (which saves it) or dismisses it with a reason you
can read.

If the business requirement already exists and you are building from it, stop
and use `meridian-derive`.

## 1. Look before you ask

Read `list_source_requirements` first. If one already says the same thing,
tell the person and offer to improve it (`edit_source_requirement`) instead of
writing a second.

If what you read shows a gap, two business requirements that conflict, or
wording that reads two ways, raise it with `ask_about_business_requirement`
(`kind`, and `conflicts_with` for a conflict) rather than a comment, so it
reaches the analyst and stays open until answered.

## 2. Ask one question at a time

Aim each question at the first of these five that is not yet answered, and
ask only that one. These are the questions the business requirement check asks
of an outcome, in the same words `meridian-derive` uses:

1. Does it state a business result? (What changes for the business, not which
   feature or screen is built.)
2. Does it say who gains? (A named group of people, not "users".)
3. Does it say how you would tell it was achieved? End it with a "Done when:"
   sentence somebody could check.
4. Does it ask for one thing? If the done-state needs an "and", it is two.
5. Does it leave out how it is built?

Do not ask all five at once, and do not ask a question the person has already
answered in passing.

## 3. Read each item back, and never supply a fact

When the person gives you an answer, read it back in one sentence and get a
yes before it goes into the draft. Never supply a fact the person did not
give: no invented numbers, groups, deadlines or reasons. If you need
something to carry on that they have not said, say the guess out loud and
record it as an assumption, worded as a question to confirm ("Is every
certificate in the register?"), with their own words that raised it. A
question they could not answer goes in `open_questions` the same way. Both
carry `quote`, the person's own words, never yours.

## 4. Keep any mechanism as an idea

When the person says how ("a dashboard", "email the team", "a nightly job"),
write it down verbatim in `ideas_for_how` and carry on asking about the
result. Keep any mechanism as an idea, verbatim, and never in the body. The
ideas reach the builders as suggestions, not as the requirement.

## 5. Offer a split for two outcomes

If the person describes two outcomes, say so and offer to write two business
requirements, each worked through on its own. Do not bundle them because the
person mentioned them together.

Later, each build requirement answering it carries one thing to build: five
things to build are answered by five build requirements, not by one that lists
them.

## 6. Show the final text, then propose it

Show the person the whole text as it will be proposed: title, body ending
with its "Done when:" sentence, and rationale (why it exists, separate from
the rule). Get their yes. Only then call `propose_business_requirement`.

Then tell them where it is: it waits on the Proposals screen, and nothing is
saved until somebody approves it there. Do not say it is saved, and do not
call `create_source_requirement` as well. The reply may end with a
`Business requirement check:` block. That is advice from Meridian's own model
when one is set up, and says so plainly when none is. Either way the proposal
is staged.

A `body` that does not end with a "Done when:" sentence is staged with a
warning. A proposal that takes the same arguments as one still waiting
returns that one rather than a second.

## 7. Follow up with get_proposal

When the person comes back, read `get_proposal` with the id you were given.
It says whether the proposal is still waiting, was approved (and which
business requirement it became), or was dismissed, who decided and why.

If it was dismissed, show the person the reason, work through what it asks
for, and propose again with `revises` set to the dismissed proposal's id. Never
resend the same text: a proposal whose title, body and rationale match a
dismissed one is refused, and the refusal quotes the reason. A change to
the open questions or the ideas alone is not a revision of the requirement.

If it was approved, the business requirement exists and the work moves on to
`meridian-derive`.

## 8. When Meridian asks "Whose need is it?"

Meridian asks this about build requirements that answer no business
requirement. **Citing no business requirement does not make work technical.**
Usually the work answers a need nobody has written down yet. Help the person
choose the answer that is true, not the one that clears the list fastest, then
call `answer_business_need_asks` with the `outcome` they chose:

- `link`: the work answers a business requirement that already exists. Find it
  with them and pass it as `business_requirement`.
- `draft`: the work answers a need nobody has written down. Ask what the
  questions have in common and pass that, in the person's words, as `title`.
  It becomes one business requirement at Asked, which still waits for somebody
  to agree it, and every one is linked to it.
- `technical_work`: only for work that truly has no business need behind it,
  such as a test harness or an upgrade nobody asked for. Pass the person's
  `reason`. It is a deliberate answer, never a default.

You never accept the draft Meridian wrote from a card. That is a person's
decision, one card at a time, in the app, and a `draft` title copied from one
is refused. Never answer on your own judgement, and never to clear a list.

## 9. "We need a new X"

Answer with an application brief: `create_application_brief` from the
capabilities the person names (never your own pick) or a `value_stream`, gaps
first, then `propose_brief_business_requirements` for a person to approve.
See `meridian-delivery/reference.md`.
