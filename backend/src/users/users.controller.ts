import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // After a user registers on the frontend via Firebase Auth,
  // the frontend calls this endpoint with their JWT to create the user profile in Firestore.
  @Post('sync')
  @UseGuards(AuthGuard)
  async syncUser(@Request() req: any, @Body() body: { name: string; role?: 'admin' | 'user'; orgId?: string }) {
    const firebaseUser = req.user; // Decoded token from AuthGuard
    
    // Check if user already exists
    const existingUser = await this.usersService.getUser(firebaseUser.uid);
    if (existingUser) {
      return existingUser;
    }

    let orgId = body.orgId;
    
    if (!orgId && (!body.role || body.role === 'user')) {
      // Intentionally left blank to avoid auto-assigning to the first organization.
      // New users will remain as guests without an orgId until invited.
    }

    const userPayload: any = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: body.name || firebaseUser.email.split('@')[0],
      role: body.role || 'user',
      teamIds: [],
    };
    if (orgId) {
      userPayload.orgId = orgId;
    }

    const newUser = await this.usersService.createUser(userPayload);

    return newUser;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req: any) {
    const firebaseUser = req.user;
    return this.usersService.getUser(firebaseUser.uid);
  }

  @Get('org/:orgId')
  @UseGuards(AuthGuard)
  async getOrgUsers(@Param('orgId') orgId: string, @Request() req: any) {
    const firebaseUser = req.user;
    const currentUser = await this.usersService.getUser(firebaseUser.uid);
    if (!currentUser || currentUser.orgId !== orgId) {
      const { ForbiddenException } = require('@nestjs/common');
      throw new ForbiddenException("You can only view users in your organization");
    }
    return this.usersService.getUsersByOrg(orgId);
  }

  @Get('guests')
  @UseGuards(AuthGuard)
  async getGuestUsers(@Request() req: any) {
    const firebaseUser = req.user;
    const currentUser = await this.usersService.getUser(firebaseUser.uid);
    if (!currentUser || currentUser.role !== 'admin') {
      const { ForbiddenException } = require('@nestjs/common');
      throw new ForbiddenException("Only admins can view guest users");
    }
    return this.usersService.getGuestUsers();
  }

  @Post('invite')
  @UseGuards(AuthGuard)
  async inviteUser(@Request() req: any, @Body() body: { email: string }) {
    const firebaseUser = req.user;
    const currentUser = await this.usersService.getUser(firebaseUser.uid);
    
    if (!currentUser || currentUser.role !== 'admin' || !currentUser.orgId) {
      const { ForbiddenException } = require('@nestjs/common');
      throw new ForbiddenException("Only admins can invite users");
    }
    
    try {
      return await this.usersService.inviteUser(body.email, currentUser.orgId, currentUser.name);
    } catch (e: any) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException(e.message);
    }
  }

  @Post('accept-invite')
  @UseGuards(AuthGuard)
  async acceptInvite(@Request() req: any, @Body() body: { alertId: string, orgId: string }) {
    const firebaseUser = req.user;
    
    // update user orgId
    await this.usersService.updateUserOrg(firebaseUser.uid, body.orgId);
    
    // mark alert as read
    const db = this.usersService['firebaseService'].getFirestore();
    await db.collection('alerts').doc(body.alertId).update({ isRead: true });
    
    return { success: true, orgId: body.orgId };
  }
}
