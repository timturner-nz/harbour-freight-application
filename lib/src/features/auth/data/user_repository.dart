import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../domain/user.dart';

/// A user together with the stored password hash. Only code that verifies
/// credentials ever sees this; the rest of the app works with [User].
class UserRecord {
  const UserRecord(this.user, this.passwordHash);

  final User user;
  final String passwordHash;
}

/// Persistence for users. All SQL for the `users` table lives here.
abstract class UserRepository {
  Future<UserRecord?> findByUsername(String username);
  Future<User?> findById(int id);
  Future<List<User>> list();
  Future<int> countActiveAdmins();
  Future<User> create({
    required String username,
    required String passwordHash,
    required UserRole role,
    required bool isActive,
    required DateTime createdAt,
  });
  Future<void> update(
    int id, {
    required String username,
    required UserRole role,
    required bool isActive,
  });
  Future<void> updatePasswordHash(int id, String passwordHash);
}

class SqliteUserRepository implements UserRepository {
  SqliteUserRepository(this._db);

  final Database _db;

  @override
  Future<UserRecord?> findByUsername(String username) async {
    final rows = await _db.query(
      'users',
      where: 'username = ?',
      whereArgs: [username],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final row = rows.single;
    return UserRecord(_toUser(row), row['password_hash'] as String);
  }

  @override
  Future<User?> findById(int id) async {
    final rows =
        await _db.query('users', where: 'id = ?', whereArgs: [id], limit: 1);
    return rows.isEmpty ? null : _toUser(rows.single);
  }

  @override
  Future<List<User>> list() async {
    final rows = await _db.query('users', orderBy: 'username COLLATE NOCASE');
    return rows.map(_toUser).toList();
  }

  @override
  Future<int> countActiveAdmins() async {
    final rows = await _db.rawQuery(
      "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1",
    );
    return rows.first['n'] as int;
  }

  @override
  Future<User> create({
    required String username,
    required String passwordHash,
    required UserRole role,
    required bool isActive,
    required DateTime createdAt,
  }) async {
    final id = await _db.insert('users', {
      'username': username,
      'password_hash': passwordHash,
      'role': role.name,
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.toUtc().toIso8601String(),
    });
    return User(
      id: id,
      username: username,
      role: role,
      isActive: isActive,
      createdAt: createdAt,
    );
  }

  @override
  Future<void> update(
    int id, {
    required String username,
    required UserRole role,
    required bool isActive,
  }) async {
    await _db.update(
      'users',
      {'username': username, 'role': role.name, 'is_active': isActive ? 1 : 0},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  @override
  Future<void> updatePasswordHash(int id, String passwordHash) async {
    await _db.update(
      'users',
      {'password_hash': passwordHash},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  User _toUser(Map<String, Object?> row) => User(
        id: row['id'] as int,
        username: row['username'] as String,
        role: UserRole.values.byName(row['role'] as String),
        isActive: (row['is_active'] as int) == 1,
        createdAt: DateTime.parse(row['created_at'] as String),
      );
}
