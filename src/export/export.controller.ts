import { Controller, Get, Param, Res } from '@nestjs/common';
import { ExportService } from './export.service';
import { Response } from 'express';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('flutter/:roomCode')
  async exportFlutter(@Param('roomCode') roomCode: string, @Res() res: Response) {
    try {
      const zipPath = await this.exportService.exportRoomAsFlutter(roomCode);
      res.download(zipPath, `flutter-${roomCode}.zip`);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
