import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Harbour Freight')),
      body: const Center(child: Text('Welcome to Harbour Freight')),
    );
  }
}
