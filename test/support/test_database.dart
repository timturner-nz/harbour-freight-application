import 'package:harbour_freight/src/core/database/app_database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Opens a fresh, fully migrated in-memory database for a single test.
/// Close it in `tearDown`.
Future<Database> openTestDatabase() async {
  sqfliteFfiInit();
  return AppDatabase.open(databaseFactoryFfi, inMemoryDatabasePath);
}
