import 'package:flutter/material.dart';

import '../admin/domain/user_admin_service.dart';
import '../admin/presentation/user_admin_controller.dart';
import '../admin/presentation/user_admin_screen.dart';
import '../auth/presentation/auth_controller.dart';
import '../enquiries/domain/enquiry.dart';
import '../enquiries/domain/enquiry_service.dart';
import '../enquiries/presentation/enquiry_form_controller.dart';
import '../enquiries/presentation/enquiry_form_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.auth,
    required this.userAdmin,
    required this.enquiries,
  });

  final AuthController auth;
  final UserAdminService userAdmin;
  final EnquiryService enquiries;

  void _openUsers(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => UserAdminScreen(
        controller: UserAdminController(userAdmin, auth.currentUser!),
      ),
    ));
  }

  Future<Enquiry?> _newEnquiry(BuildContext context) {
    return Navigator.of(context).push(MaterialPageRoute<Enquiry>(
      builder: (_) => EnquiryFormScreen(
        controller: EnquiryFormController(enquiries, auth.currentUser!),
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final user = auth.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Harbour Freight'),
        actions: [
          if (user != null && user.isAdmin)
            TextButton.icon(
              key: const Key('open-users'),
              onPressed: () => _openUsers(context),
              icon: const Icon(Icons.group),
              label: const Text('Users'),
            ),
          Center(child: Text(user?.username ?? '')),
          IconButton(
            key: const Key('sign-out'),
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: auth.signOut,
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
                  onPressed: () => _newEnquiry(context),
                  icon: const Icon(Icons.add),
                  label: const Text('New enquiry'),
                ),
              ],
            ),
          ),
          const Expanded(
            child: Center(child: Text('Welcome to Harbour Freight')),
          ),
        ],
      ),
    );
  }
}
