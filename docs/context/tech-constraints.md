---
node: Enquiry Tracker
---
# Tech constraints: Enquiry Tracker

## Platform
- Windows desktop only. The application runs on a single shared PC at Harbour Freight's front desk. There is no web, mobile or server component.
- It must work with no internet access. Nothing may depend on a network service at run time.
- It runs from its own folder. Nobody installs anything on the PC.

## Language and framework
- Dart 3.12 and Flutter 3.44 (stable), targeting Windows desktop.

## Data
- SQLite, held as a single local file (`harbour_freight.db`) in the Windows user's application-support folder.
- Accessed through `sqflite_common_ffi`. `sqlite3.dll` is bundled with the Windows build.
- One database for the whole application. There is no second data store.
- The database is created and upgraded by the application itself.

## Packages already in use
- `sqflite_common_ffi` (SQLite access)
- `path` and `path_provider` (file locations)
- `cryptography` (password hashing)

Adding a new package needs a reason that existing packages cannot meet.

## Authentication
- Local username and password accounts, stored in the application's own database.
- Passwords are stored hashed, never in plain text.

## Build and run
- `flutter pub get`, `flutter run -d windows`, `flutter test`, `flutter analyze`.
- A Windows build needs Visual Studio with the "Desktop development with C++" workload.
- If a Windows build fails with `C1083` for `cpp_client_wrapper`, run `flutter clean` then `flutter pub get`.

## Not in scope for this application
- Cloud hosting, a hosted database, sign-in with an external identity provider, mobile or web versions.
