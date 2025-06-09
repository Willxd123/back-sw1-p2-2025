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
   * Detección recursiva para verificar si necesitamos StatefulWidget
   */
  private containsStatefulWidget(comps: any[]): boolean {
    for (const c of comps) {
      if (c.type === 'DropdownButton' || c.type === 'Checkbox') return true;
      if (Array.isArray(c.children) && c.children.length) {
        if (this.containsStatefulWidget(c.children)) return true;
      }
    }
    return false;
  }

  private generateFlutterPageDart(
    className: string,
    components: any[],
  ): string {
    // Buscar AppBar (solo el primero)
    const appBarComp = components.find((c) => c.type === 'AppBar');

    // Detectar recursivamente si existe algún DropdownButton o Checkbox
    const hasStateful = this.containsStatefulWidget(components);

    // Generar cuerpo (sin AppBar) como lista de strings
    const bodyComponents = components
      .filter((c) => c.type !== 'AppBar')
      .map((comp) => this.generateFlutterWidget(comp))
      .filter((widget) => widget.trim() !== '') // Filtrar widgets vacíos
      .join(',\n\n');

    // Construir appBarDart (vacío o con valores del JSON)
    let appBarDart = `appBar: AppBar(
        backgroundColor: const Color(0xFF2196f3),
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

    // Si no hay componentes con estado, generamos StatelessWidget
    if (!hasStateful) {
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

    // Si hay componentes con estado, generamos StatefulWidget
    return `import 'package:flutter/material.dart';

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final Map<String, String> _dropdownValues = {};
  final Map<String, bool> _checkboxValues = {};

  @override
  void initState() {
    super.initState();
    ${this.buildStateInitializers(components)}
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
   * Recorre los componentes para generar las líneas de initState()
   */
  private buildStateInitializers(comps: any[]): string {
    const lines: string[] = [];

    const processComponent = (c: any) => {
      if (c.type === 'DropdownButton') {
        const selectedOption =
          c.selectedOption ||
          (Array.isArray(c.options) && c.options.length > 0
            ? c.options[0]
            : 'Opción 1');
        lines.push(
          `_dropdownValues['${c.id}'] = '${selectedOption.replace(/'/g, "\\'")}';`,
        );
      }
      if (c.type === 'Checkbox') {
        const checked = c.checked ? 'true' : 'false';
        lines.push(`_checkboxValues['${c.id}'] = ${checked};`);
      }
      if (Array.isArray(c.children) && c.children.length) {
        c.children.forEach(processComponent);
      }
    };

    comps.forEach(processComponent);
    return lines.length > 0 ? lines.join('\n    ') : '';
  }

  /**
   * Genera cada widget Flutter
   */
  /**
   * Genera cada widget Flutter - VERSIÓN CORREGIDA
   */
  private generateFlutterWidget(comp: any): string {
    // 1) Propiedades comunes de tamaño y decoración
    const width = comp.width ?? 50;
    const height = comp.height ?? 50;
    const color = (comp.decoration?.color ?? '#ffffff').replace('#', '');
    const borderColor = (comp.decoration?.border?.color ?? '#000000').replace(
      '#',
      '',
    );
    const borderWidth = comp.decoration?.border?.width ?? 0;
    const borderRadius = comp.decoration?.borderRadius ?? 0;

    // Solo crear decoración si no es transparente
    const isTransparent =
      comp.decoration?.color === 'transparent' ||
      comp.decoration?.color === '#transparent';
    const hasBorder =
      borderWidth > 0 && comp.decoration?.border?.color !== 'transparent';

    let decoration = '';
    if (!isTransparent || hasBorder) {
      decoration = `BoxDecoration(
      ${!isTransparent ? `color: Color(0xFF${color}),` : ''}
      ${
        hasBorder
          ? `border: Border.all(
        color: Color(0xFF${borderColor}),
        width: ${borderWidth},
      ),`
          : ''
      }
      borderRadius: BorderRadius.circular(${borderRadius}),
    )`;
    }

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

      // Sanitizar fontFamily
      let fontFamilyValue: string | null = null;
      if (comp.fontFamily && comp.fontFamily !== 'inherit') {
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

      // Construir widget Text(...)
      const textWidget = `Text(
      '${rawText}',
      textAlign: ${textAlignDart},
      style: TextStyle(
        fontSize: ${fontSize},
        color: Color(0xFF${textColor}),${fontFamilyValue ? `\n        fontFamily: '${fontFamilyValue}',` : ''}
      ),
    )`;

      // Envolver en Container centrado
      const containerWrapper = `Container(
      width: ${comp.width},
      height: ${comp.height},
      alignment: Alignment.center,
      ${decoration ? `decoration: ${decoration},` : ''}
      child: ${textWidget},
    )`;

      // Posicionar con Align o Positioned
      if (comp.alignment) {
        return `Align(
        alignment: Alignment.${comp.alignment},
        child: ${containerWrapper},
      )`;
      } else {
        return `Positioned(
        top: ${comp.top ?? 0},
        left: ${comp.left ?? 0},
        child: ${containerWrapper},
      )`;
      }
    }

    // 4) IconButton
    if (comp.type === 'IconButton') {
      const tooltip = (comp.tooltip ?? '').replace(/'/g, "\\'");
      const icon = comp.icon ?? 'help_outline';
      const route = comp.navigateTo ?? '/';

      // Generar IconButton
      const iconButtonWidget = `IconButton(
      tooltip: '${tooltip}',
      icon: Icon(Icons.${icon}),
      onPressed: () {
        Navigator.pushNamed(context, '${route}');
      },
    )`;

      // Si tiene hijos (Text), los superponemos
      let childrenWidgets = '';
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        const mappedChildren = comp.children
          .map((child: any) => this.generateFlutterWidget(child))
          .filter((widget) => widget.trim() !== '')
          .join(',\n        ');

        if (mappedChildren) {
          childrenWidgets = `,
        ${mappedChildren}`;
        }
      }

      // Contenedor con decoración
      const containerWithButton = `Container(
      width: ${width},
      height: ${height},
      ${decoration ? `decoration: ${decoration},` : ''}
      child: ${
        comp.children && comp.children.length > 0
          ? `Stack(
        children: [
          Center(child: ${iconButtonWidget})${childrenWidgets}
        ],
      )`
          : `Center(child: ${iconButtonWidget})`
      },
    )`;

      // Posicionar o alinear
      if (comp.alignment) {
        return `Align(
        alignment: Alignment.${comp.alignment},
        child: ${containerWithButton},
      )`;
      } else {
        return `Positioned(
        top: ${comp.top ?? 0},
        left: ${comp.left ?? 0},
        child: ${containerWithButton},
      )`;
      }
    }

    // 5) Checkbox - VERSIÓN CORREGIDA
    // 5) Checkbox - VERSIÓN CORREGIDA COMPLETA
if (comp.type === 'Checkbox') {
  // Usar las propiedades específicas del checkbox personalizado
  const baseSize = comp.checkSize || 24;
  const scale = comp.scale || 1;
  const scaledSize = baseSize * scale;
  
  // Colores específicos del checkbox
  const checkColor = (comp.checkColor ?? '#FF0000').replace('#', '');
  const activeColor = (comp.activeColor ?? '#FFFF00').replace('#', '');
  const borderColor = (comp.borderColor ?? comp.checkColor ?? '#FF0000').replace('#', '');
  
  // Propiedades del borde y forma
  const checkBorderWidth = comp.borderWidth ?? 1;
  const checkBorderRadius = comp.borderRadius ?? 4;
  
  // Propiedades de la etiqueta (si existe)
  const labelText = (comp.text ?? '').replace(/'/g, "\\'");
  const labelGap = comp.labelGap ?? 8;
  const labelPosition = comp.labelPosition ?? 'right';
  const fontSize = comp.fontSize ?? 14;
  const textColor = (comp.textColor ?? '#000000').replace('#', '');
  
  // Determinar si es layout horizontal o vertical
  const isRow = labelPosition === 'left' || labelPosition === 'right';
  const dirWidget = isRow ? 'Row' : 'Column';
  
  // Crear el checkbox visual personalizado
  const checkboxWidget = `Container(
    width: ${scaledSize},
    height: ${scaledSize},
    decoration: BoxDecoration(
      color: _checkboxValues['${comp.id}'] == true 
        ? Color(0xFF${activeColor}) 
        : Colors.white,
      border: Border.all(
        color: Color(0xFF${borderColor}),
        width: ${checkBorderWidth},
      ),
      borderRadius: BorderRadius.circular(${checkBorderRadius === 50 ? scaledSize / 2 : checkBorderRadius}),
    ),
    child: _checkboxValues['${comp.id}'] == true
      ? Center(
          child: Text(
            '✓',
            style: TextStyle(
              color: Color(0xFF${checkColor}),
              fontSize: ${scaledSize * 0.6},
              fontWeight: FontWeight.bold,
              height: 1,
            ),
          ),
        )
      : null,
  )`;
  
  // Envolver en GestureDetector para manejar clicks
  const clickableCheckbox = `GestureDetector(
    onTap: () => setState(() => 
      _checkboxValues['${comp.id}'] = !(_checkboxValues['${comp.id}'] ?? false)
    ),
    child: ${checkboxWidget},
  )`;
  
  // Si hay texto de etiqueta, crear el widget de texto
  let content = clickableCheckbox;
  if (labelText.trim() !== '') {
    const textWidget = `Flexible(
      child: Text(
        '${labelText}',
        style: TextStyle(
          fontSize: ${fontSize},
          color: Color(0xFF${textColor}),
        ),
        overflow: TextOverflow.ellipsis,
        maxLines: 2,
      ),
    )`;
    
    const spacerWidget = isRow
      ? `SizedBox(width: ${labelGap})`
      : `SizedBox(height: ${labelGap})`;
    
    // Orden de hijos según labelPosition
    let childrenOrder: string[] = [];
    if (labelPosition === 'left' || labelPosition === 'top') {
      childrenOrder = [textWidget, spacerWidget, clickableCheckbox];
    } else {
      childrenOrder = [clickableCheckbox, spacerWidget, textWidget];
    }
    
    // Componer Row/Column con los hijos
    content = `${dirWidget}(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        ${childrenOrder.join(',\n        ')},
      ],
    )`;
  }
  
  // Contenedor principal - usar las dimensiones originales del componente
  const container = `Container(
    width: ${width},
    height: ${height},
    padding: const EdgeInsets.all(4.0),
    child: Center(child: ${content}),
  )`;
  
  // Posicionar o alinear
  if (comp.alignment) {
    return `Align(
      alignment: Alignment.${comp.alignment},
      child: ${container},
    )`;
  } else {
    return `Positioned(
      top: ${comp.top ?? 0},
      left: ${comp.left ?? 0},
      child: ${container},
    )`;
  }
}

    // 6) DropdownButton - VERSIÓN MEJORADA
    if (comp.type === 'DropdownButton') {
      const optionsArray = Array.isArray(comp.options) ? comp.options : [];
      const optionsList = optionsArray
        .map((opt: string) => `'${opt.replace(/'/g, "\\'")}'`)
        .join(', ');

      const dropdownWidget = `DropdownButton<String>(
      value: _dropdownValues['${comp.id}'],
      isExpanded: true,
      items: <String>[${optionsList}]
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
          _dropdownValues['${comp.id}'] = newValue ?? '';
        });
      },
    )`;

      const containerWithDropdown = `Container(
      width: ${width},
      height: ${height},
      ${decoration ? `decoration: ${decoration},` : ''}
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      child: Center(child: ${dropdownWidget}),
    )`;

      if (comp.alignment) {
        return `Align(
        alignment: Alignment.${comp.alignment},
        child: ${containerWithDropdown},
      )`;
      } else {
        return `Positioned(
        top: ${comp.top ?? 0},
        left: ${comp.left ?? 0},
        child: ${containerWithDropdown},
      )`;
      }
    }

    // 7) Container genérico (puede tener children)
    if (comp.type === 'Container') {
      let childrenStack = '';
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        const mappedChildren = comp.children
          .map((child: any) => this.generateFlutterWidget(child))
          .filter((widget) => widget.trim() !== '')
          .join(',\n        ');

        if (mappedChildren) {
          childrenStack = `child: Stack(
        children: [
          ${mappedChildren}
        ],
      ),`;
        }
      }

      const containerWithChildren = `Container(
      width: ${width},
      height: ${height},
      ${decoration ? `decoration: ${decoration},` : ''}
      ${childrenStack}
    )`;

      if (comp.alignment) {
        return `Align(
        alignment: Alignment.${comp.alignment},
        child: ${containerWithChildren},
      )`;
      } else {
        return `Positioned(
        top: ${comp.top ?? 0},
        left: ${comp.left ?? 0},
        child: ${containerWithChildren},
      )`;
      }
    }

    // 8) Fallback: un Container vacío
    const fallback = `Container(
    width: ${width},
    height: ${height},
    ${decoration ? `decoration: ${decoration},` : ''}
  )`;

    if (comp.alignment) {
      return `Align(
      alignment: Alignment.${comp.alignment},
      child: ${fallback},
    )`;
    } else {
      return `Positioned(
      top: ${comp.top ?? 0},
      left: ${comp.left ?? 0},
      child: ${fallback},
    )`;
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
