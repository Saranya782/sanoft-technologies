import { Controller, Get, Put, Param, UseGuards, Request } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  getAlerts(@Request() req: any) {
    return this.alertsService.getUserAlerts(req.user.uid);
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.alertsService.markAsRead(id);
  }
}
