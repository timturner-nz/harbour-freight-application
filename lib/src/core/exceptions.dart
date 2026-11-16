/// A business-rule violation with a message that is safe to show to a user.
class ValidationException implements Exception {
  const ValidationException(this.message);

  final String message;

  @override
  String toString() => message;
}
