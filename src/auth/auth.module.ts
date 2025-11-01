import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    // 1. Import ConfigModule to access environment variables
    ConfigModule,
    // 2. Register Passport for authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // 3. Register and configure JwtModule asynchronously
    JwtModule.registerAsync({
      imports: [ConfigModule], // Make ConfigService available
      useFactory: (configService: ConfigService) => ({
        // 4. Retrieve the JWT secret from environment variables
        secret: configService.get<string>('JWT_SECRET'),
        // 5. Configure token options (e.g., expiration if needed)
        signOptions: { expiresIn: '60m' }, // Example: Token expires in 60 minutes
      }),
      inject: [ConfigService], // Inject ConfigService into the factory
    }),
  ],
  // 6. Make the JwtStrategy available for injection
  providers: [JwtStrategy],
  // 7. Export PassportModule and JwtModule so they can be used by other modules
  exports: [PassportModule, JwtModule, JwtStrategy],
})
export class AuthModule {}
