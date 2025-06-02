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

  private generateFlutterPageDart(
    className: string,
    components: any[],
  ): string {
    const widgets = components
      .map((comp) => this.generateFlutterWidget(comp))
      .join(',\n\n');

    return `import 'package:flutter/material.dart';

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
${widgets
  .split('\n')
  .map((line) => '          ' + line)
  .join('\n')}
        ],
      ),
    );
  }
}`;
  }

  private generateFlutterWidget(comp: any): string {
    const width = comp.width ?? 50;
    const height = comp.height ?? 50;
    const color = comp.decoration?.color?.replace('#', '') ?? 'ffffff';
    const borderColor =
      comp.decoration?.border?.color?.replace('#', '') ?? '000000';
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

    let innerWidget = '';

    if (comp.type === 'IconButton') {
      const tooltip = comp.tooltip ?? '';
      const icon = comp.icon ?? 'help_outline';
      const route = comp.navigateTo ?? '/';

      innerWidget = `Container(
        width: ${width},
        height: ${height},
        decoration: ${decoration},
        child: IconButton(
          tooltip: '${tooltip}',
          icon: const Icon(Icons.${icon}),
          onPressed: () {
            Navigator.pushNamed(context, '${route}');
          },
        ),
      )`;
    } else {
      innerWidget = `Container(
        width: ${width},
        height: ${height},
        decoration: ${decoration},
      )`;
    }

    if (comp.alignment) {
      return `Align(
        alignment: Alignment.${comp.alignment},
        child: ${innerWidget},
      )`;
    } else {
      const top = comp.top ?? 0;
      const left = comp.left ?? 0;
      return `Positioned(
        top: ${top},
        left: ${left},
        child: ${innerWidget},
      )`;
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
