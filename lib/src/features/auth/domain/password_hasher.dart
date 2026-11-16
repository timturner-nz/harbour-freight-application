import 'dart:convert';
import 'dart:math';

import 'package:cryptography/cryptography.dart';

/// Hashes and verifies passwords using PBKDF2-HMAC-SHA256.
///
/// Stored format: `pbkdf2$<iterations>$<salt b64>$<hash b64>`.
class PasswordHasher {
  PasswordHasher({this.iterations = 100000});

  final int iterations;

  Pbkdf2 _algorithm(int iterations) =>
      Pbkdf2(macAlgorithm: Hmac.sha256(), iterations: iterations, bits: 256);

  Future<String> hash(String password) async {
    final random = Random.secure();
    final salt = List<int>.generate(16, (_) => random.nextInt(256));
    final key = await _algorithm(iterations)
        .deriveKeyFromPassword(password: password, nonce: salt);
    final bytes = await key.extractBytes();
    return ['pbkdf2', iterations, base64.encode(salt), base64.encode(bytes)]
        .join(r'$');
  }

  Future<bool> verify(String password, String stored) async {
    final parts = stored.split(r'$');
    if (parts.length != 4 || parts[0] != 'pbkdf2') return false;
    final storedIterations = int.tryParse(parts[1]);
    if (storedIterations == null) return false;
    final salt = base64.decode(parts[2]);
    final expected = base64.decode(parts[3]);
    final key = await _algorithm(storedIterations)
        .deriveKeyFromPassword(password: password, nonce: salt);
    final actual = await key.extractBytes();
    return _constantTimeEquals(actual, expected);
  }

  bool _constantTimeEquals(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff == 0;
  }
}
