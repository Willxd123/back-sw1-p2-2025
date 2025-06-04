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

      const dartFilePath = path.join(
        pageFolderPath,
        `${pageFolderName}_page.dart`,
      );
      const dartContent = this.generateFlutterPageDart(
        pageClassName,
        page.components,
      );
      await writeFileAsync(dartFilePath, dartContent);

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
   * 1) Esta función detecta si hay un AppBar en "components" y lo mueve a Scaffold.appBar.
   * 2) El resto de componentes se dibujan en body: Stack([...]).
   */
  private generateFlutterPageDart(
    className: string,
    components: any[],
  ): string {
    // Buscamos un componente tipo 'AppBar' (si existe, tomamos solo el primero)
    const appBarComp = components.find((c) => c.type === 'AppBar');

    // Los componentes que NO sean 'AppBar' van al Stack
    const bodyComponents = components
      .filter((c) => c.type !== 'AppBar')
      .map((comp) => this.generateFlutterWidget(comp))
      .join(',\n\n');

    // Generamos la sección appBar (o un appBar vacío si no existe ningún componente de ese tipo)
    let appBarDart = `appBar: AppBar(
        backgroundColor: Color(0xFF2196f3),
        title: const Text(''),
        centerTitle: true,
      ),`;

    if (appBarComp) {
      // Si hay un AppBar en tu JSON, extraemos el texto del primer hijo 'Text'
      let titulo = '';
      if (Array.isArray(appBarComp.children) && appBarComp.children.length > 0) {
        const textChild = appBarComp.children.find((ch: any) => ch.type === 'Text');
        if (textChild) {
          titulo = (textChild.text ?? '').replace(/'/g, "\\'");
        }
      }
      // Armamos el AppBar con el color que venga en decoration y el título correspondiente
      const colorHex = (appBarComp.decoration?.color ?? '#2196f3').replace('#', '');
      appBarDart = `appBar: AppBar(
        backgroundColor: Color(0xFF${colorHex}),
        title: const Text('${titulo}'),
        centerTitle: true,
      ),`;
    }

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

  /**
   * Esta función genera cada widget (Positioned o Align) según el tipo:
   * - AppBar → NO entra aquí, porque lo sacamos en generateFlutterPageDart.
   * - Text → Si viene con decoration.color distinto de "transparent", lo envuelve en Container con BoxDecoration y Center(Text).
   *            Si viene "transparent", genera solo un Text(...) simple.
   * - IconButton → Genera Container con IconButton, y si tiene hijos Text, los superpone (en blanco semitransparente) encima.
   * - Container → Genera Container con o sin children (anidados en Stack).
   */
  private generateFlutterWidget(comp: any): string {
    // 1) Propiedades comunes
    const width = comp.width ?? 50;
    const height = comp.height ?? 50;
    const color = (comp.decoration?.color ?? '#ffffff').replace('#', '');
    const borderColor = (comp.decoration?.border?.color ?? '#000000').replace('#', '');
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

    // 2) Caso AppBar: NO se renderiza aquí, ya lo quitamos en generateFlutterPageDart
    if (comp.type === 'AppBar') {
      return ''; // nunca debería caer aquí
    }

    // 3) Caso Text suelto (o hijo de Container/IconButton) 
    if (comp.type === 'Text') {
      const rawText = (comp.text ?? '').replace(/'/g, "\\'");
      const fontSize = comp.fontSize ?? 14;

      // Si el JSON indica color distinto de "transparent", lo envolvemos en Container + Center(Text)
      const textDecoColor = (comp.decoration?.color ?? 'transparent').toLowerCase();
      if (textDecoColor !== 'transparent' && textDecoColor !== '#transparent') {
        // Extraemos color real del Text-container
        const textBgColor = textDecoColor.replace('#', '');
        return `
Positioned(
  top: ${comp.top ?? 0},
  left: ${comp.left ?? 0},
  child: Container(
    width: ${comp.width},
    height: ${comp.height},
    decoration: BoxDecoration(
      color: Color(0xFF${textBgColor}),
      border: Border.all(
        color: Color(0xFF${borderColor}),
        width: ${comp.decoration?.border?.width ?? 0},
      ),
      borderRadius: BorderRadius.circular(${comp.decoration?.borderRadius ?? 0}),
    ),
    child: const Center(
      child: Text(
        '${rawText}',
        style: TextStyle(
          fontSize: ${fontSize},
          color: Color(0xFFFFFFFF),
        ),
      ),
    ),
  ),
)
        `.trim();
      }

      // Si es transparente, generamos solo Text sin contenedor:
      const textColor = (comp.decoration?.color ?? '#000000').replace('#', '');
      const innerTextWidget = `
Text(
  '${rawText}',
  style: TextStyle(
    fontSize: ${fontSize},
    color: Color(0xFF${textColor}),
  ),
)
      `.trim();

      if (comp.alignment) {
        return `
Align(
  alignment: Alignment.${comp.alignment},
  child: ${innerTextWidget},
)
        `.trim();
      } else {
        return `
Positioned(
  top: ${comp.top ?? 0},
  left: ${comp.left ?? 0},
  child: ${innerTextWidget},
)
        `.trim();
      }
    }

    // 4) Caso IconButton (con posibles hijos Text superpuestos)
    if (comp.type === 'IconButton') {
      const tooltip = (comp.tooltip ?? '').replace(/'/g, "\\'");
      const icon = comp.icon ?? 'help_outline';
      const route = comp.navigateTo ?? '/';

      // 4.1. El widget principal
      const iconButtonWidget = `
IconButton(
  tooltip: '${tooltip}',
  icon: const Icon(Icons.${icon}),
  onPressed: () {
    Navigator.pushNamed(context, '${route}');
  },
)
      `.trim();

      // 4.2. Si tiene hijos (solo Text), los superponemos en color semitransparente blanco (0x80FFFFFF)
      let childrenStack = '';
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        // Iteramos cada hijo de tipo 'Text'
        const mappedChildren = comp.children.map((child: any) => {
          const rawText = (child.text ?? '').replace(/'/g, "\\'");
          const fontSize = child.fontSize ?? 14;
          // Usamos color semitransparente blanco fijo para los textos dentro de IconButton
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

      // 4.3. Construimos el Container final para este IconButton
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

      // 4.4. Posicionamos o alineamos según comp.alignment
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

    // 5) Caso Container (genérico, con posibles children)
    if (comp.type === 'Container') {
      let childrenStack = '';
      if (Array.isArray(comp.children) && comp.children.length > 0) {
        // Cada hijo lo generamos recursivamente
        const mappedChildren = comp.children.map((child: any) => {
          // IMPORTANTE: cuando generateFlutterWidget recibe un Text que tiene color ≠ transparent,
          // ya lo envolverá en su propio Container (con fondo y center), según la lógica anterior.
          // Si dentro de este Container viene otro Container, se anidará recursivamente.
          return this.generateFlutterWidget(child);
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

    // 6) Cualquier otro tipo: fallback a un Container vacío
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
  }

  private replaceRoutes(
    original: string,
    imports: string,
    routes: string,
  ): string {
    const importPart = original
      .replace(/import\s+['\"][^'\"]+['\"];?/g, '')
      .trim();
    return `${imports.trim()}

${importPart.replace(
  /final Map<String, WidgetBuilder> appRoutes = \{[^}]*\};/s,
  `final Map<String, WidgetBuilder> appRoutes = {\n${routes.trim()}};`,
)}`;
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
