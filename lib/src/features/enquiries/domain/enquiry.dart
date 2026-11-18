/// Where an enquiry is at (A8). Stored in lower case, shown capitalised (D17).
enum EnquiryStatus {
  newEnquiry('new', 'New'),
  quoted('quoted', 'Quoted'),
  won('won', 'Won'),
  lost('lost', 'Lost');

  const EnquiryStatus(this.stored, this.label);

  /// The value held in the database.
  final String stored;

  /// The word shown to people.
  final String label;

  static EnquiryStatus fromStored(String value) =>
      values.firstWhere((s) => s.stored == value);
}

/// What a person types into the New enquiry form, before it is saved.
class EnquiryDraft {
  const EnquiryDraft({
    required this.company,
    required this.contactName,
    this.email = '',
    this.phone = '',
    required this.origin,
    required this.destination,
    required this.cargo,
    this.readyDate,
  });

  final String company;
  final String contactName;
  final String email;
  final String phone;
  final String origin;
  final String destination;
  final String cargo;

  /// Optional (A3). Only the date part is kept.
  final DateTime? readyDate;
}

/// A recorded customer enquiry.
class Enquiry {
  const Enquiry({
    required this.id,
    required this.referenceNumber,
    required this.status,
    required this.ownerId,
    required this.ownerUsername,
    required this.company,
    required this.contactName,
    this.email,
    this.phone,
    required this.origin,
    required this.destination,
    required this.cargo,
    this.readyDate,
    required this.createdAt,
    required this.createdById,
    required this.createdByUsername,
  });

  final int id;

  /// The number part of the reference: 1001 is shown as ENQ-1001 (D14).
  final int referenceNumber;
  final EnquiryStatus status;
  final int ownerId;
  final String ownerUsername;
  final String company;
  final String contactName;
  final String? email;
  final String? phone;
  final String origin;
  final String destination;
  final String cargo;
  final DateTime? readyDate;

  /// When it was recorded, in UTC.
  final DateTime createdAt;
  final int createdById;
  final String createdByUsername;

  /// The reference people see: `ENQ-` and at least four digits (A4).
  String get reference => formatReference(referenceNumber);

  static String formatReference(int number) =>
      'ENQ-${number.toString().padLeft(4, '0')}';
}

/// One page of the enquiry list, newest first.
class EnquiryPage {
  const EnquiryPage({
    required this.items,
    required this.total,
    required this.pageIndex,
    required this.pageSize,
  });

  final List<Enquiry> items;

  /// How many enquiries exist in all.
  final int total;

  /// Zero-based.
  final int pageIndex;
  final int pageSize;

  bool get hasPrevious => pageIndex > 0;
  bool get hasNext => (pageIndex + 1) * pageSize < total;
}
