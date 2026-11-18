import 'package:flutter/material.dart';

import '../domain/enquiry.dart';
import 'enquiry_list_controller.dart';
import 'formatting.dart';

/// The enquiry list from the mock-up (D6, M2): every enquiry, newest first,
/// 25 to a page (REQ-6).
class EnquiryListView extends StatelessWidget {
  const EnquiryListView({super.key, required this.controller, this.onOpen});

  final EnquiryListController controller;

  /// Called when a row is chosen.
  final void Function(Enquiry enquiry)? onOpen;

  // Column widths, as flex shares: Ref, Customer, Route, Cargo, Status,
  // Owner, Received.
  static const _flex = [2, 4, 4, 4, 2, 2, 2];

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final page = controller.page;
        if (controller.failed) return _Failed(onRetry: controller.load);
        if (page == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (page.total == 0) {
          return const Center(
            child: Text('No enquiries yet.', key: Key('enquiries-empty')),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _HeaderRow(flex: _flex),
            const Divider(height: 1),
            Expanded(
              child: ListView.separated(
                itemCount: page.items.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, i) => _EnquiryRow(
                  enquiry: page.items[i],
                  flex: _flex,
                  onTap: onOpen == null ? null : () => onOpen!(page.items[i]),
                ),
              ),
            ),
            const Divider(height: 1),
            _Pager(controller: controller, page: page),
          ],
        );
      },
    );
  }
}

class _Failed extends StatelessWidget {
  const _Failed({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Enquiries could not be loaded.',
              key: Key('enquiries-failed')),
          const SizedBox(height: 12),
          OutlinedButton(
            key: const Key('enquiries-retry'),
            onPressed: onRetry,
            child: const Text('Try again'),
          ),
        ],
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow({required this.flex});

  final List<int> flex;

  static const _titles = [
    'Ref', 'Customer', 'Route', 'Cargo', 'Status', 'Owner', 'Received',
  ];

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        children: [
          for (var i = 0; i < _titles.length; i++)
            Expanded(flex: flex[i], child: Text(_titles[i], style: style)),
        ],
      ),
    );
  }
}

class _EnquiryRow extends StatelessWidget {
  const _EnquiryRow({required this.enquiry, required this.flex, this.onTap});

  final Enquiry enquiry;
  final List<int> flex;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final e = enquiry;
    Widget cell(int i, Widget child) => Expanded(
          flex: flex[i],
          child: Padding(
            padding: const EdgeInsets.only(right: 12),
            child: child,
          ),
        );
    return InkWell(
      key: Key('enquiry-row-${e.reference}'),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        child: Row(
          children: [
            cell(0, Text(e.reference, style: theme.textTheme.titleSmall)),
            cell(
              1,
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(e.company, style: theme.textTheme.bodyMedium),
                  Text(e.contactName, style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            cell(2, Text('${e.origin} → ${e.destination}')),
            cell(3, Text(e.cargo, maxLines: 2, overflow: TextOverflow.ellipsis)),
            cell(4, Align(
                alignment: Alignment.centerLeft,
                child: StatusBadge(status: e.status))),
            cell(5, Text(e.ownerUsername)),
            cell(6, Text(formatDayMonth(e.createdAt))),
          ],
        ),
      ),
    );
  }
}

class _Pager extends StatelessWidget {
  const _Pager({required this.controller, required this.page});

  final EnquiryListController controller;
  final EnquiryPage page;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        children: [
          Text(
            'Showing ${page.items.length} of ${page.total} enquiries',
            key: const Key('enquiries-showing'),
          ),
          const Spacer(),
          OutlinedButton(
            key: const Key('enquiries-previous'),
            onPressed: page.hasPrevious ? controller.previous : null,
            child: const Text('Previous'),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            key: const Key('enquiries-next'),
            onPressed: page.hasNext ? controller.next : null,
            child: const Text('Next'),
          ),
        ],
      ),
    );
  }
}

/// The status as a badge. Shared by the list and the detail view.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final EnquiryStatus status;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.label,
        style: TextStyle(color: scheme.onSecondaryContainer, fontSize: 12),
      ),
    );
  }
}
