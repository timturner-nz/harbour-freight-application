import '../data/user_repository.dart';
import 'password_hasher.dart';
import 'user.dart';

/// Business rules for signing in. No UI and no SQL in here.
class AuthService {
  AuthService({
    required this._users,
    required this._hasher,
  });

  final UserRepository _users;
  final PasswordHasher _hasher;

  /// Returns the user if the credentials are valid and the account is
  /// active, otherwise `null`. Unknown users, wrong passwords and disabled
  /// accounts are indistinguishable to the caller.
  Future<User?> signIn(String username, String password) async {
    final name = username.trim();
    if (name.isEmpty || password.isEmpty) return null;
    final record = await _users.findByUsername(name);
    if (record == null) return null;
    final ok = await _hasher.verify(password, record.passwordHash);
    return ok && record.user.isActive ? record.user : null;
  }
}
