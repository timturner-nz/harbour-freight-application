import 'package:flutter/material.dart';

import 'core/theme.dart';
import 'features/admin/domain/user_admin_service.dart';
import 'features/auth/presentation/auth_controller.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/enquiries/domain/enquiry_service.dart';
import 'features/home/home_screen.dart';

class HarbourFreightApp extends StatelessWidget {
  const HarbourFreightApp({
    super.key,
    required this.auth,
    required this.userAdmin,
    required this.enquiries,
  });

  final AuthController auth;
  final UserAdminService userAdmin;
  final EnquiryService enquiries;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Harbour Freight',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: ListenableBuilder(
        listenable: auth,
        builder: (context, _) => auth.isSignedIn
            ? HomeScreen(auth: auth, userAdmin: userAdmin, enquiries: enquiries)
            : LoginScreen(controller: auth),
      ),
    );
  }
}
