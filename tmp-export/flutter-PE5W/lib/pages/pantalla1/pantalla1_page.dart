import 'package:flutter/material.dart';

class Pantalla1Page extends StatelessWidget {
  const Pantalla1Page({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Color(0xFF2196f3),
        title: const Text('Tituloski'),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          Positioned(
            top: 209,
            left: 124,
            child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
                color: Color(0xFFaf1818),
                border: Border.all(
                  color: Color(0xFF000000),
                  width: 13,
                ),
                borderRadius: BorderRadius.circular(53),
              ),
          ),
          ),
          
          Positioned(
            top: 452,
            left: 152,
            child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
                color: Color(0xFF000000),
                border: Border.all(
                  color: Color(0xFF000000),
                  width: 0,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
            child: IconButton(
            tooltip: 'Ir a Page 2',
            icon: const Icon(Icons.home_outlined),
            onPressed: () {
              Navigator.pushNamed(context, '/pantalla2');
            },
          ),
          ),
          ),
          
          Align(
            alignment: Alignment.centerRight,
            child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
                color: Color(0xFFffffff),
                border: Border.all(
                  color: Color(0xFF000000),
                  width: 1,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
          ),
          )
        ],
      ),
    );
  }
}