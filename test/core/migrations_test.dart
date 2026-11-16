import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/core/database/app_database.dart';
import 'package:harbour_freight/src/features/auth/data/user_repository.dart';
import 'package:harbour_freight/src/features/auth/domain/auth_service.dart';
import 'package:harbour_freight/src/features/auth/domain/user.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../support/test_users.dart';

void main() {
  sqfliteFfiInit();

  test(
    'a version 1 database with an existing admin upgrades cleanly',
    () async {
      final dir = await Directory.systemTemp.createTemp('hf_migration_');
      addTearDown(() => dir.delete(recursive: true));
      final path = p.join(dir.path, 'old.db');

      // Recreate a database exactly as version 1 of the app left it.
      final v1 = await databaseFactoryFfi.openDatabase(
        path,
        options: OpenDatabaseOptions(
          version: 1,
          onCreate: (db, _) async {
            await db.execute('''
            CREATE TABLE users (
              id            INTEGER PRIMARY KEY AUTOINCREMENT,
              username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
              password_hash TEXT NOT NULL,
              created_at    TEXT NOT NULL
            )''');
            await db.insert('users', {
              'username': 'admin',
              'password_hash': await testHasher.hash('old-password'),
              'created_at': '2026-01-01T00:00:00.000Z',
            });
            await db.insert('users', {
              'username': 'alice',
              'password_hash': await testHasher.hash('alice-pw'),
              'created_at': '2026-01-01T00:00:00.000Z',
            });
          },
        ),
      );
      await v1.close();

      // Open with the current app: runs the pending migrations.
      final db = await AppDatabase.open(databaseFactoryFfi, path);
      addTearDown(db.close);
      final users = SqliteUserRepository(db);
      final auth = AuthService(users: users, hasher: testHasher);

      final all = await users.list();
      expect(all.map((u) => u.username), [
        'admin',
        'alice',
      ]); // no duplicate admin
      expect(all.firstWhere((u) => u.username == 'admin').role, UserRole.admin);
      expect(all.firstWhere((u) => u.username == 'alice').role, UserRole.user);
      expect(all.every((u) => u.isActive), isTrue);
      // The existing admin keeps their own password.
      expect(await auth.signIn('admin', 'old-password'), isNotNull);
      expect(await auth.signIn('alice', 'alice-pw'), isNotNull);
    },
  );
}
