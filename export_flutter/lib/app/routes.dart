import 'package:flutter/material.dart';
import '../pages/bienvenida/bienvenida_page.dart';
import '../pages/random/random_page.dart';

final Map<String, WidgetBuilder> appRoutes = {
  '/': (context) => const BienvenidaPage(),
  '/random': (context) => const RandomPage(),
};
