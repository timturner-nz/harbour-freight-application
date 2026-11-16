/// A single, forward-only schema change.
///
/// Migrations run in ascending [version] order. Never edit a migration that
/// has shipped; add a new one with the next version number instead.
class Migration {
  const Migration(this.version, this.statements);

  final int version;
  final List<String> statements;
}

/// The full, ordered list of migrations for the application database.
const List<Migration> migrations = [
  Migration(1, [
    '''
    CREATE TABLE users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    )
    ''',
  ]),
  Migration(2, [
    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'",
    'ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1',
    // Default administrator: username `admin`, password `ChangeMe123!`.
    // The hash is PBKDF2-HMAC-SHA256 (see PasswordHasher). Change this
    // password after first sign-in.
    r'''
    INSERT OR IGNORE INTO users (username, password_hash, created_at, role, is_active)
    VALUES (
      'admin',
      'pbkdf2$100000$VncL5DCTkxakBu7Kji2Rrw==$3r5w16H0n559/fYJFU37NofNnBVSt2/ILb+DUMNGxSc=',
      strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      'admin',
      1
    )
    ''',
    // Databases created before roles existed already hold an `admin` user.
    "UPDATE users SET role = 'admin', is_active = 1 WHERE username = 'admin'",
  ]),
];
