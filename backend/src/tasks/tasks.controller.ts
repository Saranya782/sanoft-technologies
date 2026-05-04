import { Controller, Post, Body, UseGuards, Request, Get, Put, Delete, Param, Patch } from '@nestjs/common';
import { TasksService, CreateTaskDto } from './tasks.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  createTask(@Request() req: any, @Body() body: CreateTaskDto) {
    return this.tasksService.createTask(body, req.user.uid);
  }

  @Get()
  getTasks(@Request() req: any) {
    return this.tasksService.getTasks(req.user.uid);
  }

  @Get(':id')
  getTask(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.getTaskById(id, req.user.uid);
  }

  @Put(':id')
  updateTask(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.tasksService.updateTask(id, body, req.user.uid);
  }

  @Delete(':id')
  deleteTask(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.deleteTask(id, req.user.uid);
  }

  @Patch(':id/status')
  updateTaskStatus(@Param('id') id: string, @Request() req: any, @Body() body: { status: string }) {
    return this.tasksService.updateTaskStatus(id, body.status, req.user.uid);
  }
}
