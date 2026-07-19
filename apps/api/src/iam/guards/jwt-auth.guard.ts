import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Thin wrapper so call sites can write @UseGuards(JwtAuthGuard) instead of AuthGuard('jwt'). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
