import '../../../core/clock.dart';
import '../../../core/exceptions.dart';
import '../../auth/domain/user.dart';
import '../data/enquiry_repository.dart';
import 'enquiry.dart';

/// The New enquiry form fields a rule can be broken on.
enum EnquiryField {
  company('Company'),
  contactName('Contact name'),
  email('Email'),
  phone('Phone'),
  origin('Where from'),
  destination('Where to'),
  cargo('Cargo');

  const EnquiryField(this.label);

  final String label;
}

/// A broken rule on one field of the form, so the form can say which field
/// is wrong (REQ-5). [field] is null when the rule spans fields.
class EnquiryValidationException extends ValidationException {
  const EnquiryValidationException(super.message, {this.field});

  final EnquiryField? field;
}

/// Business rules for enquiries. Every operation names the [actor] doing it
/// and is refused unless that user is active (P1). Being an admin grants
/// nothing extra here: recording is open to every active user (A11, A20).
class EnquiryService {
  EnquiryService({required this._enquiries, this._clock = systemClock});

  final EnquiryRepository _enquiries;
  final Clock _clock;

  /// 25 enquiries to a page (D8).
  static const pageSize = 25;

  // D2: an email must look like name@domain.
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+$');

  // D2: a phone has digits, and may also have spaces, +, (, ) and -.
  static final _phoneChars = RegExp(r'^[0-9 +()\-]+$');
  static final _digit = RegExp(r'[0-9]');

  /// Records a new enquiry owned by [actor] (A19, A20), with status New (D1).
  Future<Enquiry> record(User actor, EnquiryDraft draft) async {
    _requireActive(actor);
    final clean = _validated(draft);
    return _enquiries.create(
      draft: clean,
      ownerId: actor.id,
      createdById: actor.id,
      createdAt: _clock(),
    );
  }

  /// Everyone sees every enquiry (A11): there is no filter by owner.
  Future<EnquiryPage> page(User actor, int pageIndex) async {
    _requireActive(actor);
    return _enquiries.page(pageIndex: pageIndex, pageSize: pageSize);
  }

  Future<Enquiry?> find(User actor, int id) async {
    _requireActive(actor);
    return _enquiries.findById(id);
  }

  void _requireActive(User actor) {
    if (!actor.isActive) {
      throw const ValidationException('Your account is disabled.');
    }
  }

  EnquiryDraft _validated(EnquiryDraft d) {
    String need(String value, EnquiryField field) {
      final v = value.trim();
      if (v.isEmpty) {
        throw EnquiryValidationException(
          '${field.label} is required.',
          field: field,
        );
      }
      return v;
    }

    final company = need(d.company, EnquiryField.company);
    final contactName = need(d.contactName, EnquiryField.contactName);
    final origin = need(d.origin, EnquiryField.origin);
    final destination = need(d.destination, EnquiryField.destination);
    final cargo = need(d.cargo, EnquiryField.cargo);

    final email = d.email.trim();
    final phone = d.phone.trim();
    if (email.isEmpty && phone.isEmpty) {
      throw const EnquiryValidationException(
        'Enter an email or a phone number. One is enough.',
      );
    }
    // D10: a value that is entered must be valid, even when the other is.
    if (email.isNotEmpty && !_email.hasMatch(email)) {
      throw const EnquiryValidationException(
        'Email must look like name@domain.',
        field: EnquiryField.email,
      );
    }
    if (phone.isNotEmpty &&
        !(_phoneChars.hasMatch(phone) && _digit.hasMatch(phone))) {
      throw const EnquiryValidationException(
        'Phone must contain digits, and only digits, spaces, +, ( ) and -.',
        field: EnquiryField.phone,
      );
    }

    final ready = d.readyDate;
    return EnquiryDraft(
      company: company,
      contactName: contactName,
      email: email,
      phone: phone,
      origin: origin,
      destination: destination,
      cargo: cargo,
      readyDate:
          ready == null ? null : DateTime(ready.year, ready.month, ready.day),
    );
  }
}
