# meridian-context reference

Detail moved out of `SKILL.md` to keep it short.

### When the producer is a third party

Some edges point at something nobody here builds — a payment provider, an
identity service, a partner API. The node carries `is_external`, and the
Inventory grid marks it `ext`.

Read these the same way, with two differences that change what you do:

- **Their contract is not negotiable by you.** A `live` contract with an
  internal team can be renegotiated; a third party's API changes when they say
  so. Treat the recorded shape as the thing you must conform to, and if the
  code disagrees with it, the code is wrong until proven otherwise.
- **`spec_path` may point at a vendored copy in *our* repo, not theirs.**
  Check `spec_producer` — it names which node's repo actually holds the file,
  and for an external producer that is usually the consumer. `spec_ref` then
  pins **which version of their API we built against**, which is the fact you
  want when their behaviour and our code disagree.

If the contract has no `spec_path` at all, look at `protocol`, `auth_method`,
`sla` and `notes` before assuming nothing is known — for a vendor with no
machine-readable spec, that free text *is* the contract, and `notes` is where a
link to their published documentation lives.

**Their public documentation is legitimate research.** Reading a vendor's
published API reference to understand an edge is not the same as inferring
architecture: you are reading their own statement of what they offer. Use it to
explain what you found. Recording it in Meridian is still a write, and still
belongs to `meridian-delivery`'s rules.
