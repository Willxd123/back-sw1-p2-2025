import 'package:flutter/material.dart';

class Pantalla1Page extends StatefulWidget {
  const Pantalla1Page({super.key});

  @override
  State<Pantalla1Page> createState() => _Pantalla1PageState();
}

class _Pantalla1PageState extends State<Pantalla1Page> {
  final Map<String, String> _dropdownValues = {};
  final Map<String, bool> _checkboxValues = {};

  @override
  void initState() {
    super.initState();
    _checkboxValues['45f8b095-e02b-41b7-b75e-eee85978dff7'] = false;
    _dropdownValues['4ead9a42-c304-4fc7-8962-002ad4941885'] = 'Opción 1';
    _checkboxValues['5943b9af-b0b3-4786-a60b-6bae725c1132'] = false;
  }

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
          Align(
                alignment: Alignment.center,
                child: Container(
              width: 53,
              height: 48,
              padding: const EdgeInsets.all(4.0),
              child: Center(child: GestureDetector(
              onTap: () => setState(() => 
                _checkboxValues['45f8b095-e02b-41b7-b75e-eee85978dff7'] = !(_checkboxValues['45f8b095-e02b-41b7-b75e-eee85978dff7'] ?? false)
              ),
              child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: _checkboxValues['45f8b095-e02b-41b7-b75e-eee85978dff7'] == true 
                  ? Color(0xFFcceeff) 
                  : Colors.white,
                border: Border.all(
                  color: Color(0xFFFF0000),
                  width: 3,
                ),
                borderRadius: BorderRadius.circular(21),
              ),
              child: _checkboxValues['45f8b095-e02b-41b7-b75e-eee85978dff7'] == true
                ? Center(
                    child: Text(
                      '✓',
                      style: TextStyle(
                        color: Color(0xFF6c606c),
                        fontSize: 25.2,
                        fontWeight: FontWeight.bold,
                        height: 1,
                      ),
                    ),
                  )
                : null,
            ),
            )),
            ),
              ),
          
          Positioned(
                  top: 50,
                  left: 50,
                  child: Container(
                width: 120,
                height: 40,
                decoration: BoxDecoration(
                color: Color(0xFFffffff),
                border: Border.all(
                  color: Color(0xFF000000),
                  width: 1,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
                padding: const EdgeInsets.symmetric(horizontal: 8.0),
                child: Center(child: DropdownButton<String>(
                value: _dropdownValues['4ead9a42-c304-4fc7-8962-002ad4941885'],
                isExpanded: true,
                items: <String>['Opción 1', 'Opción 2']
                    .map<DropdownMenuItem<String>>((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(
                      value,
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setState(() {
                    _dropdownValues['4ead9a42-c304-4fc7-8962-002ad4941885'] = newValue ?? '';
                  });
                },
              )),
              ),
                ),
          
          Positioned(
                  top: 518,
                  left: 79,
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
                ),
          
          Positioned(
                top: 163,
                left: 57,
                child: Container(
              width: 48,
              height: 48,
              padding: const EdgeInsets.all(4.0),
              child: Center(child: GestureDetector(
              onTap: () => setState(() => 
                _checkboxValues['5943b9af-b0b3-4786-a60b-6bae725c1132'] = !(_checkboxValues['5943b9af-b0b3-4786-a60b-6bae725c1132'] ?? false)
              ),
              child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _checkboxValues['5943b9af-b0b3-4786-a60b-6bae725c1132'] == true 
                  ? Color(0xFFFFFF00) 
                  : Colors.white,
                border: Border.all(
                  color: Color(0xFF000040),
                  width: 4,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: _checkboxValues['5943b9af-b0b3-4786-a60b-6bae725c1132'] == true
                ? Center(
                    child: Text(
                      '✓',
                      style: TextStyle(
                        color: Color(0xFFFF0000),
                        fontSize: 28.799999999999997,
                        fontWeight: FontWeight.bold,
                        height: 1,
                      ),
                    ),
                  )
                : null,
            ),
            )),
            ),
              )
        ],
      ),
    );
  }
}