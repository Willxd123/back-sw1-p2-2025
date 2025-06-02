import 'package:flutter/material.dart';

class RandomPage extends StatefulWidget {
  const RandomPage({super.key});

  @override
  State<RandomPage> createState() => _RandomPageState();
}

class _RandomPageState extends State<RandomPage> {
/*   String dropdownValue = 'Opasdfasdf'; */
@override
Widget build(BuildContext context) {
  return Scaffold(
    body: Stack(
      children: [
        Align(
          alignment: Alignment.topCenter,
          child: Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: Color(0xFF800080),
            border: Border.all(color: Color(0xFF000000), width: 13),
            borderRadius: BorderRadius.circular(61),
          ),
        ),
        )
      ],
    ),
  );
}
    
    
}
