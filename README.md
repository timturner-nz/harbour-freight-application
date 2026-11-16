# Harbour Freight

Flutter Windows desktop application.

## Getting started

```
flutter pub get
flutter run -d windows
flutter test
```

## Layout

- `lib/main.dart` – entry point
- `lib/src/app.dart` – root `MaterialApp`
- `lib/src/core/` – shared theme and utilities
- `lib/src/features/` – feature folders (one per area, e.g. `home/`)
- `windows/` – Windows runner
