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
    
    // For testing purposes: Auto-assign new regular users to the first available organization
    // so they immediately appear in the Admin's team assignment dropdown.
    if (!orgId && (!body.role || body.role === 'user')) {
      const db = this.usersService['firebaseService'].getFirestore();
      const orgs = await db.collection('organizations').limit(1).get();
      if (!orgs.empty) {
        orgId = orgs.docs[0].id;
      }
    }

    const newUser = await this.usersService.createUser({
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: body.name || firebaseUser.email.split('@')[0],
      role: body.role || 'user',
      orgId: orgId,
      teamIds: [],
    });

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
}
