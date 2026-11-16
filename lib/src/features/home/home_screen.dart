import 'package:flutter/material.dart';

import '../admin/domain/user_admin_service.dart';
import '../admin/presentation/user_admin_controller.dart';
import '../admin/presentation/user_admin_screen.dart';
import '../auth/presentation/auth_controller.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.auth, required this.userAdmin});

  final AuthController auth;
  final UserAdminService userAdmin;

  void _openUsers(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => UserAdminScreen(
        controller: UserAdminController(userAdmin, auth.currentUser!),
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
      body: const Center(child: Text('Welcome to Harbour Freight')),
    );
  }
}
