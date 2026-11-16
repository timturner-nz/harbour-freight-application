import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/features/auth/data/user_repository.dart';
import 'package:harbour_freight/src/features/auth/domain/user.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../support/test_database.dart';
import '../../support/test_users.dart';

void main() {
  late Database db;
  late SqliteUserRepository users;

  setUp(() async {
    db = await openTestDatabase();
    users = SqliteUserRepository(db);
  });
  tearDown(() => db.close());

  test(
    'create stores a user that can be found by id and by username',
    () async {
      final created = await addTestUser(users, 'alice', 'pw');

      expect((await users.findById(created.id))!.username, 'alice');
      final record = await users.findByUsername('alice');
      expect(record!.user.id, created.id);
      expect(record.user.role, UserRole.user);
      expect(record.user.isActive, isTrue);
      expect(record.passwordHash, isNotEmpty);
    },
  );

  test('find returns null when nothing matches', () async {
    expect(await users.findById(9999), isNull);
    expect(await users.findByUsername('nobody'), isNull);
  });

  test('findByUsername ignores case', () async {
    await addTestUser(users, 'Alice', 'pw');

    expect(await users.findByUsername('alice'), isNotNull);
  });

  test('update changes username, role and active flag', () async {
    final created = await addTestUser(users, 'alice', 'pw');

    await users.update(
      created.id,
      username: 'alicia',
      role: UserRole.admin,
      isActive: false,
    );

    final updated = (await users.findById(created.id))!;
    expect(updated.username, 'alicia');
    expect(updated.role, UserRole.admin);
    expect(updated.isActive, isFalse);
  });

  test('updatePasswordHash replaces only the hash', () async {
    final created = await addTestUser(users, 'alice', 'pw');

    await users.updatePasswordHash(created.id, 'new-hash');

    final record = (await users.findByUsername('alice'))!;
    expect(record.passwordHash, 'new-hash');
    expect(record.user.username, 'alice');
  });

  test('list is ordered by username, ignoring case', () async {
    await addTestUser(users, 'zed', 'pw');
    await addTestUser(users, 'Bob', 'pw');

    final names = (await users.list()).map((u) => u.username).toList();

    expect(names, ['admin', 'Bob', 'zed']);
  });

  test('countActiveAdmins counts only active administrators', () async {
    expect(await users.countActiveAdmins(), 1); // the default admin
    await addTestUser(users, 'boss', 'pw', role: UserRole.admin);
    await addTestUser(
      users,
      'gone',
      'pw',
      role: UserRole.admin,
      isActive: false,
    );
    await addTestUser(users, 'alice', 'pw');

    expect(await users.countActiveAdmins(), 2);
  });
}
