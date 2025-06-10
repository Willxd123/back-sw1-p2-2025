import 'package:flutter/material.dart';

class Pantalla1Page extends StatelessWidget {
  const Pantalla1Page({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Color(0xFF0000a0),
        title: const Text(''),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          Align(
                alignment: Alignment.center,
                child: SizedBox(
              width: 228.0,
              height: 56.0,
              child: TextField(
                enabled: true,
                keyboardType: TextInputType.text,
                
                style: TextStyle(
                  fontSize: 16.0,
                  color: Color(0xFF212121),
                ),
                decoration: InputDecoration(
                  hintText: 'Ingresa el texto aquí',
                  
                  hintStyle: TextStyle(color: Color(0xFF9e9e9e)),
                  
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4.0),
                    borderSide: BorderSide(
                      color: Color(0xFFe0e0e0),
                      width: 1.0,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4.0),
                    borderSide: BorderSide(
                      color: Color(0xFF2196f3),
                      width: 2.0,
                    ),
                  ),
                  filled: true,
                  fillColor: Color(0xFFd2ffff),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 16.0),
                ),
                onChanged: (String value) {
                  // Aquí puedes agregar lógica para manejar el cambio de valor
                },
              ),
            ),
              )
        ],
      ),
    );
  }
}