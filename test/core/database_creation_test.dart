import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/core/database/migrations.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../support/test_database.dart';

void main() {
  late Database db;

  setUp(() async => db = await openTestDatabase());
  tearDown(() => db.close());

  test('a new database is created at the latest schema version', () async {
    expect(await db.getVersion(), migrations.last.version);
  });

  test(
    'a new database has the users table with the expected columns',
    () async {
      final columns = (await db.rawQuery(
        'PRAGMA table_info(users)',
      )).map((row) => row['name']).toSet();

      expect(
        columns,
        containsAll([
          'id',
          'username',
          'password_hash',
          'created_at',
          'role',
          'is_active',
        ]),
      );
    },
  );

  test('usernames are unique, ignoring case', () async {
    // The migration already created the default admin.
    expect(
      () => db.insert('users', {
        'username': 'ADMIN',
        'password_hash': 'x',
        'created_at': '2026-01-01T00:00:00.000Z',
      }),
      throwsA(isA<DatabaseException>()),
    );
  });

  test('foreign keys are enforced', () async {
    final rows = await db.rawQuery('PRAGMA foreign_keys');
    expect(rows.first['foreign_keys'], 1);
  });
}
