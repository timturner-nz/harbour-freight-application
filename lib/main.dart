import 'package:flutter/material.dart';

import 'src/app.dart';
import 'src/core/database/app_database.dart';
import 'src/features/admin/domain/user_admin_service.dart';
import 'src/features/auth/data/user_repository.dart';
import 'src/features/auth/domain/auth_service.dart';
import 'src/features/auth/domain/password_hasher.dart';
import 'src/features/auth/presentation/auth_controller.dart';
import 'src/features/enquiries/data/enquiry_repository.dart';
import 'src/features/enquiries/domain/enquiry_service.dart';

/// Composition root: the one place where concrete dependencies are wired up.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final db = await AppDatabase.openDefault();
  final users = SqliteUserRepository(db);
  final hasher = PasswordHasher();

  runApp(HarbourFreightApp(
    auth: AuthController(AuthService(users: users, hasher: hasher)),
    userAdmin: UserAdminService(users: users, hasher: hasher),
    enquiries: EnquiryService(enquiries: SqliteEnquiryRepository(db)),
  ));
}
