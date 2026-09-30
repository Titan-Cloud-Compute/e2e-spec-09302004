import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** The signed-in user's profile, resolved from the session. Never returns
   *  the password hash; a session whose user no longer exists is a 401. */
  @Get('me')
  async getMe(@Req() req: Pick<Request, 'session'>) {
    const userId = req.session?.userId;
    if (!userId) throw new UnauthorizedException('not authenticated');
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('user no longer exists');
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}

export class UserNotificationPreferencesController {}
