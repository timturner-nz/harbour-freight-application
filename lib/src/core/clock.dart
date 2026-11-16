/// Source of the current time. Inject this instead of calling
/// `DateTime.now()` directly so tests can control time.
typedef Clock = DateTime Function();

DateTime systemClock() => DateTime.now().toUtc();
