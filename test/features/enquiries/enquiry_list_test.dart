import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/features/enquiries/data/enquiry_repository.dart';
import 'package:harbour_freight/src/features/enquiries/presentation/formatting.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../support/app_harness.dart';
import '../../support/test_enquiries.dart';

/// REQ-6: Everyone sees every enquiry in a paged list, newest first.
void main() {
  late Database db;
  late FlakyEnquiryRepository repo;

  /// Builds the app, lets [seed] add enquiries, then shows the login screen.
  Future<void> start(
    WidgetTester tester, {
    Future<void> Function(EnquiryRepository repo, int alice, int boss)? seed,
  }) async {
    // Tall enough that a whole page of 25 rows is built.
    tester.view.physicalSize = const Size(1600, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final (app, database) = await buildApp(
      tester,
      enquiries: (real) => repo = FlakyEnquiryRepository(real),
    );
    db = database;
    addTearDown(() => tester.runAsync(db.close));
    if (seed != null) {
      final alice = await userId(tester, db, 'alice');
      final boss = await userId(tester, db, 'boss');
      await tester.runAsync(() => seed(SqliteEnquiryRepository(db), alice, boss));
    }
    await tester.pumpWidget(app);
  }

  Future<void> signInAndLoad(WidgetTester tester, String user) async {
    await signIn(tester, user, 'pw');
    await settle(tester);
  }

  Finder row(String ref) => find.byKey(Key('enquiry-row-$ref'));

  Finder inRow(String ref, String text) =>
      find.descendant(of: row(ref), matching: find.text(text));

  testWidgets('2.1 Everyone sees everything', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      await addTestEnquiries(repo, alice); // ENQ-1001, alice's
      await addTestEnquiries(repo, boss); // ENQ-1002, boss's
    });
    await signInAndLoad(tester, 'alice');
    expect(inRow('ENQ-1001', 'alice'), findsOneWidget);
    expect(inRow('ENQ-1002', 'boss'), findsOneWidget);

    // THE RIVAL: boss sees the same two rows; neither is hidden.
    await tester.tap(find.byKey(const Key('sign-out')));
    await tester.pumpAndSettle();
    await signInAndLoad(tester, 'boss');
    expect(inRow('ENQ-1001', 'alice'), findsOneWidget);
    expect(inRow('ENQ-1002', 'boss'), findsOneWidget);
  });

  testWidgets('2.2 Newest first', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      // THE RIVAL: saved by different users.
      await addTestEnquiries(repo, alice);
      await addTestEnquiries(repo, boss);
      await addTestEnquiries(repo, alice);
    });
    await signInAndLoad(tester, 'alice');
    final y = [
      for (final ref in ['ENQ-1003', 'ENQ-1002', 'ENQ-1001'])
        tester.getTopLeft(row(ref)).dy,
    ];
    expect(y[0], lessThan(y[1]));
    expect(y[1], lessThan(y[2]));
  });

  testWidgets("2.3 The mock-up's columns", (tester) async {
    final received = DateTime.utc(2026, 11, 14, 9);
    await start(tester, seed: (repo, alice, boss) async {
      await repo.create(
        draft: kauriDraft(),
        ownerId: alice,
        createdById: alice,
        createdAt: received,
      );
    });
    await signInAndLoad(tester, 'alice');
    const ref = 'ENQ-1001';
    for (final header in [
      'Ref', 'Customer', 'Route', 'Cargo', 'Status', 'Owner', 'Received',
    ]) {
      expect(find.text(header), findsOneWidget, reason: header);
    }
    expect(inRow(ref, ref), findsOneWidget);
    expect(inRow(ref, 'Kauri Timber Exports'), findsOneWidget);
    expect(inRow(ref, 'Rangi Walker'), findsOneWidget);
    expect(
      tester.getTopLeft(inRow(ref, 'Rangi Walker')).dy,
      greaterThan(tester.getTopLeft(inRow(ref, 'Kauri Timber Exports')).dy),
      reason: 'the contact is below the company',
    );
    expect(inRow(ref, 'Tauranga → Yokohama'), findsOneWidget);
    expect(inRow(ref, '2 × 40ft containers, sawn timber'), findsOneWidget);
    expect(inRow(ref, 'New'), findsOneWidget);
    expect(inRow(ref, formatDayMonth(received)), findsOneWidget);
    // THE RIVAL: the owner column shows the username, not an id or a blank.
    expect(inRow(ref, 'alice'), findsOneWidget);
  });

  group('2.4 Paged 25 at a time', () {
    bool enabled(WidgetTester tester, String key) =>
        tester.widget<OutlinedButton>(find.byKey(Key(key))).onPressed != null;

    testWidgets('30 enquiries: first page ENQ-1030 to ENQ-1006, Next shows '
        'ENQ-1005 to ENQ-1001', (tester) async {
      await start(tester, seed: (repo, alice, boss) async {
        await addTestEnquiries(repo, alice, count: 30);
      });
      await signInAndLoad(tester, 'alice');
      expect(row('ENQ-1030'), findsOneWidget);
      expect(row('ENQ-1006'), findsOneWidget);
      expect(row('ENQ-1005'), findsNothing);
      expect(find.text('Showing 25 of 30 enquiries'), findsOneWidget);
      expect(enabled(tester, 'enquiries-previous'), isFalse);
      expect(enabled(tester, 'enquiries-next'), isTrue);

      await tester.tap(find.byKey(const Key('enquiries-next')));
      await settle(tester);
      expect(row('ENQ-1005'), findsOneWidget);
      expect(row('ENQ-1001'), findsOneWidget);
      expect(row('ENQ-1006'), findsNothing);
      expect(find.text('Showing 5 of 30 enquiries'), findsOneWidget);
      // THE RIVAL: on the last page Next is disabled.
      expect(enabled(tester, 'enquiries-next'), isFalse);
      expect(enabled(tester, 'enquiries-previous'), isTrue);
    });

    testWidgets('THE RIVAL: with exactly 25 enquiries there is no second page',
        (tester) async {
      await start(tester, seed: (repo, alice, boss) async {
        await addTestEnquiries(repo, alice, count: 25);
      });
      await signInAndLoad(tester, 'alice');
      expect(find.text('Showing 25 of 25 enquiries'), findsOneWidget);
      expect(enabled(tester, 'enquiries-next'), isFalse);
      expect(enabled(tester, 'enquiries-previous'), isFalse);
    });
  });

  testWidgets('2.5 A new enquiry appears straight away', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      await addTestEnquiries(repo, boss, count: 2);
    });
    await signInAndLoad(tester, 'alice');
    await tester.tap(find.byKey(const Key('new-enquiry')));
    await tester.pumpAndSettle();
    for (final e in {
      'company': 'Kauri Timber Exports',
      'contactName': 'Rangi Walker',
      'phone': '021 555 0101',
      'origin': 'Tauranga',
      'destination': 'Yokohama',
      'cargo': 'Sawn timber',
    }.entries) {
      await tester.enterText(find.byKey(Key('enquiry-form-${e.key}')), e.value);
    }
    await tester.tap(find.byKey(const Key('enquiry-form-save')));
    await settle(tester);
    await tester.pumpAndSettle();
    // The list reloads from the database once the form has closed.
    await settleUntil(tester, row('ENQ-1003'));

    expect(inRow('ENQ-1003', 'Kauri Timber Exports'), findsOneWidget);
    final y = [
      for (final ref in ['ENQ-1003', 'ENQ-1002', 'ENQ-1001'])
        tester.getTopLeft(row(ref)).dy,
    ];
    expect(y[0], lessThan(y[1]), reason: 'the new one is at the top');
    // THE RIVAL: the rest of the list is unchanged.
    expect(y[1], lessThan(y[2]));
    expect(inRow('ENQ-1002', 'boss'), findsOneWidget);
    expect(inRow('ENQ-1001', 'boss'), findsOneWidget);
    expect(find.text('Showing 3 of 3 enquiries'), findsOneWidget);
  });

  testWidgets('2.6 Empty list', (tester) async {
    await start(tester);
    await signInAndLoad(tester, 'alice');
    expect(find.text('No enquiries yet.'), findsOneWidget);
    expect(find.byKey(const Key('new-enquiry')), findsOneWidget);
    expect(find.byKey(const Key('enquiries-showing')), findsNothing);
    expect(find.byKey(const Key('enquiries-next')), findsNothing);
    expect(find.byKey(const Key('enquiries-previous')), findsNothing);

    // THE RIVAL: once one enquiry exists, the empty message is gone.
    final alice = await userId(tester, db, 'alice');
    await tester.runAsync(
        () => addTestEnquiries(SqliteEnquiryRepository(db), alice));
    await tester.tap(find.byKey(const Key('sign-out')));
    await tester.pumpAndSettle();
    await signInAndLoad(tester, 'alice');
    expect(find.text('No enquiries yet.'), findsNothing);
    expect(row('ENQ-1001'), findsOneWidget);
  });

  testWidgets('2.7 Load failure', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      await addTestEnquiries(repo, alice, count: 30);
    });
    repo.failPage = 1;
    await signInAndLoad(tester, 'alice');
    expect(find.text('Enquiries could not be loaded.'), findsOneWidget);
    expect(find.byKey(const Key('enquiries-retry')), findsOneWidget);

    await tester.tap(find.byKey(const Key('enquiries-retry')));
    await settle(tester);
    expect(find.text('Enquiries could not be loaded.'), findsNothing);
    expect(row('ENQ-1030'), findsOneWidget);

    // THE RIVAL: a failure while a list is showing does not leave the old
    // page on screen as if it were current.
    repo.failPage = 1;
    await tester.tap(find.byKey(const Key('enquiries-next')));
    await settle(tester);
    expect(find.text('Enquiries could not be loaded.'), findsOneWidget);
    expect(row('ENQ-1030'), findsNothing);
    expect(find.byKey(const Key('enquiries-showing')), findsNothing);

    await tester.tap(find.byKey(const Key('enquiries-retry')));
    await settle(tester);
    expect(row('ENQ-1005'), findsOneWidget, reason: 'retries the same page');
  });
}
