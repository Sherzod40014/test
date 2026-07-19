import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

/**
 * ConfigModule is registered with `isGlobal: true` in AppModule (apps/api/src/app.module.ts), so
 * ConfigService is injectable here (JwtModule.registerAsync's factory) without IamModule importing
 * ConfigModule itself. Likewise PrismaModule is @Global(), so AuthService can inject PrismaService
 * without this module importing PrismaModule.
 *
 * Exports AuthService (in case another module ever needs to trigger auth flows directly) and
 * RolesGuard (so other modules' controllers can `@UseGuards(JwtAuthGuard, RolesGuard)` -- see
 * apps/api/src/master-data/*.controller.ts for the consuming side). JwtAuthGuard itself needs no
 * export: it has no constructor dependencies, and the 'jwt' Passport strategy it delegates to is
 * registered globally by Passport once JwtStrategy is instantiated as a provider here -- any
 * module can reference JwtAuthGuard directly as long as IamModule is wired into the running app
 * (AppModule) alongside it.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TTL'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class IamModule {}
