import 'package:flutter_test/flutter_test.dart';

import 'package:harbour_freight/src/app.dart';

void main() {
  testWidgets('shows the home screen', (WidgetTester tester) async {
    await tester.pumpWidget(const HarbourFreightApp());

    expect(find.text('Welcome to Harbour Freight'), findsOneWidget);
  });
}
