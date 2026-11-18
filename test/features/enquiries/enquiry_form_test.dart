import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/features/enquiries/presentation/enquiry_form_controller.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../support/app_harness.dart';
import '../../support/test_enquiries.dart';

/// REQ-5 at screen level: the New enquiry form.
void main() {
  Future<Database> openForm(WidgetTester tester) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final (app, db) = await buildApp(tester);
    addTearDown(() => tester.runAsync(db.close));
    await tester.pumpWidget(app);
    await signIn(tester, 'alice', 'pw');
    await tester.tap(find.byKey(const Key('new-enquiry')));
    await tester.pumpAndSettle();
    return db;
  }

  Future<void> fill(WidgetTester tester, Map<String, String> values) async {
    for (final e in values.entries) {
      await tester.enterText(find.byKey(Key('enquiry-form-${e.key}')), e.value);
    }
  }

  const complete = {
    'company': 'Kauri Timber Exports',
    'contactName': 'Rangi Walker',
    'email': 'rangi@kauri.co.nz',
    'origin': 'Tauranga',
    'destination': 'Yokohama',
    'cargo': '2 × 40ft containers, sawn timber',
  };

  String typed(WidgetTester tester, String field) => tester
      .widget<TextField>(find.byKey(Key('enquiry-form-$field')))
      .controller!
      .text;

  Future<void> save(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('enquiry-form-save')));
    await settle(tester);
    await tester.pumpAndSettle();
  }

  testWidgets(
      '1.7 An unexpected failure is shown, not swallowed: the form stays open '
      'with every typed value and shows the could-not-be-saved message',
      (tester) async {
    final db = await openForm(tester);
    await tester.runAsync(() => breakHistoryWrites(db));
    await fill(tester, complete);
    await save(tester);

    expect(find.text(EnquiryFormController.couldNotSave), findsOneWidget);
    expect(find.byKey(const Key('enquiry-form-save')), findsOneWidget);
    for (final e in complete.entries) {
      expect(typed(tester, e.key), e.value, reason: e.key);
    }

    // THE RIVAL: no enquiry and no history row exist afterwards.
    expect(await tester.runAsync(() => countRows(db, 'enquiries')), 0);
    expect(await tester.runAsync(() => countRows(db, 'enquiry_history')), 0);
  });

  testWidgets(
      '1.3 at screen level: a blank required field is named on that field '
      'and nothing typed is lost', (tester) async {
    await openForm(tester);
    await fill(tester, {...complete, 'company': '   '});
    await save(tester);
    expect(find.text('Company is required.'), findsOneWidget);
    expect(typed(tester, 'contactName'), 'Rangi Walker');
    expect(typed(tester, 'cargo'), complete['cargo']);
  });

  testWidgets(
      '1.2 and 1.4 at screen level: neither email nor phone, and a bad '
      'email, are refused with a message', (tester) async {
    final db = await openForm(tester);
    await fill(tester, {...complete, 'email': ''});
    await save(tester);
    final error = find.byKey(const Key('enquiry-form-error'));
    expect(error, findsOneWidget);
    expect(tester.widget<Text>(error).data, contains('email or a phone'));

    await fill(tester, {'email': 'kim-at-kauri', 'phone': '021 555 0101'});
    await save(tester);
    expect(find.text('Email must look like name@domain.'), findsOneWidget);
    expect(await tester.runAsync(() => countRows(db, 'enquiries')), 0);
  });

  testWidgets('a complete enquiry saves and the form closes', (tester) async {
    final db = await openForm(tester);
    await fill(tester, complete);
    await save(tester);
    expect(find.byKey(const Key('enquiry-form-save')), findsNothing);
    expect(await tester.runAsync(() => countRows(db, 'enquiries')), 1);
  });
}
