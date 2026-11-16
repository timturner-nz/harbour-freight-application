import 'package:harbour_freight/src/features/auth/data/user_repository.dart';
import 'package:harbour_freight/src/features/auth/domain/password_hasher.dart';
import 'package:harbour_freight/src/features/auth/domain/user.dart';

/// Fast hasher for tests. Production uses the default iteration count.
final testHasher = PasswordHasher(iterations: 1000);

/// Inserts a user directly through the repository.
Future<User> addTestUser(
  UserRepository users,
  String username,
  String password, {
  UserRole role = UserRole.user,
  bool isActive = true,
}) async {
  return users.create(
    username: username,
    passwordHash: await testHasher.hash(password),
    role: role,
    isActive: isActive,
    createdAt: DateTime.utc(2026, 1, 1),
  );
}

/// The administrator created by the database migration.
Future<User> seededAdmin(UserRepository users) async =>
    (await users.findByUsername('admin'))!.user;
