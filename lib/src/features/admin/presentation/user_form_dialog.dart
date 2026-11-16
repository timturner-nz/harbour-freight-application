import 'package:flutter/material.dart';

import '../../auth/domain/user.dart';

class UserFormValues {
  const UserFormValues({
    required this.username,
    required this.password,
    required this.role,
    required this.isActive,
  });

  final String username;
  final String password;
  final UserRole role;
  final bool isActive;
}

/// Add or edit a user. Pass [existing] to edit. [onSubmit] returns an error
/// message to display, or `null` when the save succeeded (closing the dialog).
class UserFormDialog extends StatefulWidget {
  const UserFormDialog({super.key, this.existing, required this.onSubmit});

  final User? existing;
  final Future<String?> Function(UserFormValues values) onSubmit;

  @override
  State<UserFormDialog> createState() => _UserFormDialogState();
}

class _UserFormDialogState extends State<UserFormDialog> {
  late final _username =
      TextEditingController(text: widget.existing?.username ?? '');
  final _password = TextEditingController();
  late UserRole _role = widget.existing?.role ?? UserRole.user;
  late bool _isActive = widget.existing?.isActive ?? true;
  String? _error;
  bool _saving = false;

  bool get _editing => widget.existing != null;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    final error = await widget.onSubmit(UserFormValues(
      username: _username.text,
      password: _password.text,
      role: _role,
      isActive: _isActive,
    ));
    if (!mounted) return;
    if (error == null) {
      Navigator.of(context).pop();
    } else {
      setState(() {
        _saving = false;
        _error = error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_editing ? 'Edit user' : 'Add user'),
      content: SizedBox(
        width: 360,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              key: const Key('user-form-username'),
              controller: _username,
              decoration: const InputDecoration(labelText: 'Username'),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('user-form-password'),
              controller: _password,
              obscureText: true,
              decoration: InputDecoration(
                labelText: _editing ? 'New password (optional)' : 'Password',
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<UserRole>(
              key: const Key('user-form-role'),
              initialValue: _role,
              decoration: const InputDecoration(labelText: 'Role'),
              items: [
                for (final r in UserRole.values)
                  DropdownMenuItem(value: r, child: Text(r.name)),
              ],
              onChanged: (r) => setState(() => _role = r ?? _role),
            ),
            SwitchListTile(
              key: const Key('user-form-active'),
              contentPadding: EdgeInsets.zero,
              title: const Text('Active'),
              value: _isActive,
              onChanged: (v) => setState(() => _isActive = v),
            ),
            if (_error != null)
              Text(_error!,
                  key: const Key('user-form-error'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          key: const Key('user-form-save'),
          onPressed: _saving ? null : _save,
          child: const Text('Save'),
        ),
      ],
    );
  }
}
