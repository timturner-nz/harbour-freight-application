enum UserRole { admin, user }

/// A person who can sign in to the application.
class User {
  const User({
    required this.id,
    required this.username,
    required this.role,
    required this.isActive,
    required this.createdAt,
  });

  final int id;
  final String username;
  final UserRole role;
  final bool isActive;
  final DateTime createdAt;

  bool get isAdmin => role == UserRole.admin;
}
