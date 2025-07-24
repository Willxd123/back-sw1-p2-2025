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
    _dropdownValues['75cc1bb0-009d-42f9-9af5-02eb8c904410'] = 'Opción 1';
    _checkboxValues['92793de8-754f-4187-b842-925df421e4a1'] = false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF2196f3),
        title: const Text(''),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          Positioned(
      top: 54,
      left: 39,
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
      top: 59,
      left: 155,
      child: Text(
      'Título',
      textAlign: TextAlign.left,
      style: TextStyle(
        fontSize: 16,
        color: Color(0xFF000000),
      ),
    ),
    ),
          Positioned(
      top: 167,
      left: 41,
      child: SizedBox(
      width: 120,
      height: 48,
      child: TextButton(
        style: TextButton.styleFrom(
          padding: EdgeInsets.all(4),
          backgroundColor: Color(0xFFb9b8bc),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: Color(0xFF000000), width: 2),
          ),
        ),
        onPressed: () => Navigator.pushNamed(context, '/pantalla2'),
        child: Text(
          'Botón',
          style: TextStyle(
            fontSize: 19,
            color: Color(0xFFf50000),
          ),
        ),
      ),
    ),
    ),
          Positioned(
      top: 227,
      left: 67,
      child: SizedBox(
      width: 200,
      height: 56,
      child: TextField(
        style: TextStyle(
          fontSize: 16,
          color: Color(0xFF212121),
        ),
        decoration: InputDecoration(
          hintText: 'Ingresa el texto aquí',
          hintStyle: TextStyle(
            color: Color(0xFF9e9e9e),
            fontSize: 16,
          ),
          fillColor: Color(0xFFffffff),
          filled: true,
          border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide(
          color: Color(0xFFe0e0e0),
          width: 1,
        ),
      ),
          enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide(
          color: Color(0xFFe0e0e0),
          width: 1,
        ),
      ),
          focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide(
          color: Color(0xFF2196f3),
          width: 2,
        ),
      ),
          contentPadding: EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 12,
          ),
          
          
        ),
        
        
        
        
        enabled: true,
      ),
    ),
    ),
          Positioned(
      top: 296,
      left: 64,
      child: SizedBox(
      width: 200,
      height: 56,
      child: TextField(
        style: TextStyle(
          fontSize: 16,
          color: Color(0xFF212121),
        ),
        decoration: InputDecoration(
          hintText: 'Ingresa el texto aquí',
          hintStyle: TextStyle(
            color: Color(0xFF9e9e9e),
            fontSize: 16,
          ),
          fillColor: Color(0xFFffffff),
          filled: true,
          border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide(
          color: Color(0xFFe0e0e0),
          width: 1,
        ),
      ),
          enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide(
          color: Color(0xFFe0e0e0),
          width: 1,
        ),
      ),
          focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide(
          color: Color(0xFF2196f3),
          width: 2,
        ),
      ),
          contentPadding: EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 12,
          ),
          
          
        ),
        
        
        keyboardType: TextInputType.emailAddress,
        
        enabled: true,
      ),
    ),
    ),
          Positioned(
      top: 366,
      left: 41,
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
      
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _dropdownValues['75cc1bb0-009d-42f9-9af5-02eb8c904410'],
          isExpanded: true,
          items: <String>['Opción 1', 'Opción 2'].map((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  value,
                  style: TextStyle(fontSize: 14),
                ),
              ),
            );
          }).toList(),
          onChanged: (String? newValue) {
            setState(() {
              _dropdownValues['75cc1bb0-009d-42f9-9af5-02eb8c904410'] = newValue ?? '';
            });
          },
        ),
      ),
    ),
    ),
          Positioned(
      top: 430,
      left: 42,
      child: Transform.scale(
      scale: 1.4,
      child: Checkbox(
        value: _checkboxValues['92793de8-754f-4187-b842-925df421e4a1'] ?? false,
        activeColor: Color(0xFF4c4c29),
        checkColor: Color(0xFFc26b6b),
        side: BorderSide(
          color: Color(0xFFc9b6b6),
          width: 2,
        ),
        shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(30),
        side: BorderSide(
          color: Color(0xFFc9b6b6),
          width: 2,
        ),
      ),
        onChanged: (bool? value) {
          setState(() {
            _checkboxValues['92793de8-754f-4187-b842-925df421e4a1'] = value ?? false;
          });
        },
      ),
    ),
    ),
          
Positioned(
  top: 490,
  left: 41,
  right: 30,
  child: Table(
    border: TableBorder.all(
      color: Color(0xFFcccccc),
      width: 1.0,
    ),
    columnWidths: { 0: FlexColumnWidth(1), 1: FlexColumnWidth(1), 2: FlexColumnWidth(1) },
    defaultVerticalAlignment: TableCellVerticalAlignment.middle,
    children: [
      
          TableRow(
            decoration: BoxDecoration(color: Color(0xFFf0f0f0)),
            children: [
            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Encabezado 1",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF000000),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),

            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Encabezado 2",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF000000),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),

            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Encabezado 3",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF000000),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )]
          ),

          TableRow(
            decoration: BoxDecoration(color: Color(0xFFf9f9f9)),
            children: [
            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Celda 1.1",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF333333),
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ),

            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Celda 1.2",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF333333),
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ),

            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Celda 1.3",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF333333),
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
            )]
          ),

          TableRow(
            decoration: BoxDecoration(color: null),
            children: [
            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Celda 2.1",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF333333),
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ),

            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Celda 2.2",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF333333),
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ),

            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                "Celda 2.3",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF333333),
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
            )]
          )
    ],
  ),
)
        ],
      ),
    );
  }
}