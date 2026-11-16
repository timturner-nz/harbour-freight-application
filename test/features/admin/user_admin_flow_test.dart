import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/app_harness.dart';

void main() {
  testWidgets('a regular user does not see the Users link', (tester) async {
    final (app, db) = await buildApp(tester);
    addTearDown(() => tester.runAsync(db.close));
    await tester.pumpWidget(app);

    await signIn(tester, 'alice', 'pw');

    expect(find.text('Welcome to Harbour Freight'), findsOneWidget);
    expect(find.byKey(const Key('open-users')), findsNothing);
  });

  testWidgets('an admin can add and edit a user', (tester) async {
    final (app, db) = await buildApp(tester);
    addTearDown(() => tester.runAsync(db.close));
    await tester.pumpWidget(app);
    await signIn(tester, 'boss', 'pw');

    await openUsers(tester);
    expect(find.byKey(const Key('user-row-alice')), findsOneWidget);
    expect(find.byKey(const Key('user-row-boss')), findsOneWidget);

    // Add
    await tester.tap(find.byKey(const Key('add-user')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('user-form-username')),
      'newbie',
    );
    await tester.enterText(
      find.byKey(const Key('user-form-password')),
      'longenough1',
    );
    await tester.tap(find.byKey(const Key('user-form-save')));
    await settleUntil(tester, find.byKey(const Key('user-row-newbie')));
    expect(find.byKey(const Key('user-row-newbie')), findsOneWidget);

    // Edit: disable
    await tester.tap(find.byKey(const Key('edit-user-newbie')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('user-form-active')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('user-form-save')));
    await settleUntil(tester, find.textContaining('disabled'));
    expect(find.textContaining('disabled'), findsOneWidget);
  });

  testWidgets('a rule violation is shown in the dialog', (tester) async {
    final (app, db) = await buildApp(tester);
    addTearDown(() => tester.runAsync(db.close));
    await tester.pumpWidget(app);
    await signIn(tester, 'boss', 'pw');
    await openUsers(tester);

    await tester.tap(find.byKey(const Key('add-user')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('user-form-username')),
      'alice',
    );
    await tester.enterText(
      find.byKey(const Key('user-form-password')),
      'longenough1',
    );
    await tester.tap(find.byKey(const Key('user-form-save')));
    await settleUntil(tester, find.byKey(const Key('user-form-error')));

    expect(find.byKey(const Key('user-form-error')), findsOneWidget);
    expect(find.textContaining('already taken'), findsOneWidget);
  });
}
