import 'package:flutter/foundation.dart';

import '../domain/auth_service.dart';
import '../domain/user.dart';

/// Holds the signed-in user for the UI. Widgets listen to this and never
/// talk to the service or repository directly.
class AuthController extends ChangeNotifier {
  AuthController(this._service);

  final AuthService _service;

  User? _currentUser;
  User? get currentUser => _currentUser;
  bool get isSignedIn => _currentUser != null;

  String? _error;
  String? get error => _error;

  bool _busy = false;
  bool get busy => _busy;

  Future<void> signIn(String username, String password) async {
    _busy = true;
    _error = null;
    notifyListeners();
    final user = await _service.signIn(username, password);
    _busy = false;
    _currentUser = user;
    _error = user == null ? 'Invalid username or password.' : null;
    notifyListeners();
  }

  void signOut() {
    _currentUser = null;
    _error = null;
    notifyListeners();
  }
}
