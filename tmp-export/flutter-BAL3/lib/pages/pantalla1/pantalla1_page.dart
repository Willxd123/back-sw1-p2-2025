import 'package:flutter/material.dart';

class Pantalla1Page extends StatelessWidget {
  const Pantalla1Page({super.key});

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
                top: 239.61666870117188.0,
                left: 77.816650390625.0,
                child: SizedBox(
              width: 164.0,
              height: 111.0,
              child: TextButton(
                style: TextButton.styleFrom(
                  padding: EdgeInsets.all(4.0), // Padding mínimo para que el texto pueda acercarse a los bordes
                  backgroundColor: Color(0xFFffffff),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(74.0),
                    side: BorderSide(color: Color(0xFF8080ff), width: 8.0),
                  ),
                ),
                onPressed: () => Navigator.pushNamed(context, '/pantalla1'),
                child: Container(
                  width: double.infinity,
                  height: double.infinity,
                  child: Center(
                    child: Text(
                      'atrasasdf  asfdas fas fasdf ',
                      textAlign: TextAlign.center,
                      softWrap: true, // Permitir que el texto se ajuste en múltiples líneas
                      overflow: TextOverflow.visible, // Permitir que el texto sea visible completamente
                      maxLines: null, // Sin límite de líneas
                      style: TextStyle(
                        fontSize: 22.0,
                        color: Color(0xFF0000a0),
                        height: 1.0, // Espaciado entre líneas más compacto
                        fontFamily: 'Times New Roman',
                      ),
                    ),
                  ),
                ),
              ),
            ),
              )
        ],
      ),
    );
  }
}