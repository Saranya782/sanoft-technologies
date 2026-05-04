import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  createOrg(@Request() req: any, @Body('name') name: string) {
    return this.organizationsService.createOrg(name, req.user.uid);
  }

  @Get(':id')
  getOrg(@Param('id') id: string) {
    return this.organizationsService.getOrg(id);
  }
}
