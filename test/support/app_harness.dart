import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/app.dart';
import 'package:harbour_freight/src/features/admin/domain/user_admin_service.dart';
import 'package:harbour_freight/src/features/auth/data/user_repository.dart';
import 'package:harbour_freight/src/features/auth/domain/auth_service.dart';
import 'package:harbour_freight/src/features/auth/domain/user.dart';
import 'package:harbour_freight/src/features/auth/presentation/auth_controller.dart';
import 'package:harbour_freight/src/features/enquiries/data/enquiry_repository.dart';
import 'package:harbour_freight/src/features/enquiries/domain/enquiry_service.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'test_database.dart';
import 'test_users.dart';

/// Builds the app against a real in-memory database with users
/// alice (regular, pw) and boss (admin, pw). Real database work runs via
/// `runAsync` because the widget tester uses a fake clock.
///
/// [enquiries] can wrap the real enquiry repository, for example to make it
/// fail on purpose.
Future<(HarbourFreightApp, Database)> buildApp(
  WidgetTester tester, {
  EnquiryRepository Function(EnquiryRepository real)? enquiries,
}) async {
  return (await tester.runAsync(() async {
    final db = await openTestDatabase();
    final users = SqliteUserRepository(db);
    await addTestUser(users, 'alice', 'pw');
    await addTestUser(users, 'boss', 'pw', role: UserRole.admin);
    final real = SqliteEnquiryRepository(db);
    final app = HarbourFreightApp(
      auth: AuthController(AuthService(users: users, hasher: testHasher)),
      userAdmin: UserAdminService(users: users, hasher: testHasher),
      enquiries: EnquiryService(
        enquiries: enquiries == null ? real : enquiries(real),
        clock: () => DateTime.utc(2026, 11, 19, 9, 30),
      ),
    );
    return (app, db);
  }))!;
}

/// The id of a test user, read from the database.
Future<int> userId(WidgetTester tester, Database db, String username) async =>
    (await tester.runAsync(() async => (await db.query('users',
            where: 'username = ?', whereArgs: [username]))
        .single['id'] as int))!;

/// Lets real asynchronous database work finish, then rebuilds the UI.
Future<void> settle(WidgetTester tester) async {
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 300)),
  );
  await tester.pump();
  await tester.pump();
}

/// Waits (up to ~5s of real time) for [finder] to match something, letting
/// real asynchronous database work progress between checks.
Future<void> settleUntil(WidgetTester tester, Finder finder) async {
  for (var i = 0; i < 50 && finder.evaluate().isEmpty; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 100)),
    );
    await tester.pump();
  }
  await tester.pumpAndSettle();
}

/// Opens the admin Users screen (as an admin) and waits for it to load.
Future<void> openUsers(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('open-users')));
  await tester.pump();
  await settle(tester); // lets the user list load
  await tester.pumpAndSettle(); // finishes the route transition
}

Future<void> signIn(WidgetTester tester, String user, String pass) async {
  await tester.enterText(find.byKey(const Key('login-username')), user);
  await tester.enterText(find.byKey(const Key('login-password')), pass);
  await tester.tap(find.byKey(const Key('login-submit')));
  await settle(tester);
}
