import 'package:harbour_freight/src/features/enquiries/data/enquiry_repository.dart';
import 'package:harbour_freight/src/features/enquiries/domain/enquiry.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// A complete, valid enquiry like the mock-up's Kauri Timber one.
EnquiryDraft kauriDraft({
  String company = 'Kauri Timber Exports',
  String contactName = 'Rangi Walker',
  String email = 'rangi@kauri.co.nz',
  String phone = '',
  String origin = 'Tauranga',
  String destination = 'Yokohama',
  String cargo = '2 × 40ft containers, sawn timber',
  DateTime? readyDate,
}) =>
    EnquiryDraft(
      company: company,
      contactName: contactName,
      email: email,
      phone: phone,
      origin: origin,
      destination: destination,
      cargo: cargo,
      readyDate: readyDate,
    );

/// Adds [count] enquiries owned and recorded by [ownerId], straight through
/// the repository. They get references ENQ-1001 upwards, in order.
Future<void> addTestEnquiries(
  EnquiryRepository enquiries,
  int ownerId, {
  int count = 1,
}) async {
  for (var i = 0; i < count; i++) {
    await enquiries.create(
      draft: kauriDraft(company: 'Company ${i + 1}'),
      ownerId: ownerId,
      createdById: ownerId,
      createdAt: DateTime.utc(2026, 11, 14, 9),
    );
  }
}

Future<int> countRows(Database db, String table) async =>
    (await db.rawQuery('SELECT COUNT(*) AS n FROM $table')).first['n'] as int;

/// Makes every insert into the history table fail, to simulate the history
/// write failing part-way through a save. Undo with [allowHistoryWrites].
Future<void> breakHistoryWrites(Database db) => db.execute('''
  CREATE TRIGGER test_break_history BEFORE INSERT ON enquiry_history
  BEGIN SELECT RAISE(ABORT, 'simulated history failure'); END
''');

Future<void> allowHistoryWrites(Database db) =>
    db.execute('DROP TRIGGER test_break_history');

/// Wraps the real repository so a test can make reads fail on purpose.
/// Each `fail…` count is how many calls in a row throw before it recovers.
class FlakyEnquiryRepository implements EnquiryRepository {
  FlakyEnquiryRepository(this._real);

  final EnquiryRepository _real;
  int failPage = 0;
  int failFind = 0;

  @override
  Future<Enquiry> create({
    required EnquiryDraft draft,
    required int ownerId,
    required int createdById,
    required DateTime createdAt,
  }) =>
      _real.create(
        draft: draft,
        ownerId: ownerId,
        createdById: createdById,
        createdAt: createdAt,
      );

  @override
  Future<EnquiryPage> page({required int pageIndex, required int pageSize}) {
    if (failPage > 0) {
      failPage--;
      throw StateError('simulated list failure');
    }
    return _real.page(pageIndex: pageIndex, pageSize: pageSize);
  }

  @override
  Future<Enquiry?> findById(int id) {
    if (failFind > 0) {
      failFind--;
      throw StateError('simulated read failure');
    }
    return _real.findById(id);
  }
}
