import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../domain/enquiry.dart';

/// The first reference ever given out is ENQ-1001 (A4).
const firstReferenceNumber = 1001;

/// Persistence for enquiries. All SQL for the `enquiries` and
/// `enquiry_history` tables lives here.
///
/// There is deliberately no way to update or delete history (A15, D11), and
/// no way to delete an enquiry (D15).
abstract class EnquiryRepository {
  /// Saves a new enquiry with the next reference number, and its `created`
  /// history entry, in one transaction. If anything fails, nothing is kept
  /// and no reference number is used up (D12).
  ///
  /// [draft] must already be validated and trimmed; blank optional values
  /// must be empty strings.
  Future<Enquiry> create({
    required EnquiryDraft draft,
    required int ownerId,
    required int createdById,
    required DateTime createdAt,
  });

  /// One page of enquiries, highest reference first (D4).
  Future<EnquiryPage> page({required int pageIndex, required int pageSize});

  Future<Enquiry?> findById(int id);
}

class SqliteEnquiryRepository implements EnquiryRepository {
  SqliteEnquiryRepository(this._db);

  final Database _db;

  static const _select = '''
    SELECT e.*, o.username AS owner_username, c.username AS created_by_username
    FROM enquiries e
    JOIN users o ON o.id = e.owner_id
    JOIN users c ON c.id = e.created_by
  ''';

  @override
  Future<Enquiry> create({
    required EnquiryDraft draft,
    required int ownerId,
    required int createdById,
    required DateTime createdAt,
  }) async {
    final id = await _db.transaction((txn) async {
      final next = await txn.rawQuery(
        'SELECT COALESCE(MAX(reference_number), ?) + 1 AS n FROM enquiries',
        [firstReferenceNumber - 1],
      );
      final referenceNumber = next.first['n'] as int;
      final at = createdAt.toUtc().toIso8601String();
      final enquiryId = await txn.insert('enquiries', {
        'reference_number': referenceNumber,
        'status': EnquiryStatus.newEnquiry.stored,
        'owner_id': ownerId,
        'company': draft.company,
        'contact_name': draft.contactName,
        'email': _nullIfEmpty(draft.email),
        'phone': _nullIfEmpty(draft.phone),
        'origin': draft.origin,
        'destination': draft.destination,
        'cargo': draft.cargo,
        'ready_date': draft.readyDate == null ? null : _dateOnly(draft.readyDate!),
        'created_at': at,
        'created_by': createdById,
      });
      await txn.insert('enquiry_history', {
        'enquiry_id': enquiryId,
        'happened_at': at,
        'actor_id': createdById,
        'event': 'created',
        'details': null,
      });
      return enquiryId;
    });
    return (await findById(id))!;
  }

  @override
  Future<EnquiryPage> page({
    required int pageIndex,
    required int pageSize,
  }) async {
    final count = await _db.rawQuery('SELECT COUNT(*) AS n FROM enquiries');
    final rows = await _db.rawQuery(
      '$_select ORDER BY e.reference_number DESC LIMIT ? OFFSET ?',
      [pageSize, pageIndex * pageSize],
    );
    return EnquiryPage(
      items: rows.map(_toEnquiry).toList(),
      total: count.first['n'] as int,
      pageIndex: pageIndex,
      pageSize: pageSize,
    );
  }

  @override
  Future<Enquiry?> findById(int id) async {
    final rows = await _db.rawQuery('$_select WHERE e.id = ?', [id]);
    return rows.isEmpty ? null : _toEnquiry(rows.single);
  }

  static String? _nullIfEmpty(String value) => value.isEmpty ? null : value;

  static String _dateOnly(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  Enquiry _toEnquiry(Map<String, Object?> row) {
    final ready = row['ready_date'] as String?;
    return Enquiry(
      id: row['id'] as int,
      referenceNumber: row['reference_number'] as int,
      status: EnquiryStatus.fromStored(row['status'] as String),
      ownerId: row['owner_id'] as int,
      ownerUsername: row['owner_username'] as String,
      company: row['company'] as String,
      contactName: row['contact_name'] as String,
      email: row['email'] as String?,
      phone: row['phone'] as String?,
      origin: row['origin'] as String,
      destination: row['destination'] as String,
      cargo: row['cargo'] as String,
      readyDate: ready == null ? null : DateTime.parse(ready),
      createdAt: DateTime.parse(row['created_at'] as String),
      createdById: row['created_by'] as int,
      createdByUsername: row['created_by_username'] as String,
    );
  }
}
