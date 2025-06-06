import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/entities/room.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import archiver from 'archiver';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const readFileAsync = promisify(fs.readFile);

@Injectable()
export class ExportService {
  flutterTemplatePath = path.join(process.cwd(), 'export_flutter');
  exportTmpPath = path.join(process.cwd(), 'tmp-export');

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async exportRoomAsFlutter(roomCode: string): Promise<string> {
    const room = await this.roomRepository.findOneBy({ code: roomCode });
    if (!room || !room.canvasFile)
      throw new Error(`No existe canvas para la sala: ${roomCode}`);

    const parsed = JSON.parse(room.canvasFile);
    const pages = Array.isArray(parsed) ? parsed : parsed.pages;
    if (!Array.isArray(pages))
      throw new Error('El formato del canvasFile no es válido.');

    const projectName = `flutter-${roomCode}`;
    const roomExportPath = path.join(this.exportTmpPath, projectName);
    fs.rmSync(roomExportPath, { recursive: true, force: true });
    fs.cpSync(this.flutterTemplatePath, roomExportPath, { recursive: true });

    const pagesDir = path.join(roomExportPath, 'lib', 'pages');
    const routeFilePath = path.join(
      roomExportPath,
      'lib',
      'app',
      'routes.dart',
    );

    let routeImports = '';
    let routeMappings = '';

    for (const page of pages) {
      const pageFolderName = page.name.toLowerCase().replace(/\s+/g, '');
      const pageClassName = this.toPascalCase(page.name) + 'Page';
      const pageFolderPath = path.join(pagesDir, pageFolderName);

      await mkdirAsync(pageFolderPath, { recursive: true });

      const fullDartPath = path.join(
        pageFolderPath,
        `${pageFolderName}_page.dart`,
      );
      const dartContent = this.generateFlutterPageDart(
        pageClassName,
        page.components,
      );
      await writeFileAsync(fullDartPath, dartContent);

      routeImports += `import '../pages/${pageFolderName}/${pageFolderName}_page.dart';\n`;
      routeMappings += `  '/${pageFolderName}': (context) => const ${pageClassName}(),\n`;
    }

    const routesFileContent = await readFileAsync(routeFilePath, 'utf8');
    const updatedRoutes = this.replaceRoutes(
      routesFileContent,
      routeImports,
      routeMappings,
    );
    await writeFileAsync(routeFilePath, updatedRoutes);

    const zipPath = path.join(this.exportTmpPath, `${projectName}.zip`);
    await this.zipDirectory(roomExportPath, zipPath, projectName);

    return zipPath;
  }

  private toPascalCase(str: string): string {
    return str.replace(/(^\w|_\w|\s\w)/g, (m) =>
      m.replace(/[_\s]/, '').toUpperCase(),
    );
  }

  /**
   * 1) Detección de AppBar → lo lleva a Scaffold.appBar.
   * 2) Detecta si existe al menos un DropdownButton para decidir Stateless vs Stateful.
   * 3) El resto de componentes se dibujan en body: Stack([...]).
   */
  private generateFlutterPageDart(
    className: string,
    components: any[],
  ): string {
    // Buscar AppBar (solo el primero)
    const appBarComp = components.find((c) => c.type === 'AppBar');

    // Detectar recursivamente si existe algún DropdownButton
    const hasDropdown = this.containsDropdown(components);

    // Generar cuerpo (sin AppBar) como lista de strings
    const bodyComponents = components
      .filter((c) => c.type !== 'AppBar')
      .map((comp) => this.generateFlutterWidget(comp))
      .join(',\n\n');

    // Construir appBarDart (vacío o con valores del JSON)
    let appBarDart = `appBar: AppBar(
        backgroundColor: Color(0xFF2196f3),
        title: const Text(''),
        centerTitle: true,
      ),`;

    if (appBarComp) {
      let titulo = '';
      if (
        Array.isArray(appBarComp.children) &&
        appBarComp.children.length > 0
      ) {
        const textChild = appBarComp.children.find(
          (ch: any) => ch.type === 'Text',
        );
        if (textChild) {
          titulo = (textChild.text ?? '').replace(/'/g, "\\'");
        }
      }
      const colorHex = (appBarComp.decoration?.color ?? '#2196f3').replace(
        '#',
        '',
      );
      appBarDart = `appBar: AppBar(
        backgroundColor: Color(0xFF${colorHex}),
        title: const Text('${titulo}'),
        centerTitle: true,
      ),`;
    }

    // Si no hay DropdownButton, generamos StatelessWidget
    if (!hasDropdown) {
      return `import 'package:flutter/material.dart';

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      ${appBarDart}
      body: Stack(
        children: [
${bodyComponents
  .split('\n')
  .map((line) => '          ' + line)
  .join('\n')}
        ],
      ),
    );
  }
}`;
    }

    // Si hay DropdownButton, generamos StatefulWidget y el mapa _dropdownValues
    return `import 'package:flutter/material.dart';

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final Map<String, String> _dropdownValues = {};

  @override
  void initState() {
    super.initState();
    ${this.buildDropdownInitializers(components)}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      ${appBarDart}
      body: Stack(
        children: [
${bodyComponents
  .split('\n')
  .map((line) => '          ' + line)
  .join('\n')}
        ],
      ),
    );
  }
}`;
  }

  /**
   * Revisa recursivamente si hay un DropdownButton en la lista de componentes.
   */
  private containsDropdown(comps: any[]): boolean {
    for (const c of comps) {
      if (c.type === 'DropdownButton') return true;
      if (Array.isArray(c.children) && c.children.length > 0) {
        if (this.containsDropdown(c.children)) return true;
      }
    }
    return false;
  }

  /**
   * Recorre los componentes para generar las líneas de initState() que asignan
   * cada _dropdownValues['id'] = 'selectedOption';
   */
  private buildDropdownInitializers(components: any[]): string {
    const lines: string[] = [];
    components.forEach((c) => {
      if (c.type === 'DropdownButton') {
        const id = c.id;
        const firstOption =
          Array.isArray(c.options) && c.options.length > 0
            ? c.options[0].replace(/'/g, "\\'")
            : '';
        const selected = (c.selectedOption ?? firstOption).replace(/'/g, "\\'");
        lines.push(`_dropdownValues['${id}'] = '${selected}';`);
      }
      if (Array.isArray(c.children) && c.children.length > 0) {
        lines.push(this.buildDropdownInitializers(c.children));
      }
    });
    return lines.join('\n    ');
  }

  /**
   * Genera cada widget (Positioned, Align, Text, IconButton, DropdownButton o Container).
   */
  private generateFlutterWidget(comp: any): string {
    // 1) Propiedades comunes
    const width = comp.width ?? 50;
    const height = comp.height ?? 50;
    const color = (comp.decoration?.color ?? '#ffffff').replace('#', '');
    const borderColor = (comp.decoration?.border?.color ?? '#000000').replace(
      '#',
      '',
    );
    const borderWidth = comp.decoration?.border?.width ?? 0;
    const borderRadius = comp.decoration?.borderRadius ?? 0;

    const decoration = `BoxDecoration(
      color: Color(0xFF${color}),
      border: Border.all(
        color: Color(0xFF${borderColor}),
        width: ${borderWidth},
      ),
      borderRadius: BorderRadius.circular(${borderRadius}),
    )`;

    // 2) AppBar → no se maneja aquí
    if (comp.type === 'AppBar') {
      return '';
    }

    // 3) Text
    if (comp.type === 'Text') {
      const rawText = (comp.text ?? '').replace(/'/g, "\\'");
      const fontSize = comp.fontSize ?? 14;
      const textColor =
        comp.textColor && comp.textColor !== 'transparent'
          ? comp.textColor.replace('#', '')
          : '000000';

      // Sanitizar fontFamily para que quede 'Times New Roman, serif'
      let fontFamilyValue: string | null = null;
      if (comp.fontFamily) {
        fontFamilyValue = comp.fontFamily.trim().replace(/^['"]|['"]$/g, '');
      }

      // Alineación interna del Text
      const textAlignDart = (() => {
        switch (comp.textAlign) {
          case 'center':
            return 'TextAlign.center';
          case 'right':
            return 'TextAlign.right';
          case 'justify':
            return 'TextAlign.justify';
          default:
            return 'TextAlign.left';
        }
      })();

      // Construir Text(...)
      const textWidget = `
Text(
  '${rawText}',
  textAlign: ${textAlignDart},
  style: TextStyle(
    fontSize: ${fontSize},
    color: Color(0xFF${textColor}),${fontFamilyValue ? `\n    fontFamily: '${fontFamilyValue}',` : ''}
  ),
)
      `.trim();

      // Envolver en Container(width, height, alignment)
      const containerWrapper = `
Container(
  width: ${comp.width},
  height: ${comp.height},
  alignment: Alignment.center,
  child: ${textWidget},
)
      `.trim();

      // Posicionar con Align o Positioned según comp.alignment
      if (comp.alignment) {
        return `
Align(
  alignment: Alignment.${comp.alignment},
  child: ${containerWrapper},
)
        `.trim();
      } else {
        return `
Positioned(
  top: ${comp.top ?? 0},
  left: ${comp.left ?? 0},
  child: ${containerWrapper},
)
        `.trim();
      }
    }

    // 4) IconButton (con posible Text hijo superpuesto)
    if (comp.type === 'IconButton') {
      const tooltip = (comp.tooltip ?? '').replace(/'/g, "\\'");
      const icon = comp.icon ?? 'help_outline';
      const route = comp.navigateTo ?? '/';

      const iconButtonWidget = `
IconButton(
  tooltip: '${tooltip}',
  icon: const Icon(Icons.${icon}),
  onPressed: () {
    Navigator.pushNamed(context, '${route}');
  },
)
      `.trim();

      // Si tiene hijos (Text), los superponemos
      let childrenStack = '';
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        const mappedChildren = comp.children.map((child: any) => {
          const rawText = (child.text ?? '').replace(/'/g, "\\'");
          const fontSize = child.fontSize ?? 14;
          const textoWidget = `
Text(
  '${rawText}',
  style: TextStyle(
    fontSize: ${fontSize},
    color: Color(0x80FFFFFF),
  ),
)
          `.trim();

          if (child.alignment) {
            return `
Align(
  alignment: Alignment.${child.alignment},
  child: ${textoWidget},
)
            `.trim();
          } else {
            return `
Positioned(
  top: ${child.top ?? 0},
  left: ${child.left ?? 0},
  child: ${textoWidget},
)
            `.trim();
          }
        });
        childrenStack = `
child: Stack(
  children: [
    ${mappedChildren.join(',\n    ')}
  ],
),
        `.trim();
      }

      const containerWithChildren = childrenStack
        ? `
Container(
  width: ${width},
  height: ${height},
  decoration: ${decoration},
  child: Stack(
    children: [
      ${iconButtonWidget},
      ${comp.children!.length > 0 ? childrenStack.replace('child: ', '') : ''}
    ],
  ),
)
        `.trim()
        : `
Container(
  width: ${width},
  height: ${height},
  decoration: ${decoration},
  child: ${iconButtonWidget},
)
        `.trim();

      if (comp.alignment) {
        return `
Align(
  alignment: Alignment.${comp.alignment},
  child: ${containerWithChildren},
)
        `.trim();
      } else {
        return `
Positioned(
  top: ${comp.top ?? 0},
  left: ${comp.left ?? 0},
  child: ${containerWithChildren},
)
        `.trim();
      }
    }

    // 5) DropdownButton
    if (comp.type === 'DropdownButton') {
      const optionsArray = Array.isArray(comp.options) ? comp.options : [];
      const optionsList = optionsArray
        .map((opt: string) => `'${opt.replace(/'/g, "\\'")}'`)
        .join(', ');

      const dropdownWidget = `
DropdownButton<String>(
  value: _dropdownValues['${comp.id}'],
  items: <String>[${optionsList}]
    .map<DropdownMenuItem<String>>((String value) {
      return DropdownMenuItem<String>(
        value: value,
        child: Text(value),
      );
    }).toList(),
  onChanged: (String? newValue) {
    setState(() {
      _dropdownValues['${comp.id}'] = newValue!;
    });
  },
)
      `.trim();

      const containerWithDropdown = `
Container(
  width: ${width},
  height: ${height},
  decoration: ${decoration},
  child: Center(child: ${dropdownWidget}),
)
      `.trim();

      if (comp.alignment) {
        return `
Align(
  alignment: Alignment.${comp.alignment},
  child: ${containerWithDropdown},
)
        `.trim();
      } else {
        return `
Positioned(
  top: ${comp.top ?? 0},
  left: ${comp.left ?? 0},
  child: ${containerWithDropdown},
)
        `.trim();
      }
    }

    // 6) Container genérico (puede tener children)
    if (comp.type === 'Container') {
      let childrenStack = '';
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        const mappedChildren = comp.children.map((child: any) =>
          this.generateFlutterWidget(child),
        );
        childrenStack = `
child: Stack(
  children: [
    ${mappedChildren.join(',\n    ')}
  ],
),
        `.trim();
      }

      const containerWithChildren = childrenStack
        ? `
Container(
  width: ${width},
  height: ${height},
  decoration: ${decoration},
  ${childrenStack}
)
        `.trim()
        : `
Container(
  width: ${width},
  height: ${height},
  decoration: ${decoration},
)
        `.trim();

      if (comp.alignment) {
        return `
Align(
  alignment: Alignment.${comp.alignment},
  child: ${containerWithChildren},
)
        `.trim();
      } else {
        return `
Positioned(
  top: ${comp.top ?? 0},
  left: ${comp.left ?? 0},
  child: ${containerWithChildren},
)
        `.trim();
      }
    }

    // 7) Fallback: un Container vacío
    const fallback = `
Container(
  width: ${width},
  height: ${height},
  decoration: ${decoration},
)
    `.trim();

    if (comp.alignment) {
      return `
Align(
  alignment: Alignment.${comp.alignment},
  child: ${fallback},
)
      `.trim();
    } else {
      return `
Positioned(
  top: ${comp.top ?? 0},
  left: ${comp.left ?? 0},
  child: ${fallback},
)
      `.trim();
    }
// para el checkbox;
if (comp.type === 'Checkbox') {
  const top = comp.top ?? 0;
  const left = comp.left ?? 0;
  const fontSize = comp.fontSize ?? 14;
  const label = (comp.text ?? '').replace(/'/g, "\\'");
  const checkVar = `_${comp.id}_checked`;

  return `
Positioned(
  top: ${top},
  left: ${left},
  child: Row(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Checkbox(
        value: ${checkVar},
        onChanged: (bool? value) {
          setState(() {
            ${checkVar} = value!;
          });
        },
      ),
      Flexible(
        child: Text(
          '${label}',
          style: TextStyle(
            fontSize: ${fontSize},
          ),
        ),
      ),
    ],
  ),
)
  `.trim();
}

    
  }

  private replaceRoutes(
    original: string,
    imports: string,
    routes: string,
  ): string {
    const withoutPageImports = original
      .replace(/import\s+'\.\.\/pages\/[^']+\/[^']+\.dart';?\s*/g, '')
      .trim();

    let header = '';
    if (
      !withoutPageImports.includes(`import 'package:flutter/material.dart';`)
    ) {
      header = `import 'package:flutter/material.dart';\n`;
    }

    const newContent = `
${header}${imports.trim()}

${withoutPageImports.replace(
  /final Map<String, WidgetBuilder> appRoutes = \{[^}]*\};/s,
  `final Map<String, WidgetBuilder> appRoutes = {\n${routes.trim()}};`,
)}
`.trim();

    return newContent;
  }

  private async zipDirectory(
    source: string,
    out: string,
    folderName: string,
  ): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
      archive
        .directory(source, folderName)
        .on('error', (err) => reject(err))
        .pipe(stream);
      stream.on('close', () => resolve());
      archive.finalize();
    });
  }
}
