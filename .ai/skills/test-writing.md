# Test Writing

## Purpose

Add tests that increase confidence rather than ceremony.

## Principles

- test business rules where they live
- prefer stable assertions over incidental detail
- cover edge cases and historical failures
- keep tests readable and intention-revealing

## Review prompts

- what failure would this catch?
- is this the narrowest useful level?
- is the test coupled to implementation trivia?

## Prove the test can fail

A test written after the fix passes because the code is right — and it would
also pass if it asserted something the code cannot violate. So reintroduce the
defect on purpose and run again:

1. name, before running, the test you expect to fail
2. break the code, and confirm the break landed (`git diff --stat`)
3. read which test failed, not just whether one did
4. restore the fix

A green reintroduction is a finding, not noise: the assertion is inert or the
setup never reaches the branch. The wrong test failing is a finding too. Report
either with `report_evidence outcome: failed` before fixing it, so the
iteration is counted.
