import 'package:flutter/foundation.dart';

import '../../auth/domain/user.dart';
import '../domain/enquiry.dart';
import '../domain/enquiry_service.dart';

/// Holds the page of enquiries shown on the home screen (REQ-6).
class EnquiryListController extends ChangeNotifier {
  EnquiryListController(this._service, this.actor);

  final EnquiryService _service;
  final User actor;

  EnquiryPage? _page;

  /// The page on show, or null while nothing has loaded or after a failure.
  /// After a failure nothing stale is kept as if it were current.
  EnquiryPage? get page => _page;

  int _pageIndex = 0;

  bool _loading = false;
  bool get loading => _loading;

  bool _failed = false;
  bool get failed => _failed;

  bool _disposed = false;

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  Future<void> load([int? pageIndex]) async {
    _pageIndex = pageIndex ?? _pageIndex;
    _loading = true;
    notifyListeners();
    EnquiryPage? page;
    var failed = false;
    try {
      page = await _service.page(actor, _pageIndex);
    } catch (e, stack) {
      failed = true;
      if (!_disposed) debugPrint('Loading enquiries failed: $e\n$stack');
    }
    // The screen may have closed (for example, on sign-out) while loading.
    if (_disposed) return;
    _page = page;
    _failed = failed;
    _loading = false;
    notifyListeners();
  }

  /// Back to the first page, where a newly saved enquiry appears at the top.
  Future<void> showNewest() => load(0);

  Future<void> next() async {
    if (_page?.hasNext ?? false) await load(_pageIndex + 1);
  }

  Future<void> previous() async {
    if (_page?.hasPrevious ?? false) await load(_pageIndex - 1);
  }
}
