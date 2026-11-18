import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/app_harness.dart';

void main() {
  testWidgets('signing in shows home; signing out returns to login', (
    tester,
  ) async {
    final (app, db) = await buildApp(tester);
    addTearDown(() => tester.runAsync(db.close));

    await tester.pumpWidget(app);
    expect(find.byKey(const Key('login-submit')), findsOneWidget);

    await signIn(tester, 'alice', 'pw');
    expect(find.byKey(const Key('new-enquiry')), findsOneWidget);

    await tester.tap(find.byKey(const Key('sign-out')));
    await tester.pump();
    expect(find.byKey(const Key('login-submit')), findsOneWidget);
  });

  testWidgets('a wrong password shows an error and stays on login', (
    tester,
  ) async {
    final (app, db) = await buildApp(tester);
    addTearDown(() => tester.runAsync(db.close));

    await tester.pumpWidget(app);
    await signIn(tester, 'alice', 'nope');

    expect(find.byKey(const Key('login-error')), findsOneWidget);
    expect(find.byKey(const Key('new-enquiry')), findsNothing);
  });
}
