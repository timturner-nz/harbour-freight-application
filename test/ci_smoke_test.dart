import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('CI smoke marker file docs/ci-smoke.txt exists and is not empty', () {
    final file = File('docs/ci-smoke.txt');
    expect(file.existsSync(), isTrue, reason: 'docs/ci-smoke.txt is missing');
    expect(
      file.readAsStringSync().trim(),
      isNotEmpty,
      reason: 'docs/ci-smoke.txt is empty',
    );
  });
}
