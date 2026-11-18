import 'package:flutter_test/flutter_test.dart';
import 'package:harbour_freight/src/core/exceptions.dart';
import 'package:harbour_freight/src/features/auth/data/user_repository.dart';
import 'package:harbour_freight/src/features/auth/domain/user.dart';
import 'package:harbour_freight/src/features/enquiries/data/enquiry_repository.dart';
import 'package:harbour_freight/src/features/enquiries/domain/enquiry.dart';
import 'package:harbour_freight/src/features/enquiries/domain/enquiry_service.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../support/test_database.dart';
import '../../support/test_enquiries.dart';
import '../../support/test_users.dart';

/// REQ-5: Anyone signed in can record a new enquiry and get its reference
/// number. Each test is named with the acceptance check it proves.
void main() {
  final now = DateTime.utc(2026, 11, 19, 9, 30);

  late Database db;
  late EnquiryService service;
  late User alice; // regular user
  late User boss; // administrator

  setUp(() async {
    db = await openTestDatabase();
    final users = SqliteUserRepository(db);
    alice = await addTestUser(users, 'alice', 'pw');
    boss = await addTestUser(users, 'boss', 'pw', role: UserRole.admin);
    service = EnquiryService(
      enquiries: SqliteEnquiryRepository(db),
      clock: () => now,
    );
  });

  tearDown(() => db.close());

  test('1.1 A complete enquiry saves as ENQ-1001, New, owned by whoever saved it',
      () async {
    final first = await service.record(alice, kauriDraft());
    expect(first.reference, 'ENQ-1001');
    expect(first.status, EnquiryStatus.newEnquiry);
    expect(first.ownerId, alice.id);
    expect(first.ownerUsername, 'alice');

    // THE RIVAL: an admin saving the next one owns it themselves.
    final second = await service.record(boss, kauriDraft(company: 'Other Ltd'));
    expect(second.reference, 'ENQ-1002');
    expect(second.ownerId, boss.id);
    expect(second.ownerUsername, 'boss');
    expect((await service.find(alice, first.id))!.ownerUsername, 'alice');
  });

  group('1.2 Email or phone, one is enough', () {
    test('phone only succeeds, and email only succeeds', () async {
      final byPhone = await service.record(
          alice, kauriDraft(email: '', phone: '021 555 0101'));
      expect(byPhone.phone, '021 555 0101');
      expect(byPhone.email, isNull);

      final byEmail =
          await service.record(alice, kauriDraft(email: 'kim@kauri.co.nz'));
      expect(byEmail.email, 'kim@kauri.co.nz');
      expect(byEmail.phone, isNull);
    });

    test('THE RIVAL: neither is refused with a message and nothing is stored',
        () async {
      await expectLater(
        service.record(alice, kauriDraft(email: '  ', phone: '')),
        throwsA(isA<EnquiryValidationException>().having(
            (e) => e.message, 'message', contains('email or a phone'))),
      );
      expect(await countRows(db, 'enquiries'), 0);
    });
  });

  group('1.3 Each required field is required', () {
    final cases = <EnquiryField, EnquiryDraft Function(String)>{
      EnquiryField.company: (v) => kauriDraft(company: v),
      EnquiryField.contactName: (v) => kauriDraft(contactName: v),
      EnquiryField.origin: (v) => kauriDraft(origin: v),
      EnquiryField.destination: (v) => kauriDraft(destination: v),
      EnquiryField.cargo: (v) => kauriDraft(cargo: v),
    };
    for (final entry in cases.entries) {
      for (final blank in ['', '   ']) {
        test('${entry.key.label} "$blank" is refused, naming the field',
            () async {
          await expectLater(
            service.record(alice, entry.value(blank)),
            throwsA(isA<EnquiryValidationException>()
                .having((e) => e.field, 'field', entry.key)
                .having((e) => e.message, 'message',
                    contains(entry.key.label))),
          );
          expect(await countRows(db, 'enquiries'), 0);
        });
      }
    }

    test('THE RIVAL: leaving the ready date blank is accepted', () async {
      final saved = await service.record(alice, kauriDraft(readyDate: null));
      expect(saved.readyDate, isNull);
    });
  });

  group('1.4 Email and phone formats', () {
    test('kim@kauri.co.nz and +64 21 (123) 4567 are accepted', () async {
      final saved = await service.record(
        alice,
        kauriDraft(email: 'kim@kauri.co.nz', phone: '+64 21 (123) 4567'),
      );
      expect(saved.email, 'kim@kauri.co.nz');
      expect(saved.phone, '+64 21 (123) 4567');
    });

    test('kim-at-kauri and call me are refused', () async {
      await expectLater(
        service.record(alice, kauriDraft(email: 'kim-at-kauri')),
        throwsA(isA<EnquiryValidationException>()
            .having((e) => e.field, 'field', EnquiryField.email)),
      );
      await expectLater(
        service.record(alice, kauriDraft(email: '', phone: 'call me')),
        throwsA(isA<EnquiryValidationException>()
            .having((e) => e.field, 'field', EnquiryField.phone)),
      );
      expect(await countRows(db, 'enquiries'), 0);
    });

    test('THE RIVAL: an invalid email is refused even with a valid phone',
        () async {
      await expectLater(
        service.record(
            alice, kauriDraft(email: 'kim-at-kauri', phone: '021 555 0101')),
        throwsA(isA<EnquiryValidationException>()
            .having((e) => e.field, 'field', EnquiryField.email)),
      );
      expect(await countRows(db, 'enquiries'), 0);
    });
  });

  group('1.5 References run in order and are never reused', () {
    test('three saves give ENQ-1001, ENQ-1002 and ENQ-1003', () async {
      final refs = [
        for (var i = 0; i < 3; i++)
          (await service.record(alice, kauriDraft())).reference,
      ];
      expect(refs, ['ENQ-1001', 'ENQ-1002', 'ENQ-1003']);
    });

    test('THE RIVAL: a refused save in between uses up no number', () async {
      await service.record(alice, kauriDraft());
      await expectLater(
        service.record(alice, kauriDraft(company: '')),
        throwsA(isA<ValidationException>()),
      );
      expect((await service.record(alice, kauriDraft())).reference, 'ENQ-1002');
    });

    test('THE RIVAL: a failed save in between uses up no number', () async {
      await service.record(alice, kauriDraft());
      await breakHistoryWrites(db);
      await expectLater(
          service.record(alice, kauriDraft()), throwsA(isA<DatabaseException>()));
      await allowHistoryWrites(db);
      expect((await service.record(alice, kauriDraft())).reference, 'ENQ-1002');
    });

    test('THE RIVAL: the database rejects a second enquiry with an existing '
        'reference', () async {
      await service.record(alice, kauriDraft());
      await expectLater(
        db.insert('enquiries', {
          'reference_number': 1001,
          'status': 'new',
          'owner_id': alice.id,
          'company': 'Copy Ltd',
          'contact_name': 'Someone',
          'email': 'a@b.co',
          'origin': 'Napier',
          'destination': 'Sydney',
          'cargo': 'Apples',
          'created_at': now.toIso8601String(),
          'created_by': alice.id,
        }),
        throwsA(isA<DatabaseException>()),
      );
    });
  });

  group('1.6 Creation is recorded in the history, in the same transaction', () {
    test('each save writes exactly one history entry naming who and when',
        () async {
      final first = await service.record(alice, kauriDraft());
      final second = await service.record(boss, kauriDraft());
      final rows = await db.query('enquiry_history', orderBy: 'id');
      expect(rows, hasLength(2));
      expect(rows[0]['enquiry_id'], first.id);
      expect(rows[0]['actor_id'], alice.id);
      expect(rows[0]['event'], 'created');
      expect(rows[0]['happened_at'], now.toIso8601String());
      expect(rows[1]['enquiry_id'], second.id);
      expect(rows[1]['actor_id'], boss.id);
      expect(first.createdAt, now);
    });

    test('THE RIVAL: if the history write fails, the enquiry is not saved',
        () async {
      await breakHistoryWrites(db);
      await expectLater(
          service.record(alice, kauriDraft()), throwsA(isA<DatabaseException>()));
      expect(await countRows(db, 'enquiries'), 0);
      expect(await countRows(db, 'enquiry_history'), 0);
    });

    test('THE RIVAL: an UPDATE or a DELETE run directly against the history '
        'table is refused', () async {
      await service.record(alice, kauriDraft());
      await expectLater(
        db.rawUpdate("UPDATE enquiry_history SET event = 'edited'"),
        throwsA(isA<DatabaseException>()),
      );
      await expectLater(
        db.rawDelete('DELETE FROM enquiry_history'),
        throwsA(isA<DatabaseException>()),
      );
      final rows = await db.query('enquiry_history');
      expect(rows, hasLength(1));
      expect(rows.single['event'], 'created');
    });
  });

  group('1.8 Only an active user may record', () {
    test('the service refuses an inactive actor', () async {
      final users = SqliteUserRepository(db);
      final gone = await addTestUser(users, 'gone', 'pw', isActive: false);
      await expectLater(
        service.record(gone, kauriDraft()),
        throwsA(isA<ValidationException>()),
      );
      expect(await countRows(db, 'enquiries'), 0);
    });

    test('THE RIVAL: an active regular user (not an admin) is allowed',
        () async {
      expect(alice.isAdmin, isFalse);
      final saved = await service.record(alice, kauriDraft());
      expect(saved.ownerUsername, 'alice');
    });
  });
}
