import 'package:flutter/material.dart';
import 'app/routes.dart';
import 'app/theme.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Navegación Modular',
      theme: AppTheme.themeData,
      initialRoute: '/pantalla1',
      routes: appRoutes,
    );
  }
}
 