# AI Context Directory

This directory contains the project's AI-readable operating manual.

## Sections

- `product/`: business meaning, glossary, user workflows, and rules
- `architecture/`: system structure, module ownership, data and integration boundaries
- `delivery/`: priorities, release approach, definition of done, and testing expectations
- `standards/`: coding and implementation rules
- `agents/`: a file per role that Meridian has something specific to say to (components, documents, approved technology); a role with nothing is not written
- `skills/`: the commit, worktree and test-writing rules, and the playbook for your stack
- `templates/`: reusable markdown templates
- `decisions/`: the decisions recorded in Meridian, one file each

## Where these files come from

Several of these files are copies of the application's context documents in
Meridian (the glossary, architecture, security, data, integrations, quality,
conventions, design and non-functional documents), and `decisions/` is a copy
of Meridian's decision register. Each such file says so at its top. Change
those in Meridian, not here: the next scaffold run brings the change in, and a
copy edited by hand is left alone and stops following Meridian. `AGENTS.md`
lists which file comes from which document.

## Maintenance rule

Keep this directory current. If docs drift from code, correct the docs quickly or flag the mismatch clearly — for a file copied from Meridian, correct the document in Meridian.
