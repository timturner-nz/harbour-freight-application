import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/features/enquiries/data/enquiry_repository.dart';
import 'package:harbour_freight/src/features/enquiries/presentation/formatting.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../support/app_harness.dart';
import '../../support/test_enquiries.dart';

/// REQ-7: Anyone can open an enquiry from the list to read everything
/// recorded about it.
void main() {
  late Database db;
  late FlakyEnquiryRepository repo;
  final recordedAt = DateTime.utc(2026, 11, 14, 9, 5);

  Future<void> start(
    WidgetTester tester, {
    Future<void> Function(EnquiryRepository repo, int alice, int boss)? seed,
  }) async {
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

  Future<void> signInAs(WidgetTester tester, String user) async {
    await signIn(tester, user, 'pw');
    await settle(tester);
  }

  Future<void> signOut(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('sign-out')));
    await tester.pumpAndSettle();
  }

  Finder row(String ref) => find.byKey(Key('enquiry-row-$ref'));

  /// Opens a row, lets the real database read finish (the spinner turns
  /// until it does), then lets the route transition end.
  Future<void> open(WidgetTester tester, String ref) async {
    await tester.tap(row(ref));
    await tester.pump();
    await settleUntil(
      tester,
      find.byWidgetPredicate((w) =>
          w.key == const Key('enquiry-detail-company') ||
          w.key == const Key('enquiry-detail-failed')),
    );
  }

  Future<void> back(WidgetTester tester) async {
    await tester.pageBack();
    await tester.pumpAndSettle();
  }

  String detail(WidgetTester tester, String key) {
    final texts = tester.widgetList<Text>(find.descendant(
        of: find.byKey(Key('enquiry-detail-$key')),
        matching: find.byType(Text)));
    return texts.map((t) => t.data).join(' ');
  }

  void expectReadOnly(WidgetTester tester) {
    expect(find.byKey(const Key('enquiry-detail-company')), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(find.byType(ButtonStyleButton), findsNothing,
        reason: 'no edit, status, reassign or note buttons');
    for (final word in ['Edit', 'Reassign', 'Change status', 'Add note']) {
      expect(find.textContaining(word), findsNothing, reason: word);
    }
  }

  testWidgets('3.1 Everything recorded is shown', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      await repo.create(
        draft: kauriDraft(
          phone: '+64 21 (123) 4567',
          readyDate: DateTime(2026, 12, 1),
        ),
        ownerId: alice,
        createdById: alice,
        createdAt: recordedAt,
      );
      // THE RIVAL: no email and no ready date.
      await repo.create(
        draft: kauriDraft(email: '', phone: '021 555 0101'),
        ownerId: alice,
        createdById: alice,
        createdAt: recordedAt,
      );
    });
    await signInAs(tester, 'alice');
    await open(tester, 'ENQ-1001');

    final expected = {
      'reference': 'ENQ-1001',
      'status': 'New',
      'owner': 'alice',
      'company': 'Kauri Timber Exports',
      'contactName': 'Rangi Walker',
      'email': 'rangi@kauri.co.nz',
      'phone': '+64 21 (123) 4567',
      'origin': 'Tauranga',
      'destination': 'Yokohama',
      'cargo': '2 × 40ft containers, sawn timber',
      'readyDate': '1 Dec 2026',
      'recorded': '${formatDateTime(recordedAt)} by alice',
    };
    for (final e in expected.entries) {
      expect(detail(tester, e.key), e.value, reason: e.key);
    }

    await back(tester);
    await open(tester, 'ENQ-1002');
    expect(detail(tester, 'email'), 'Not given');
    expect(detail(tester, 'readyDate'), 'Not given');
    expect(detail(tester, 'phone'), '021 555 0101');
    expect(find.textContaining('null'), findsNothing);
  });

  testWidgets('3.2 Anyone can open any enquiry', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      await addTestEnquiries(repo, alice); // ENQ-1001, alice owns
      await addTestEnquiries(repo, boss); // ENQ-1002, boss owns
    });

    // alice (regular) opens boss's enquiry.
    await signInAs(tester, 'alice');
    await open(tester, 'ENQ-1002');
    expect(detail(tester, 'owner'), 'boss');
    // THE RIVAL: no controls to change it, whoever is looking.
    expectReadOnly(tester); // a regular user, not the owner
    await back(tester);
    await open(tester, 'ENQ-1001');
    expectReadOnly(tester); // the owner
    await back(tester);
    await signOut(tester);

    await signInAs(tester, 'boss');
    await open(tester, 'ENQ-1001');
    expectReadOnly(tester); // an admin, not the owner
    await back(tester);
    await open(tester, 'ENQ-1002');
    expectReadOnly(tester); // an admin who owns it
  });

  testWidgets('3.3 It matches the list', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      await addTestEnquiries(repo, alice, count: 15);
      await addTestEnquiries(repo, boss, count: 15);
    });
    await signInAs(tester, 'alice');
    // Go to page 2 (ENQ-1005 to ENQ-1001).
    await tester.tap(find.byKey(const Key('enquiries-next')));
    await settle(tester);
    const ref = 'ENQ-1003';
    final rowTop = tester.getTopLeft(row(ref)).dy;
    Finder inRow(String t) =>
        find.descendant(of: row(ref), matching: find.text(t));
    expect(inRow('New'), findsOneWidget);
    expect(inRow('alice'), findsOneWidget);

    await open(tester, ref);
    expect(detail(tester, 'reference'), ref);
    expect(detail(tester, 'status'), 'New');
    expect(detail(tester, 'owner'), 'alice');

    // THE RIVAL: back returns to the same page, same row in place.
    await back(tester);
    expect(find.text('Showing 5 of 30 enquiries'), findsOneWidget);
    expect(row(ref), findsOneWidget);
    expect(tester.getTopLeft(row(ref)).dy, rowTop);
    expect(row('ENQ-1030'), findsNothing);
  });

  testWidgets('3.4 Load failure', (tester) async {
    await start(tester, seed: (repo, alice, boss) async {
      await addTestEnquiries(repo, alice, count: 2);
    });
    await signInAs(tester, 'alice');
    repo.failFind = 1;
    await open(tester, 'ENQ-1002');
    expect(find.text('This enquiry could not be loaded.'), findsOneWidget);
    expect(find.byKey(const Key('enquiry-detail-company')), findsNothing);

    // THE RIVAL: no crash, and the list still works afterwards.
    expect(tester.takeException(), isNull);
    await tester.tap(find.byKey(const Key('enquiry-detail-back')));
    await tester.pumpAndSettle();
    expect(row('ENQ-1002'), findsOneWidget);
    expect(row('ENQ-1001'), findsOneWidget);
    await open(tester, 'ENQ-1001');
    expect(detail(tester, 'reference'), 'ENQ-1001');
  });
}
