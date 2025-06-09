import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get themeData => ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color.fromARGB(255, 209, 141, 16)),
        useMaterial3: true,
      );
}
