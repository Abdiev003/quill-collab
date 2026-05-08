import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import type { PublicUser } from '@quill-collab/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() jwt: JwtPayload): Promise<PublicUser> {
    const user = await this.users.findById(jwt.sub);
    if (!user) throw new NotFoundException('User not found');
    return UsersService.toPublic(user);
  }
}
