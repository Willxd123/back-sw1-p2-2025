import 'package:flutter/material.dart';

class BienvenidaPage extends StatefulWidget {
  const BienvenidaPage({super.key});

  @override
  State<BienvenidaPage> createState() => _BienvenidaPageState();
}

class _BienvenidaPageState extends State<BienvenidaPage> {
  String dropdownValue = 'Opción 1';
  bool isChecked = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Header (AppBar)'),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.amber,
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            child: const Text('Sección 1 - Bienvenido',
                style: TextStyle(fontSize: 20)),
          ),
          Expanded(
            child: Container(
              color: Colors.blue[50],
              width: double.infinity,
              child: Center(
                // 🛑 Se envuelve todo el contenido en Stack para poder usar Positioned
                child: Stack(
                  children: [
                    // Contenido normal centrado
                     Container(
                            width: 100,
                            height: 91,
                            padding: EdgeInsets.only(top: 26, left: 8),
                            decoration: BoxDecoration(
                              color: Color(0xFFff0080),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Color(0xFF000000), width: 8),
                            ),
                            child: null,
                          ),
                  Text('Texto'),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        DropdownButton<String>(
                          value: dropdownValue,
                          items: <String>['Opción 1', 'Opción 2', 'Opción 3']
                              .map<DropdownMenuItem<String>>((String value) {
                            return DropdownMenuItem<String>(
                              value: value,

                              child: Text(value),
                            );
                          }).toList(),
                          onChanged: (String? newValue) {
                            setState(() {
                              dropdownValue = newValue!;
                            });
                          },
                        ),
                        const SizedBox(height: 20),
                        Table(
                          border: TableBorder.all(),
                          children: const [
                            TableRow(children: [
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Columna 1'),
                              ),
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Columna 2'),
                              ),
                            ]),
                            TableRow(children: [
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Dato A'),
                              ),
                              Padding(
                                padding: EdgeInsets.all(8.0),
                                child: Text('Dato B'),
                              ),
                            ]),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Checkbox(
                              value: isChecked,
                              onChanged: (bool? value) {
                                setState(() {
                                  isChecked = value!;
                                });
                              },
                            ),
                            const Text('Aceptar términos'),
                          ],
                        ),
                      ],
                    ),
                    Positioned(
                      top: 345,
                      left: 2,
                      child: Container(
                        width: 150,
                        height: 100,
                        decoration: BoxDecoration(
                          color: Color(0xFFff80ff),
                          border:
                              Border.all(color: Color(0xFF80ff00), width: 18),
                          borderRadius: BorderRadius.circular(29),
                        ),
                        child: Align(alignment: Alignment.bottomCenter,child: Text('Nuevo ')),
                      ),
                    ),

                    /* Container(
                      width: 150,
                      height: 100,
                      alignment: Alignment.centerLeft,
                      decoration: BoxDecoration(
                        color: Color(0xFF8080ff),
                        border: Border.all(color: Color(0xFF000000), width: 7),
                        borderRadius: BorderRadius.circular(0),
                      ),
                      child: Center(child: Text('khe?')),
                    ), */
                    Align(
                      alignment: Alignment.center,
                      child: Container(
                        width: 150,
                        height: 100,
                        decoration: BoxDecoration(
                          color: Color(0xFFf0f0f0),
                          border:
                              Border.all(color: Color(0xFF000000), width: 2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child:
                            Text('Nuevo ñafas', textAlign: TextAlign.center),
                      ),
                    ),
                    
                    // 🚨 Aquí aplicamos la posición absoluta tipo CSS usando Positioned
                  ],
                  
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomAppBar(
        color: const Color.fromARGB(255, 231, 217, 217),
        shape: const CircularNotchedRectangle(),
        elevation: 10,
        child: Container(
          height: 70,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              IconButton(
                tooltip: 'Home',
                icon: const Icon(Icons.home_outlined),
                onPressed: () {
                  Navigator.pushNamed(context, '/random');
                },
              ),
              IconButton(
                tooltip: 'Wallet',
                icon: const Icon(Icons.account_balance_wallet_outlined),
                onPressed: () {},
              ),
              FloatingActionButton(
                tooltip: 'New Item',
                onPressed: () {},
                backgroundColor: Colors.blue,
                shape: const CircleBorder(),
                child: const Icon(Icons.add),
              ),
              IconButton(
                tooltip: 'Settings',
                icon: const Icon(Icons.settings_outlined),
                onPressed: () {},
              ),
              IconButton(
                tooltip: 'Profile',
                icon: const Icon(Icons.person_outline),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
