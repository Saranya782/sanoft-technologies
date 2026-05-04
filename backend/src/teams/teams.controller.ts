import { Controller, Post, Body, UseGuards, Request, Get, Put, Delete, Param } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('teams')
@UseGuards(AuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  createTeam(@Request() req: any, @Body() body: { orgId: string, name: string }) {
    return this.teamsService.createTeam(body.orgId, body.name, req.user.uid);
  }

  @Get('org/:orgId')
  getTeams(@Param('orgId') orgId: string) {
    return this.teamsService.getTeamsByOrg(orgId);
  }

  @Put(':id')
  updateTeam(@Param('id') id: string, @Request() req: any, @Body() body: { name: string }) {
    return this.teamsService.updateTeam(id, body.name, req.user.uid);
  }

  @Delete(':id')
  deleteTeam(@Param('id') id: string, @Request() req: any) {
    return this.teamsService.deleteTeam(id, req.user.uid);
  }

  @Post(':id/members')
  assignMember(@Param('id') id: string, @Request() req: any, @Body() body: { userId: string }) {
    return this.teamsService.assignMember(id, body.userId, req.user.uid);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    return this.teamsService.removeMember(id, userId, req.user.uid);
  }
}
