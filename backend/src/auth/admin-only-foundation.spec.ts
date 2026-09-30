/**
 * admin_only foundation: POST /api/auth/invite is ADMIN-gated and
 * GET /api/users/me is resolved from the session.
 */
import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ROLES_KEY, RolesGuard } from './roles.guard';
import { UsersController } from '../users/users.controller';

function ctxFor(role: string) {
  return {
    getHandler: () => AuthController.prototype.invite,
    getClass: () => AuthController,
    switchToHttp: () => ({ getRequest: () => ({ session: { userId: 'u', role } }) }),
  } as never;
}

describe('admin_only foundation', () => {
  it('invite is guarded by JwtAuthGuard + RolesGuard with ADMIN only', () => {
    const guards = Reflect.getMetadata('__guards__', AuthController.prototype.invite) ?? [];
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(Reflect.getMetadata(ROLES_KEY, AuthController.prototype.invite)).toEqual(['ADMIN']);
  });

  it('RolesGuard rejects a USER from invite with 403 and admits an ADMIN', () => {
    const guard = new RolesGuard(new Reflector());
    expect(() => guard.canActivate(ctxFor('USER'))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctxFor('ADMIN'))).toBe(true);
  });

  it('users/me returns id, email, name and role without the password hash', async () => {
    const user = { id: 'u1', email: 'a@b.c', name: 'A', role: 'USER', passwordHash: 'x' };
    const c = new UsersController({ findById: async (id: string) => (id === 'u1' ? user : null) } as never);
    const me = await c.getMe({ session: { userId: 'u1', role: 'USER' } } as never);
    expect(me).toEqual({ id: 'u1', email: 'a@b.c', name: 'A', role: 'USER' });
  });

  it('users/me is 401 when the session user no longer exists', async () => {
    const c = new UsersController({ findById: async () => null } as never);
    await expect(c.getMe({ session: { userId: 'gone', role: 'USER' } } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
