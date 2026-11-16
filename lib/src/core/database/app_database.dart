import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'migrations.dart';

/// Opens the application's SQLite database and applies migrations.
///
/// Features never open the database themselves. They receive the shared
/// [Database] through their repository's constructor.
class AppDatabase {
  AppDatabase._();

  static const _fileName = 'harbour_freight.db';

  /// Opens the on-disk database used by the running application.
  static Future<Database> openDefault() async {
    sqfliteFfiInit();
    final dir = await getApplicationSupportDirectory();
    await Directory(dir.path).create(recursive: true);
    return open(databaseFactoryFfi, p.join(dir.path, _fileName));
  }

  /// Opens a database at [path] using [factory], applying all migrations.
  /// Pass [inMemoryDatabasePath] as [path] for an in-memory (test) database.
  static Future<Database> open(DatabaseFactory factory, String path) {
    final latest = migrations.last.version;
    return factory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: latest,
        onConfigure: (db) => db.execute('PRAGMA foreign_keys = ON'),
        onCreate: (db, _) => _migrate(db, 0, latest),
        onUpgrade: (db, from, to) => _migrate(db, from, to),
      ),
    );
  }

  static Future<void> _migrate(Database db, int from, int to) async {
    for (final m
        in migrations.where((m) => m.version > from && m.version <= to)) {
      for (final statement in m.statements) {
        await db.execute(statement);
      }
    }
  }
}
