import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/features/auth/data/user_repository.dart';
import 'package:harbour_freight/src/features/auth/domain/auth_service.dart';
import 'package:harbour_freight/src/features/auth/domain/user.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../support/test_database.dart';
import '../../support/test_users.dart';

void main() {
  late Database db;
  late SqliteUserRepository users;
  late AuthService auth;

  setUp(() async {
    db = await openTestDatabase();
    users = SqliteUserRepository(db);
    auth = AuthService(users: users, hasher: testHasher);
  });

  tearDown(() => db.close());

  test('a user can sign in with the correct password', () async {
    await addTestUser(users, 'alice', 'correct horse');

    final user = await auth.signIn('alice', 'correct horse');

    expect(user, isNotNull);
    expect(user!.username, 'alice');
  });

  test('a wrong password is rejected', () async {
    await addTestUser(users, 'alice', 'correct horse');

    expect(await auth.signIn('alice', 'wrong'), isNull);
  });

  test('an unknown user is rejected', () async {
    expect(await auth.signIn('nobody', 'whatever'), isNull);
  });

  test('empty credentials are rejected', () async {
    expect(await auth.signIn('', ''), isNull);
  });

  test('usernames are case-insensitive', () async {
    await addTestUser(users, 'Alice', 'pw');

    expect(await auth.signIn('alice', 'pw'), isNotNull);
  });

  test('a disabled account cannot sign in', () async {
    await addTestUser(users, 'alice', 'pw', isActive: false);

    expect(await auth.signIn('alice', 'pw'), isNull);
  });

  test('passwords are stored hashed, never in plain text', () async {
    await addTestUser(users, 'alice', 'correct horse');

    final record = await users.findByUsername('alice');

    expect(record!.passwordHash, isNot(contains('correct horse')));
    expect(record.passwordHash, startsWith('pbkdf2\$'));
  });

  test('the database ships with a default admin who can sign in', () async {
    final user = await auth.signIn('admin', 'ChangeMe123!');

    expect(user, isNotNull);
    expect(user!.role, UserRole.admin);
    expect(user.isActive, isTrue);
  });
}
