import 'package:flutter/material.dart';

class Pantalla2Page extends StatelessWidget {
  const Pantalla2Page({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Color(0xFF2196f3),
        title: const Text(''),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          Positioned(
            top: 144,
            left: 125,
            child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
                color: Color(0xFF2e727f),
                border: Border.all(
                  color: Color(0xFF000000),
                  width: 1,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
            child: Stack(
            children: [
              Positioned(
            top: 33,
            left: -1,
            child: Container(
              width: 100,
              height: 30,
              decoration: BoxDecoration(
                color: Color(0xFF725f5f),
                border: Border.all(
                  color: Color(0xFF000000),
                  width: 0,
                ),
                borderRadius: BorderRadius.circular(0),
              ),
              child: const Center(
                child: Text(
                  'container xd',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFFFFFFFF),
                  ),
                ),
              ),
            ),
          )
            ],
          ),
          ),
          ),
          
          Positioned(
            top: 474,
            left: 199,
            child: Container(
            width: 98,
            height: 48,
            decoration: BoxDecoration(
                color: Color(0xFFd30d0d),
                border: Border.all(
                  color: Color(0xFF000000),
                  width: 0,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
            child: Stack(
              children: [
                IconButton(
            tooltip: 'Ir a Page 2',
            icon: const Icon(Icons.home_outlined),
            onPressed: () {
              Navigator.pushNamed(context, '/pantalla2');
            },
          ),
                Stack(
            children: [
              Align(
            alignment: Alignment.center,
            child: Text(
            'Inicio',
            style: TextStyle(
              fontSize: 14,
              color: Color(0x80FFFFFF),
            ),
          ),
          )
            ],
          ),
              ],
            ),
          ),
          )
        ],
      ),
    );
  }
}