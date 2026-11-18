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
  // Enquiries and their history. Design: docs/design/enquiry-data-model.md
  // (agreed 2026-11-19, D14-D17).
  Migration(3, [
    '''
    CREATE TABLE enquiries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number INTEGER NOT NULL UNIQUE CHECK (reference_number >= 1001),
      status           TEXT    NOT NULL CHECK (status IN ('new', 'quoted', 'won', 'lost')),
      owner_id         INTEGER NOT NULL REFERENCES users (id),
      company          TEXT    NOT NULL CHECK (length(trim(company)) > 0),
      contact_name     TEXT    NOT NULL CHECK (length(trim(contact_name)) > 0),
      email            TEXT,
      phone            TEXT,
      origin           TEXT    NOT NULL CHECK (length(trim(origin)) > 0),
      destination      TEXT    NOT NULL CHECK (length(trim(destination)) > 0),
      cargo            TEXT    NOT NULL CHECK (length(trim(cargo)) > 0),
      ready_date       TEXT,
      created_at       TEXT    NOT NULL,
      created_by       INTEGER NOT NULL REFERENCES users (id),
      CHECK (email IS NOT NULL OR phone IS NOT NULL)
    )
    ''',
    '''
    CREATE TABLE enquiry_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      enquiry_id  INTEGER NOT NULL REFERENCES enquiries (id),
      happened_at TEXT    NOT NULL,
      actor_id    INTEGER NOT NULL REFERENCES users (id),
      event       TEXT    NOT NULL,
      details     TEXT
    )
    ''',
    'CREATE INDEX enquiry_history_by_enquiry ON enquiry_history (enquiry_id, id)',
    // History can never be changed or removed (A15, D11).
    '''
    CREATE TRIGGER enquiry_history_no_update
    BEFORE UPDATE ON enquiry_history
    BEGIN
      SELECT RAISE(ABORT, 'Enquiry history cannot be changed.');
    END
    ''',
    '''
    CREATE TRIGGER enquiry_history_no_delete
    BEFORE DELETE ON enquiry_history
    BEGIN
      SELECT RAISE(ABORT, 'Enquiry history cannot be removed.');
    END
    ''',
  ]),
];
