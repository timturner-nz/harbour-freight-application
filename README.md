# Harbour Freight

Flutter Windows desktop application.

## Getting started

```
flutter pub get
flutter run -d windows
flutter test
```

## Layout

- `lib/main.dart` – entry point and composition root (wires dependencies)
- `lib/src/app.dart` – root `MaterialApp`
- `lib/src/core/` – shared theme, clock and database setup
  (`database/migrations.dart` holds the forward-only schema migrations)
- `lib/src/features/<feature>/` – one folder per feature, split into
  `data/` (repositories, all SQL), `domain/` (models and business rules)
  and `presentation/` (controllers and screens). `auth/` is the worked example.
- `test/` – mirrors `lib/`; `test/support/` has the in-memory database helper
- `windows/` – Windows runner

## Troubleshooting

If a Windows build fails with `C1083: Cannot open source file ...
windows\flutter\ephemeral\cpp_client_wrapper\*.cc`, the generated
`ephemeral` folder is in a partial state and Flutter will not repair it.
Reset with:

```
flutter clean
flutter pub get
```

## Development login

The database migrations create a default administrator: `admin` /
`ChangeMe123!`. Change this password after signing in (Users -> edit).

Administrators see a **Users** button on the home screen, where they can add
users, edit them (rename, change role, disable, set a new password). The last
active administrator cannot be demoted or disabled.
