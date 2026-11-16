import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/core/exceptions.dart';
import 'package:harbour_freight/src/features/admin/domain/user_admin_service.dart';
import 'package:harbour_freight/src/features/auth/data/user_repository.dart';
import 'package:harbour_freight/src/features/auth/domain/auth_service.dart';
import 'package:harbour_freight/src/features/auth/domain/user.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../support/test_database.dart';
import '../../support/test_users.dart';

void main() {
  late Database db;
  late SqliteUserRepository users;
  late UserAdminService admin;
  late AuthService auth;
  late User root;

  setUp(() async {
    db = await openTestDatabase();
    users = SqliteUserRepository(db);
    admin = UserAdminService(users: users, hasher: testHasher);
    auth = AuthService(users: users, hasher: testHasher);
    root = await seededAdmin(users);
  });

  tearDown(() => db.close());

  Matcher rejectsWith(String text) => throwsA(
    isA<ValidationException>().having(
      (e) => e.message,
      'message',
      contains(text),
    ),
  );

  group('default admin', () {
    test('exists exactly once, active, with the admin role', () async {
      final all = await users.list();

      expect(all.map((u) => u.username), ['admin']);
      expect(root.role, UserRole.admin);
      expect(root.isActive, isTrue);
    });
  });

  group('creating users', () {
    test('an admin can add a user who can then sign in', () async {
      final created = await admin.createUser(
        root,
        username: 'bob',
        password: 'longenough1',
        role: UserRole.user,
      );

      expect(created.role, UserRole.user);
      expect(created.isActive, isTrue);
      expect(await auth.signIn('bob', 'longenough1'), isNotNull);
    });

    test('a duplicate username is refused, ignoring case', () async {
      await admin.createUser(
        root,
        username: 'bob',
        password: 'longenough1',
        role: UserRole.user,
      );

      expect(
        admin.createUser(
          root,
          username: 'BOB',
          password: 'longenough1',
          role: UserRole.user,
        ),
        rejectsWith('already taken'),
      );
    });

    test('a blank username is refused', () {
      expect(
        admin.createUser(
          root,
          username: '  ',
          password: 'longenough1',
          role: UserRole.user,
        ),
        rejectsWith('Username is required'),
      );
    });

    test('a short password is refused', () {
      expect(
        admin.createUser(
          root,
          username: 'bob',
          password: 'short',
          role: UserRole.user,
        ),
        rejectsWith('at least 8'),
      );
    });
  });

  group('editing users', () {
    late User bob;
    setUp(() async {
      bob = await admin.createUser(
        root,
        username: 'bob',
        password: 'longenough1',
        role: UserRole.user,
      );
    });

    test('can rename, change role and disable', () async {
      final updated = await admin.updateUser(
        root,
        id: bob.id,
        username: 'robert',
        role: UserRole.admin,
        isActive: false,
      );

      expect(updated.username, 'robert');
      expect(updated.role, UserRole.admin);
      expect(updated.isActive, isFalse);
    });

    test('a disabled user can no longer sign in', () async {
      await admin.updateUser(
        root,
        id: bob.id,
        username: 'bob',
        role: UserRole.user,
        isActive: false,
      );

      expect(await auth.signIn('bob', 'longenough1'), isNull);
    });

    test('a new password replaces the old one', () async {
      await admin.updateUser(
        root,
        id: bob.id,
        username: 'bob',
        role: UserRole.user,
        isActive: true,
        newPassword: 'brandnewpass',
      );

      expect(await auth.signIn('bob', 'longenough1'), isNull);
      expect(await auth.signIn('bob', 'brandnewpass'), isNotNull);
    });

    test('an empty new password leaves the password unchanged', () async {
      await admin.updateUser(
        root,
        id: bob.id,
        username: 'bob',
        role: UserRole.user,
        isActive: true,
        newPassword: '',
      );

      expect(await auth.signIn('bob', 'longenough1'), isNotNull);
    });

    test('cannot take another user\'s username', () {
      expect(
        admin.updateUser(
          root,
          id: bob.id,
          username: 'admin',
          role: UserRole.user,
          isActive: true,
        ),
        rejectsWith('already taken'),
      );
    });

    test('keeping your own username is not a clash', () async {
      final updated = await admin.updateUser(
        root,
        id: bob.id,
        username: 'bob',
        role: UserRole.admin,
        isActive: true,
      );

      expect(updated.role, UserRole.admin);
    });
  });

  group('the last administrator', () {
    test('cannot be demoted', () {
      expect(
        admin.updateUser(
          root,
          id: root.id,
          username: 'admin',
          role: UserRole.user,
          isActive: true,
        ),
        rejectsWith('at least one active administrator'),
      );
    });

    test('cannot be disabled', () {
      expect(
        admin.updateUser(
          root,
          id: root.id,
          username: 'admin',
          role: UserRole.admin,
          isActive: false,
        ),
        rejectsWith('at least one active administrator'),
      );
    });

    test('can be demoted once another active admin exists', () async {
      await admin.createUser(
        root,
        username: 'second',
        password: 'longenough1',
        role: UserRole.admin,
      );

      final updated = await admin.updateUser(
        root,
        id: root.id,
        username: 'admin',
        role: UserRole.user,
        isActive: true,
      );

      expect(updated.role, UserRole.user);
    });
  });

  group('authorisation', () {
    test('a non-admin cannot list, create or edit users', () async {
      final regular = await addTestUser(users, 'carol', 'pw12345678');

      expect(admin.listUsers(regular), rejectsWith('Only administrators'));
      expect(
        admin.createUser(
          regular,
          username: 'x',
          password: 'longenough1',
          role: UserRole.user,
        ),
        rejectsWith('Only administrators'),
      );
      expect(
        admin.updateUser(
          regular,
          id: root.id,
          username: 'admin',
          role: UserRole.admin,
          isActive: true,
        ),
        rejectsWith('Only administrators'),
      );
    });

    test('a disabled admin is refused', () async {
      final disabled = await addTestUser(
        users,
        'dave',
        'pw12345678',
        role: UserRole.admin,
        isActive: false,
      );

      expect(admin.listUsers(disabled), rejectsWith('Only administrators'));
    });
  });
}
