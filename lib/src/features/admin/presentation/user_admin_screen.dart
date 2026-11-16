import 'package:flutter/material.dart';

import '../../auth/domain/user.dart';
import 'user_admin_controller.dart';
import 'user_form_dialog.dart';

class UserAdminScreen extends StatefulWidget {
  const UserAdminScreen({super.key, required this.controller});

  final UserAdminController controller;

  @override
  State<UserAdminScreen> createState() => _UserAdminScreenState();
}

class _UserAdminScreenState extends State<UserAdminScreen> {
  @override
  void initState() {
    super.initState();
    widget.controller.load();
  }

  void _add() => showDialog<void>(
        context: context,
        builder: (_) => UserFormDialog(
          onSubmit: (v) => widget.controller
              .create(username: v.username, password: v.password, role: v.role),
        ),
      );

  void _edit(User user) => showDialog<void>(
        context: context,
        builder: (_) => UserFormDialog(
          existing: user,
          onSubmit: (v) => widget.controller.update(
            user: user,
            username: v.username,
            role: v.role,
            isActive: v.isActive,
            newPassword: v.password,
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton.icon(
              key: const Key('add-user'),
              onPressed: _add,
              icon: const Icon(Icons.person_add),
              label: const Text('Add user'),
            ),
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: widget.controller,
        builder: (context, _) {
          final users = widget.controller.users;
          if (widget.controller.loading && users.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            children: [
              for (final u in users)
                ListTile(
                  key: Key('user-row-${u.username}'),
                  leading: Icon(u.isAdmin
                      ? Icons.admin_panel_settings
                      : Icons.person_outline),
                  title: Text(u.username),
                  subtitle: Text(
                      '${u.role.name}${u.isActive ? '' : ' · disabled'}'),
                  trailing: IconButton(
                    key: Key('edit-user-${u.username}'),
                    tooltip: 'Edit',
                    icon: const Icon(Icons.edit),
                    onPressed: () => _edit(u),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
