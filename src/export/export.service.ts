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

      // Validar componentes antes de generar
      const validatedComponents = this.validateComponents(page.components);
      const dartContent = this.generateFlutterPageDart(
        pageClassName,
        validatedComponents,
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

  /**
   * Valida y normaliza los componentes antes de procesarlos
   */
  private validateComponents(components: any[]): any[] {
    return components.map((comp) => this.validateComponent(comp));
  }

  /**
   * Valida un componente individual y sus propiedades
   */
  private validateComponent(comp: any): any {
    const validated = { ...comp };

    // Validar dimensiones
    validated.width = this.validateNumeric(comp.width, 50, 1, 10000);
    validated.height = this.validateNumeric(comp.height, 50, 1, 10000);

    // Validar posicionamiento
    if (comp.top !== undefined) {
      validated.top = this.validateNumeric(comp.top, 0, 0, 10000);
    }
    if (comp.left !== undefined) {
      validated.left = this.validateNumeric(comp.left, 0, 0, 10000);
    }

    // Validar padding
    validated.paddingAll = this.validateNumeric(comp.paddingAll, 0, 0, 100);
    validated.paddingHorizontal = this.validateNumeric(
      comp.paddingHorizontal,
      0,
      0,
      100,
    );
    validated.paddingVertical = this.validateNumeric(
      comp.paddingVertical,
      0,
      0,
      100,
    );
    validated.paddingTop = this.validateNumeric(comp.paddingTop, 0, 0, 100);
    validated.paddingBottom = this.validateNumeric(
      comp.paddingBottom,
      0,
      0,
      100,
    );
    validated.paddingLeft = this.validateNumeric(comp.paddingLeft, 0, 0, 100);
    validated.paddingRight = this.validateNumeric(comp.paddingRight, 0, 0, 100);

    // Validar gap para layouts
    validated.gap = this.validateNumeric(comp.gap, 0, 0, 100);

    // Validar colores
    if (comp.decoration) {
      validated.decoration = { ...comp.decoration };
      if (comp.decoration.color) {
        validated.decoration.color = this.validateColor(
          comp.decoration.color,
          '#ffffff',
        );
      }
      if (comp.decoration.border) {
        validated.decoration.border = {
          color: this.validateColor(comp.decoration.border.color, '#000000'),
          width: this.validateNumeric(comp.decoration.border.width, 0, 0, 20),
        };
      }
      validated.decoration.borderRadius = this.validateNumeric(
        comp.decoration.borderRadius,
        0,
        0,
        100,
      );
    }

    // Validar texto
    if (comp.text !== undefined) {
      validated.text = String(comp.text || '');
    }

    // Validar propiedades de texto
    validated.fontSize = this.validateNumeric(comp.fontSize, 14, 8, 72);
    if (comp.textColor) {
      validated.textColor = this.validateColor(comp.textColor, '#000000');
    }

    // Validar alignment
    if (comp.alignment) {
      validated.alignment = this.validateAlignment(comp.alignment);
    }

    // Validar childrenLayout
    if (comp.childrenLayout) {
      validated.childrenLayout = this.validateChildrenLayout(
        comp.childrenLayout,
      );
    }

    // Validar componentes hijos recursivamente
    if (Array.isArray(comp.children)) {
      validated.children = comp.children.map((child) =>
        this.validateComponent(child),
      );
    }

    return validated;
  }

  /**
   * Valida valores numéricos
   */
  private validateNumeric(
    value: any,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    const num = Number(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Valida colores en formato hexadecimal
   */
  private validateColor(color: string, defaultColor: string): string {
    if (!color || typeof color !== 'string') return defaultColor;

    // Permitir transparent
    if (color.toLowerCase() === 'transparent') return 'transparent';

    // Validar formato hex
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(color)) return color;

    return defaultColor;
  }

  /**
   * Valida alignment
   */
  private validateAlignment(alignment: string): string {
    const validAlignments = [
      'topLeft',
      'topCenter',
      'topRight',
      'centerLeft',
      'center',
      'centerRight',
      'bottomLeft',
      'bottomCenter',
      'bottomRight',
    ];

    return validAlignments.includes(alignment) ? alignment : 'center';
  }

  /**
   * Valida childrenLayout
   */
  private validateChildrenLayout(layout: string): string {
    const validLayouts = ['stack', 'column', 'row'];
    return validLayouts.includes(layout) ? layout : 'stack';
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

    // Construir appBarDart
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

    // Determinar el layout del body
    const bodyLayout = this.determineBodyLayout(
      components.filter((c) => c.type !== 'AppBar'),
    );

    // Si no hay componentes con estado, generamos StatelessWidget
    if (!hasStateful) {
      return `import 'package:flutter/material.dart';

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      ${appBarDart}
      body: ${bodyLayout},
    );
  }
}`;
    }

    // Generar inicializadores solo si hay componentes con estado
    const stateInitializers = this.buildStateInitializers(components);
    const initStateContent =
      stateInitializers.trim() === ''
        ? ''
        : `
  @override
  void initState() {
    super.initState();
    ${stateInitializers}
  }`;

    // Si hay componentes con estado, generamos StatefulWidget
    return `import 'package:flutter/material.dart';

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final Map<String, String> _dropdownValues = {};
  final Map<String, bool> _checkboxValues = {};${initStateContent}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      ${appBarDart}
      body: ${bodyLayout},
    );
  }
}`;
  }

  /**
   * Determina el layout del body basado en los componentes
   */
  private determineBodyLayout(components: any[]): string {
    if (components.length === 0) {
      return 'Container()';
    }

    // Verificar si hay componentes con posicionamiento absoluto
    const hasAbsolutePositioning = components.some(
      (comp) =>
        comp.top !== undefined && comp.left !== undefined && !comp.alignment,
    );

    // Si hay posicionamiento absoluto, usar Stack
    if (hasAbsolutePositioning) {
      const stackChildren = components
        .map((comp) => this.generateFlutterWidget(comp))
        .filter((widget) => widget.trim() !== '')
        .join(',\n          ');

      return `Stack(
        children: [
          ${stackChildren}
        ],
      )`;
    }

    // Si no hay posicionamiento absoluto, usar Column con espaciado
    const columnChildren = components
      .map((comp) => this.generateFlutterWidget(comp))
      .filter((widget) => widget.trim() !== '')
      .join(',\n          ');

    return `Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ${columnChildren}
        ],
      ),
    )`;
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
   * Genera cada widget Flutter con soporte mejorado para padding y validaciones
   */
  private generateFlutterWidget(comp: any): string {
    // Propiedades comunes validadas
    const width = comp.width ?? 50;
    const height = comp.height ?? 50;
    const color = (comp.decoration?.color ?? '#ffffff').replace('#', '');
    const borderColor = (comp.decoration?.border?.color ?? '#000000').replace(
      '#',
      '',
    );
    const borderWidth = comp.decoration?.border?.width ?? 0;
    const borderRadius = comp.decoration?.borderRadius ?? 0;

    // Verificar transparencia
    const isTransparent =
      comp.decoration?.color === 'transparent' ||
      comp.decoration?.color === '#transparent' ||
      !comp.decoration?.color;
    const hasBorder =
      borderWidth > 0 && comp.decoration?.border?.color !== 'transparent';

    // Generar padding EdgeInsets
    const paddingEdgeInsets = this.generatePaddingEdgeInsets(comp);

    // Crear decoración
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

    // AppBar no se maneja aquí
    if (comp.type === 'AppBar') {
      return '';
    }

    // Text con posicionamiento especial
    if (comp.type === 'Text') {
      return this.generateTextWidget(comp, paddingEdgeInsets);
    }

    // TextButton
    if (comp.type === 'TextButton') {
      return this.generateTextButtonWidget(
        comp,
        width,
        height,
        color,
        borderColor,
        borderWidth,
        borderRadius,
        isTransparent,
        paddingEdgeInsets,
      );
    }

    // TextField
    if (comp.type === 'TextField') {
      return this.generateTextFieldWidget(
        comp,
        width,
        height,
        color,
        borderColor,
        borderWidth,
        borderRadius,
        isTransparent,
        paddingEdgeInsets,
      );
    }

    // Checkbox
    if (comp.type === 'Checkbox') {
      return this.generateCheckboxWidget(
        comp,
        width,
        height,
        paddingEdgeInsets,
      );
    }

    // DropdownButton
    if (comp.type === 'DropdownButton') {
      return this.generateDropdownWidget(
        comp,
        width,
        height,
        decoration,
        paddingEdgeInsets,
      );
    }

    // Container con soporte para layouts mejorado
    if (comp.type === 'Container') {
      return this.generateContainerWidget(
        comp,
        width,
        height,
        decoration,
        paddingEdgeInsets,
      );
    }

    // Fallback: un Container vacío
    const fallback = `Container(
      width: ${width},
      height: ${height},
      ${decoration ? `decoration: ${decoration},` : ''}
      ${paddingEdgeInsets ? `padding: ${paddingEdgeInsets},` : ''}
    )`;

    if (comp.type === 'table') {
      const {
        top = 0,
        left = 0,
        tableBorder,
        columnWidths,
        defaultVerticalAlignment = 'middle',
        headerRow,
        headerBackgroundColor,
        alternateRowColor,
        cellPadding = 8,
        children = [],
      } = comp;

      const verticalAlignment =
        {
          top: 'TableCellVerticalAlignment.top',
          middle: 'TableCellVerticalAlignment.middle',
          bottom: 'TableCellVerticalAlignment.bottom',
        }[defaultVerticalAlignment] || 'TableCellVerticalAlignment.middle';

      const columnWidthsFlutter = (columnWidths || [])
        .map((w: number, i: number) => `${i}: FlexColumnWidth(${w})`)
        .join(', ');

      const tableRows = children
        .map((row: any, rowIndex: number) => {
          const isHeader = headerRow && rowIndex === 0;
          const rowColor = isHeader
            ? `Color(0xFF${(headerBackgroundColor || '#f0f0f0').replace('#', '')})`
            : alternateRowColor && rowIndex % 2 === 1
              ? `Color(0xFF${alternateRowColor.replace('#', '')})`
              : 'null';

          const cells = row.children
            .map((cell: any) => {
              const textColor = cell.textColor
                ? `Color(0xFF${cell.textColor.replace('#', '')})`
                : 'Colors.black';
              const fontSize = cell.fontSize || 12;
              const fontWeight = isHeader
                ? 'FontWeight.bold'
                : 'FontWeight.normal';
              const textAlign = cell.textAlign || 'center';
              const cellText = (cell.content || '').replace(/"/g, '\"');

              return `
            Padding(
              padding: EdgeInsets.all(${cellPadding.toFixed(1)}),
              child: Text(
                "${cellText}",
                textAlign: TextAlign.${textAlign},
                style: TextStyle(
                  color: ${textColor},
                  fontSize: ${fontSize},
                  fontWeight: ${fontWeight},
                ),
              ),
            )`;
            })
            .join(',\n');

          return `
          TableRow(
            decoration: BoxDecoration(color: ${rowColor}),
            children: [${cells}]
          )`;
        })
        .join(',\n');

      return `
Positioned(
  top: ${top},
  left: ${left},
  right: 30,
  child: Table(
    border: TableBorder.all(
      color: Color(0xFF${(tableBorder?.color || '#000000').replace('#', '')}),
      width: ${(tableBorder?.width || 1).toFixed(1)},
    ),
    columnWidths: { ${columnWidthsFlutter} },
    defaultVerticalAlignment: ${verticalAlignment},
    children: [
      ${tableRows}
    ],
  ),
)`;
    }
    return this.wrapWithPositioning(fallback, comp);
  }
  //tabla

  /**
   * Genera EdgeInsets para padding basado en las propiedades del componente
   */
  private generatePaddingEdgeInsets(comp: any): string {
    // Prioridad: paddingAll -> paddingHorizontal/Vertical -> valores individuales
    if (comp.paddingAll !== undefined && comp.paddingAll > 0) {
      return `EdgeInsets.all(${comp.paddingAll})`;
    }

    const hasHorizontal =
      comp.paddingHorizontal !== undefined && comp.paddingHorizontal > 0;
    const hasVertical =
      comp.paddingVertical !== undefined && comp.paddingVertical > 0;

    if (hasHorizontal && hasVertical) {
      return `EdgeInsets.symmetric(horizontal: ${comp.paddingHorizontal}, vertical: ${comp.paddingVertical})`;
    } else if (hasHorizontal) {
      return `EdgeInsets.symmetric(horizontal: ${comp.paddingHorizontal})`;
    } else if (hasVertical) {
      return `EdgeInsets.symmetric(vertical: ${comp.paddingVertical})`;
    }

    // Valores individuales
    const top = comp.paddingTop ?? 0;
    const right = comp.paddingRight ?? 0;
    const bottom = comp.paddingBottom ?? 0;
    const left = comp.paddingLeft ?? 0;

    if (top > 0 || right > 0 || bottom > 0 || left > 0) {
      return `EdgeInsets.only(top: ${top}, right: ${right}, bottom: ${bottom}, left: ${left})`;
    }

    return '';
  }

  private generateTextWidget(comp: any, paddingEdgeInsets: string): string {
    const rawText = (comp.text ?? '').replace(/'/g, "\\'");
    const fontSize = comp.fontSize ?? 14;
    const textColor =
      comp.textColor && comp.textColor !== 'transparent'
        ? comp.textColor.replace('#', '')
        : '000000';

    let fontFamilyValue: string | null = null;
    if (comp.fontFamily && comp.fontFamily !== 'inherit') {
      fontFamilyValue = comp.fontFamily.trim().replace(/^['"]|['"]$/g, '');
    }

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

    let textWidget = `Text(
      '${rawText}',
      textAlign: ${textAlignDart},
      style: TextStyle(
        fontSize: ${fontSize},
        color: Color(0xFF${textColor}),${fontFamilyValue ? `\n        fontFamily: '${fontFamilyValue}',` : ''}
      ),
    )`;

    // Aplicar padding si existe
    if (paddingEdgeInsets) {
      textWidget = `Padding(
        padding: ${paddingEdgeInsets},
        child: ${textWidget},
      )`;
    }

    // Aplicar posicionamiento
    if (
      comp.parentId &&
      ((comp.top !== undefined && comp.left !== undefined) || !comp.alignment)
    ) {
      const topValue = comp.top ?? 0;
      const leftValue = comp.left ?? 0;

      return `Positioned(
        top: ${topValue},
        left: ${leftValue},
        child: ${textWidget},
      )`;
    }

    return this.wrapWithPositioning(textWidget, comp);
  }

  private generateContainerWidget(
    comp: any,
    width: number,
    height: number,
    decoration: string,
    paddingEdgeInsets: string,
  ): string {
    const childrenLayout = comp.childrenLayout ?? 'stack';
    const gap = comp.gap ?? 0;

    let childrenWidget = '';
    if (Array.isArray(comp.children) && comp.children.length > 0) {
      const textChildren = comp.children.filter(
        (child: any) => child.type === 'Text',
      );
      const otherChildren = comp.children.filter(
        (child: any) => child.type !== 'Text',
      );

      const mappedOtherChildren = otherChildren
        .map((child: any) => this.generateFlutterWidget(child))
        .filter((widget) => widget.trim() !== '');

      const mappedTextChildren = textChildren
        .map((child: any) => this.generateFlutterWidget(child))
        .filter((widget) => widget.trim() !== '');

      if (mappedOtherChildren.length > 0) {
        switch (childrenLayout) {
          case 'column':
            const columnChildren = mappedOtherChildren.join(',\n          ');
            childrenWidget = `child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        spacing: ${gap},
        children: [
          ${columnChildren}
        ],
      )`;
            break;
          case 'row':
            const rowChildren = mappedOtherChildren.join(',\n          ');
            childrenWidget = `child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        spacing: ${gap},
        children: [
          ${rowChildren}
        ],
      )`;
            break;
          default: // stack
            const stackChildren = [
              ...mappedOtherChildren,
              ...mappedTextChildren,
            ].join(',\n          ');
            childrenWidget = `child: Stack(
        children: [
          ${stackChildren}
        ],
      )`;
            break;
        }
      }

      if (
        mappedTextChildren.length > 0 &&
        (childrenLayout === 'row' || childrenLayout === 'column')
      ) {
        const layoutWidget = childrenWidget.replace('child: ', '');
        const allTextChildren = mappedTextChildren.join(',\n          ');

        childrenWidget = `child: Stack(
        children: [
          ${layoutWidget},
          ${allTextChildren}
        ],
      )`;
      }
    }

    const containerWithChildren = `Container(
      width: ${width},
      height: ${height},
      ${decoration ? `decoration: ${decoration},` : ''}
      ${paddingEdgeInsets ? `padding: ${paddingEdgeInsets},` : ''}
      ${childrenWidget ? childrenWidget + ',' : ''}
    )`;

    return this.wrapWithPositioning(containerWithChildren, comp);
  }

  // Métodos auxiliares para otros widgets...
  private generateTextButtonWidget(
    comp: any,
    width: number,
    height: number,
    color: string,
    borderColor: string,
    borderWidth: number,
    borderRadius: number,
    isTransparent: boolean,
    paddingEdgeInsets: string,
  ): string {
    const label = (comp.text ?? '').replace(/'/g, "\\'");
    const fontSize = comp.fontSize ?? 16;
    const textColor = (comp.textColor ?? '#000000').replace('#', '');
    const route = comp.navigateTo ?? '/';

    let buttonWidget = `SizedBox(
      width: ${width},
      height: ${height},
      child: TextButton(
        style: TextButton.styleFrom(
          padding: EdgeInsets.all(4),
          backgroundColor: ${isTransparent ? 'Colors.transparent' : `Color(0xFF${color})`},
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(${borderRadius}),
            side: BorderSide(color: Color(0xFF${borderColor}), width: ${borderWidth}),
          ),
        ),
        onPressed: () => Navigator.pushNamed(context, '${route}'),
        child: Text(
          '${label}',
          style: TextStyle(
            fontSize: ${fontSize},
            color: Color(0xFF${textColor}),
          ),
        ),
      ),
    )`;

    if (paddingEdgeInsets) {
      buttonWidget = `Padding(
        padding: ${paddingEdgeInsets},
        child: ${buttonWidget},
      )`;
    }

    return this.wrapWithPositioning(buttonWidget, comp);
  }

  private generateTextFieldWidget(
    comp: any,
    width: number,
    height: number,
    color: string,
    borderColor: string,
    borderWidth: number,
    borderRadius: number,
    isTransparent: boolean,
    paddingEdgeInsets: string,
  ): string {
    const hintText = (comp.hintText ?? '').replace(/'/g, "\\'");
    const fontSize = comp.fontSize || 16;
    const inputTextColor = (comp.inputTextColor || '#212121').replace('#', '');
    const hintColor = (comp.hintColor || '#9e9e9e').replace('#', '');
    const focusedBorderColor = (comp.focusedBorderColor || '#2196f3').replace(
      '#',
      '',
    );
    const labelColor = (comp.labelColor || '#757575').replace('#', '');
    const backgroundColor = isTransparent
      ? 'Colors.transparent'
      : `Color(0xFF${color})`;

    // Determinar el tipo de borde
    const borderType = comp.borderType || 'outline';

    let inputBorder = '';
    let focusedBorder = '';

    if (borderType === 'outline') {
      inputBorder = `OutlineInputBorder(
        borderRadius: BorderRadius.circular(${borderRadius}),
        borderSide: BorderSide(
          color: Color(0xFF${borderColor}),
          width: ${borderWidth},
        ),
      )`;
      focusedBorder = `OutlineInputBorder(
        borderRadius: BorderRadius.circular(${borderRadius}),
        borderSide: BorderSide(
          color: Color(0xFF${focusedBorderColor}),
          width: ${borderWidth + 1},
        ),
      )`;
    } else if (borderType === 'underline') {
      inputBorder = `UnderlineInputBorder(
        borderSide: BorderSide(
          color: Color(0xFF${borderColor}),
          width: ${borderWidth},
        ),
      )`;
      focusedBorder = `UnderlineInputBorder(
        borderSide: BorderSide(
          color: Color(0xFF${focusedBorderColor}),
          width: ${borderWidth + 1},
        ),
      )`;
    } else {
      inputBorder = 'InputBorder.none';
      focusedBorder = 'InputBorder.none';
    }

    let textFieldWidget = `SizedBox(
      width: ${width},
      height: ${height},
      child: TextField(
        style: TextStyle(
          fontSize: ${fontSize},
          color: Color(0xFF${inputTextColor}),
        ),
        decoration: InputDecoration(
          hintText: '${hintText}',
          hintStyle: TextStyle(
            color: Color(0xFF${hintColor}),
            fontSize: ${fontSize},
          ),
          fillColor: ${backgroundColor},
          filled: true,
          border: ${inputBorder},
          enabledBorder: ${inputBorder},
          focusedBorder: ${focusedBorder},
          contentPadding: EdgeInsets.symmetric(
            horizontal: 12,
            vertical: ${comp.labelText ? 20 : 12},
          ),
          ${comp.labelText ? `labelText: '${comp.labelText.replace(/'/g, "\\'")}',` : ''}
          ${comp.labelText ? `labelStyle: TextStyle(color: Color(0xFF${labelColor})),` : ''}
        ),
        ${comp.inputType === 'password' ? 'obscureText: true,' : ''}
        ${comp.inputType === 'number' ? 'keyboardType: TextInputType.number,' : ''}
        ${comp.inputType === 'email' ? 'keyboardType: TextInputType.emailAddress,' : ''}
        ${comp.maxLength ? `maxLength: ${comp.maxLength},` : ''}
        enabled: ${comp.enabled !== false},
      ),
    )`;

    if (paddingEdgeInsets) {
      textFieldWidget = `Padding(
        padding: ${paddingEdgeInsets},
        child: ${textFieldWidget},
      )`;
    }

    return this.wrapWithPositioning(textFieldWidget, comp);
  }

  private generateCheckboxWidget(
    comp: any,
    width: number,
    height: number,
    paddingEdgeInsets: string,
  ): string {
    // Propiedades del checkbox personalizado
    const scale = comp.scale || 1;
    const checkColor = (comp.checkColor || '#FF0000').replace('#', '');
    const activeColor = (comp.activeColor || '#FFFF00').replace('#', '');
    const borderColor = (comp.borderColor || '#FF0000').replace('#', '');
    const borderWidth = comp.borderWidth || 2;
    const borderRadius = comp.borderRadius || 0;
    const isChecked = comp.checked || false;

    // Determinar si es circular basado en borderRadius
    // Si borderRadius >= 50, se considera circular
    const isCircular = borderRadius >= 50;
    const finalBorderRadius = isCircular ? 50 : borderRadius;

    // Crear el shape según si es circular o rectangular
    let shapeWidget = '';
    if (isCircular) {
      shapeWidget = `shape: CircleBorder(
        side: BorderSide(
          color: Color(0xFF${borderColor}),
          width: ${borderWidth},
        ),
      ),`;
    } else {
      shapeWidget = `shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(${finalBorderRadius}),
        side: BorderSide(
          color: Color(0xFF${borderColor}),
          width: ${borderWidth},
        ),
      ),`;
    }

    let checkboxWidget = `Transform.scale(
      scale: ${scale},
      child: Checkbox(
        value: _checkboxValues['${comp.id}'] ?? ${isChecked},
        activeColor: Color(0xFF${activeColor}),
        checkColor: Color(0xFF${checkColor}),
        side: BorderSide(
          color: Color(0xFF${borderColor}),
          width: ${borderWidth},
        ),
        ${shapeWidget}
        onChanged: (bool? value) {
          setState(() {
            _checkboxValues['${comp.id}'] = value ?? false;
          });
        },
      ),
    )`;

    // Envolver en Container para controlar el tamaño total si es necesario
    if (width !== 50 || height !== 50) {
      // Solo si no es el tamaño por defecto
      checkboxWidget = `Container(
        width: ${width},
        height: ${height},
        child: ${checkboxWidget},
      )`;
    }

    if (paddingEdgeInsets) {
      checkboxWidget = `Padding(
        padding: ${paddingEdgeInsets},
        child: ${checkboxWidget},
      )`;
    }

    return this.wrapWithPositioning(checkboxWidget, comp);
  }
  private generateDropdownWidget(
    comp: any,
    width: number,
    height: number,
    decoration: string,
    paddingEdgeInsets: string,
  ): string {
    const optionsArray = Array.isArray(comp.options)
      ? comp.options
      : ['Opción 1'];
    const optionsList = optionsArray
      .map((opt: string) => `'${opt.replace(/'/g, "\\'")}'`)
      .join(', ');

    let dropdownWidget = `Container(
      width: ${width},
      height: ${height},
      ${decoration ? `decoration: ${decoration},` : ''}
      ${paddingEdgeInsets ? `padding: ${paddingEdgeInsets},` : ''}
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _dropdownValues['${comp.id}'],
          isExpanded: true,
          items: <String>[${optionsList}].map((String value) {
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
              _dropdownValues['${comp.id}'] = newValue ?? '';
            });
          },
        ),
      ),
    )`;

    return this.wrapWithPositioning(dropdownWidget, comp);
  }

  /**
   * Helper para envolver widgets con posicionamiento
   */
  private wrapWithPositioning(widget: string, comp: any): string {
    if (comp.alignment) {
      return `Align(
      alignment: Alignment.${comp.alignment},
      child: ${widget},
    )`;
    } else if (comp.top !== undefined && comp.left !== undefined) {
      return `Positioned(
      top: ${comp.top ?? 0},
      left: ${comp.left ?? 0},
      child: ${widget},
    )`;
    } else {
      return `Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: ${widget},
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
