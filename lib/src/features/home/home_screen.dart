import 'package:flutter/material.dart';

import '../admin/domain/user_admin_service.dart';
import '../admin/presentation/user_admin_controller.dart';
import '../admin/presentation/user_admin_screen.dart';
import '../auth/presentation/auth_controller.dart';
import '../enquiries/domain/enquiry.dart';
import '../enquiries/domain/enquiry_service.dart';
import '../enquiries/presentation/enquiry_detail_screen.dart';
import '../enquiries/presentation/enquiry_form_controller.dart';
import '../enquiries/presentation/enquiry_form_screen.dart';
import '../enquiries/presentation/enquiry_list_controller.dart';
import '../enquiries/presentation/enquiry_list_view.dart';

/// After signing in: every enquiry, newest first, and the New enquiry action
/// (REQ-5, REQ-6).
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.auth,
    required this.userAdmin,
    required this.enquiries,
  });

  final AuthController auth;
  final UserAdminService userAdmin;
  final EnquiryService enquiries;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final _list =
      EnquiryListController(widget.enquiries, widget.auth.currentUser!);

  @override
  void initState() {
    super.initState();
    _list.load(0);
  }

  @override
  void dispose() {
    _list.dispose();
    super.dispose();
  }

  void _openUsers() {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => UserAdminScreen(
        controller:
            UserAdminController(widget.userAdmin, widget.auth.currentUser!),
      ),
    ));
  }

  Future<void> _newEnquiry() async {
    final saved = await Navigator.of(context).push(MaterialPageRoute<Enquiry>(
      builder: (_) => EnquiryFormScreen(
        controller:
            EnquiryFormController(widget.enquiries, widget.auth.currentUser!),
      ),
    ));
    // A saved enquiry shows at the top of the first page straight away.
    if (saved != null && mounted) await _list.showNewest();
  }

  // Opens on top of the list; going back returns to the same page (REQ-7).
  void _openEnquiry(Enquiry enquiry) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => EnquiryDetailScreen(
        service: widget.enquiries,
        actor: widget.auth.currentUser!,
        enquiryId: enquiry.id,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.auth.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Harbour Freight'),
        actions: [
          if (user != null && user.isAdmin)
            TextButton.icon(
              key: const Key('open-users'),
              onPressed: _openUsers,
              icon: const Icon(Icons.group),
              label: const Text('Users'),
            ),
          Center(child: Text(user?.username ?? '')),
          IconButton(
            key: const Key('sign-out'),
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: widget.auth.signOut,
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
            child: Row(
              children: [
                Text('Enquiries',
                    style: Theme.of(context).textTheme.titleLarge),
                const Spacer(),
                FilledButton.icon(
                  key: const Key('new-enquiry'),
                  onPressed: _newEnquiry,
                  icon: const Icon(Icons.add),
                  label: const Text('New enquiry'),
                ),
              ],
            ),
          ),
          Expanded(
            child: EnquiryListView(controller: _list, onOpen: _openEnquiry),
          ),
        ],
      ),
    );
  }
}
