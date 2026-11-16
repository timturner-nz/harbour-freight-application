# Flutter Desktop Best Practices

## Purpose

Guide implementation for Flutter desktop applications on Windows, macOS, and Linux.

## Architectural guidance

- keep domain logic outside widgets
- separate presentation, state management, and service layers clearly
- prefer feature-based folder organisation once the app grows
- isolate platform-specific functionality behind service abstractions
- design for keyboard and pointer interaction, not just touch

## UI and UX

- support window resizing gracefully
- provide responsive layouts suited to desktop aspect ratios
- use clear focus handling and keyboard shortcuts for power-user workflows
- design hover, selection, context menu, and drag interactions deliberately
- handle long-running tasks with visible progress and cancellation where possible

## State management

- choose one state approach and use it consistently
- keep transient UI state local
- keep app state explicit and testable
- avoid burying business logic in widget trees

## Performance

- minimise unnecessary rebuilds
- virtualise large lists or tables where needed
- avoid heavy synchronous work on the UI thread
- offload parsing or computation when the data volume justifies it

## Persistence and file access

- treat file system, local database, and window lifecycle rules as first-class concerns
- centralise file path and storage logic
- handle file permission failures and missing files cleanly
- design import/export flows with validation and recovery paths

## Testing

- unit test domain and state logic
- widget test important interaction patterns
- integration test critical desktop workflows such as import, export, file open, and persistence

## Packaging and release

- document signing, packaging, installer generation, and update strategy per platform
- test on the target operating systems rather than assuming parity

## Common pitfalls

- mobile-first layouts pasted onto desktop
- too much business logic in widgets
- weak keyboard accessibility
- blocking UI during file or compute operations
