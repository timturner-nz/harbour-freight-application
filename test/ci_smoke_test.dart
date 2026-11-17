import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

// Throwaway test for REQ-1: proves CI can report evidence to Meridian.
void main() {
  test('the CI smoke marker file exists and is not empty', () {
    final file = File('docs/ci-smoke.txt');
    expect(file.existsSync(), isTrue);
    expect(file.readAsStringSync().trim(), isNotEmpty);
  });
}
