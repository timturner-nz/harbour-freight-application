import 'package:flutter/foundation.dart';

import '../../../core/exceptions.dart';
import '../../auth/domain/user.dart';
import '../domain/user_admin_service.dart';

/// Holds the user list for the admin screen. Save methods return an error
/// message to show the person, or `null` on success.
class UserAdminController extends ChangeNotifier {
  UserAdminController(this._service, this.actor);

  final UserAdminService _service;
  final User actor;

  List<User> _users = const [];
  List<User> get users => _users;

  bool _loading = false;
  bool get loading => _loading;

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    _users = await _service.listUsers(actor);
    _loading = false;
    notifyListeners();
  }

  Future<String?> create({
    required String username,
    required String password,
    required UserRole role,
  }) =>
      _save(() => _service.createUser(
            actor,
            username: username,
            password: password,
            role: role,
          ));

  Future<String?> update({
    required User user,
    required String username,
    required UserRole role,
    required bool isActive,
    String? newPassword,
  }) =>
      _save(() => _service.updateUser(
            actor,
            id: user.id,
            username: username,
            role: role,
            isActive: isActive,
            newPassword: newPassword,
          ));

  Future<String?> _save(Future<User> Function() action) async {
    try {
      await action();
    } on ValidationException catch (e) {
      return e.message;
    }
    await load();
    return null;
  }
}
