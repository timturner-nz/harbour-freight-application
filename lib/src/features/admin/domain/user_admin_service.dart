import '../../../core/clock.dart';
import '../../../core/exceptions.dart';
import '../../auth/data/user_repository.dart';
import '../../auth/domain/password_hasher.dart';
import '../../auth/domain/user.dart';

/// Business rules for managing users. Every operation names the [actor]
/// performing it and is refused unless that user is an active administrator.
class UserAdminService {
  UserAdminService({
    required this._users,
    required this._hasher,
    this._clock = systemClock,
  });

  final UserRepository _users;
  final PasswordHasher _hasher;
  final Clock _clock;

  static const minPasswordLength = 8;

  Future<List<User>> listUsers(User actor) async {
    _requireAdmin(actor);
    return _users.list();
  }

  Future<User> createUser(
    User actor, {
    required String username,
    required String password,
    required UserRole role,
  }) async {
    _requireAdmin(actor);
    final name = await _validatedUsername(username);
    _validatePassword(password);
    return _users.create(
      username: name,
      passwordHash: await _hasher.hash(password),
      role: role,
      isActive: true,
      createdAt: _clock(),
    );
  }

  /// Updates a user. A non-empty [newPassword] replaces their password.
  Future<User> updateUser(
    User actor, {
    required int id,
    required String username,
    required UserRole role,
    required bool isActive,
    String? newPassword,
  }) async {
    _requireAdmin(actor);
    final existing = await _users.findById(id);
    if (existing == null) throw const ValidationException('User not found.');

    final name = await _validatedUsername(username, ignoreId: id);
    final changingPassword = newPassword != null && newPassword.isNotEmpty;
    if (changingPassword) _validatePassword(newPassword);

    final losesAdminAccess =
        existing.isAdmin && existing.isActive && (role != UserRole.admin || !isActive);
    if (losesAdminAccess && await _users.countActiveAdmins() <= 1) {
      throw const ValidationException(
        'There must be at least one active administrator.',
      );
    }

    await _users.update(id, username: name, role: role, isActive: isActive);
    if (changingPassword) {
      await _users.updatePasswordHash(id, await _hasher.hash(newPassword));
    }
    return (await _users.findById(id))!;
  }

  void _requireAdmin(User actor) {
    if (!actor.isAdmin || !actor.isActive) {
      throw const ValidationException(
        'Only administrators can manage users.',
      );
    }
  }

  Future<String> _validatedUsername(String raw, {int? ignoreId}) async {
    final name = raw.trim();
    if (name.isEmpty) throw const ValidationException('Username is required.');
    final clash = await _users.findByUsername(name);
    if (clash != null && clash.user.id != ignoreId) {
      throw const ValidationException('That username is already taken.');
    }
    return name;
  }

  void _validatePassword(String password) {
    if (password.length < minPasswordLength) {
      throw const ValidationException(
        'Password must be at least $minPasswordLength characters.',
      );
    }
  }
}
