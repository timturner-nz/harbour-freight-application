import 'package:flutter/material.dart';

import '../../auth/domain/user.dart';
import '../domain/enquiry.dart';
import '../domain/enquiry_service.dart';
import 'enquiry_list_view.dart';
import 'formatting.dart';

/// Everything recorded about one enquiry, read-only for everyone (REQ-7).
/// Slice 1 has no edit, status, reassign or note controls, and does not
/// show the history (D5).
class EnquiryDetailScreen extends StatefulWidget {
  const EnquiryDetailScreen({
    super.key,
    required this.service,
    required this.actor,
    required this.enquiryId,
  });

  final EnquiryService service;
  final User actor;
  final int enquiryId;

  @override
  State<EnquiryDetailScreen> createState() => _EnquiryDetailScreenState();
}

class _EnquiryDetailScreenState extends State<EnquiryDetailScreen> {
  Enquiry? _enquiry;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    Enquiry? found;
    var failed = false;
    try {
      found = await widget.service.find(widget.actor, widget.enquiryId);
      failed = found == null;
    } catch (e, stack) {
      debugPrint('Loading enquiry ${widget.enquiryId} failed: $e\n$stack');
      failed = true;
    }
    if (!mounted) return;
    setState(() {
      _enquiry = found;
      _failed = failed;
    });
  }

  @override
  Widget build(BuildContext context) {
    final e = _enquiry;
    return Scaffold(
      appBar: AppBar(title: Text(e?.reference ?? 'Enquiry')),
      body: _failed
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('This enquiry could not be loaded.',
                      key: Key('enquiry-detail-failed')),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    key: const Key('enquiry-detail-back'),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Back to the list'),
                  ),
                ],
              ),
            )
          : e == null
              ? const Center(child: CircularProgressIndicator())
              : _Details(enquiry: e),
    );
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.enquiry});

  final Enquiry enquiry;

  @override
  Widget build(BuildContext context) {
    final e = enquiry;
    String orNotGiven(String? v) => (v == null || v.isEmpty) ? notGiven : v;
    final rows = <(String, String, Widget)>[
      ('reference', 'Reference', Text(e.reference)),
      ('status', 'Status', Align(
          alignment: Alignment.centerLeft, child: StatusBadge(status: e.status))),
      ('owner', 'Owner', Text(e.ownerUsername)),
      ('company', 'Company', Text(e.company)),
      ('contactName', 'Contact name', Text(e.contactName)),
      ('email', 'Email', Text(orNotGiven(e.email))),
      ('phone', 'Phone', Text(orNotGiven(e.phone))),
      ('origin', 'Where from', Text(e.origin)),
      ('destination', 'Where to', Text(e.destination)),
      ('cargo', 'Cargo', Text(e.cargo)),
      ('readyDate', 'Ready date',
          Text(e.readyDate == null ? notGiven : formatDate(e.readyDate!))),
      ('recorded', 'Recorded',
          Text('${formatDateTime(e.createdAt)} by ${e.createdByUsername}')),
    ];
    final labelStyle = Theme.of(context).textTheme.labelLarge;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (key, label, value) in rows)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 160, child: Text(label, style: labelStyle)),
                      Expanded(
                        child: KeyedSubtree(
                            key: Key('enquiry-detail-$key'), child: value),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
