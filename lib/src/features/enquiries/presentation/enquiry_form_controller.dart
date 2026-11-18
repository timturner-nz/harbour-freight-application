import 'package:flutter/foundation.dart';

import '../../../core/exceptions.dart';
import '../../auth/domain/user.dart';
import '../domain/enquiry.dart';
import '../domain/enquiry_service.dart';

/// What happened when the form was saved.
class EnquirySaveOutcome {
  const EnquirySaveOutcome.saved(Enquiry this.enquiry)
      : field = null,
        message = null;

  const EnquirySaveOutcome.refused(String this.message, {this.field})
      : enquiry = null;

  final Enquiry? enquiry;

  /// The field to mark as wrong, when the broken rule is about one field.
  final EnquiryField? field;
  final String? message;

  bool get succeeded => enquiry != null;
}

/// Saves the New enquiry form. Never throws: a broken rule comes back with
/// its message, and any other failure comes back as one plain message, so
/// the form stays open with everything typed (REQ-5, R5).
class EnquiryFormController {
  EnquiryFormController(this._service, this.actor);

  final EnquiryService _service;
  final User actor;

  static const couldNotSave =
      'The enquiry could not be saved. Nothing was saved. Please try again.';

  Future<EnquirySaveOutcome> save(EnquiryDraft draft) async {
    try {
      return EnquirySaveOutcome.saved(await _service.record(actor, draft));
    } on EnquiryValidationException catch (e) {
      return EnquirySaveOutcome.refused(e.message, field: e.field);
    } on ValidationException catch (e) {
      return EnquirySaveOutcome.refused(e.message);
    } catch (e, stack) {
      debugPrint('Saving an enquiry failed: $e\n$stack');
      return const EnquirySaveOutcome.refused(couldNotSave);
    }
  }
}
