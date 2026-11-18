import 'package:flutter/material.dart';

import '../domain/enquiry.dart';
import '../domain/enquiry_service.dart';
import 'enquiry_form_controller.dart';
import 'formatting.dart';

/// The New enquiry form (REQ-5). Pops with the saved [Enquiry]; stays open,
/// keeping everything typed, when the save is refused or fails.
class EnquiryFormScreen extends StatefulWidget {
  const EnquiryFormScreen({super.key, required this.controller});

  final EnquiryFormController controller;

  @override
  State<EnquiryFormScreen> createState() => _EnquiryFormScreenState();
}

class _EnquiryFormScreenState extends State<EnquiryFormScreen> {
  final _text = {
    for (final f in EnquiryField.values) f: TextEditingController(),
  };
  DateTime? _readyDate;
  EnquiryField? _errorField;
  String? _error;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in _text.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
      _errorField = null;
    });
    String v(EnquiryField f) => _text[f]!.text;
    final outcome = await widget.controller.save(EnquiryDraft(
      company: v(EnquiryField.company),
      contactName: v(EnquiryField.contactName),
      email: v(EnquiryField.email),
      phone: v(EnquiryField.phone),
      origin: v(EnquiryField.origin),
      destination: v(EnquiryField.destination),
      cargo: v(EnquiryField.cargo),
      readyDate: _readyDate,
    ));
    if (!mounted) return;
    if (outcome.succeeded) {
      Navigator.of(context).pop(outcome.enquiry);
    } else {
      setState(() {
        _saving = false;
        _error = outcome.message;
        _errorField = outcome.field;
      });
    }
  }

  Future<void> _pickReadyDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _readyDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (picked != null) setState(() => _readyDate = picked);
  }

  Widget _field(EnquiryField f, {String? hint, bool requiredField = true}) {
    return TextField(
      key: Key('enquiry-form-${f.name}'),
      controller: _text[f],
      enabled: !_saving,
      decoration: InputDecoration(
        labelText: requiredField ? '${f.label} *' : f.label,
        hintText: hint,
        errorText: _errorField == f ? _error : null,
      ),
    );
  }

  Widget _pair(Widget a, Widget b) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: a),
          const SizedBox(width: 16),
          Expanded(child: b),
        ],
      );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // A message that is not about one field shows above the Save button.
    final generalError = _errorField == null ? _error : null;
    return Scaffold(
      appBar: AppBar(title: const Text('New enquiry')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _pair(_field(EnquiryField.company),
                    _field(EnquiryField.contactName)),
                const SizedBox(height: 16),
                _pair(
                  _field(EnquiryField.email,
                      hint: 'name@domain', requiredField: false),
                  _field(EnquiryField.phone,
                      hint: '+64 21 123 4567', requiredField: false),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('An email or a phone number is needed. One is '
                      'enough.',
                      style: theme.textTheme.bodySmall),
                ),
                const SizedBox(height: 16),
                _pair(_field(EnquiryField.origin),
                    _field(EnquiryField.destination)),
                const SizedBox(height: 16),
                _field(EnquiryField.cargo, hint: 'What is moving'),
                const SizedBox(height: 16),
                Row(
                  children: [
                    OutlinedButton.icon(
                      key: const Key('enquiry-form-readyDate'),
                      onPressed: _saving ? null : _pickReadyDate,
                      icon: const Icon(Icons.event),
                      label: Text(_readyDate == null
                          ? 'Ready date (optional)'
                          : 'Ready ${formatDate(_readyDate!)}'),
                    ),
                    if (_readyDate != null)
                      IconButton(
                        tooltip: 'Clear ready date',
                        onPressed: _saving
                            ? null
                            : () => setState(() => _readyDate = null),
                        icon: const Icon(Icons.clear),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                if (generalError != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      generalError,
                      key: const Key('enquiry-form-error'),
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed:
                          _saving ? null : () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      key: const Key('enquiry-form-save'),
                      onPressed: _saving ? null : _save,
                      child: const Text('Save enquiry'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
