import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// 1. Define the expected structure of the Supabase JWT payload
interface JwtPayload {
  iss: string; // Issuer (supabase)
  ref: string; // Supabase project reference
  role: string; // Role (anon, authenticated, etc.)
  iat: number;
  exp: number;
  sub?: string; // Subject (optional for anon tokens)
  email?: string; // Email (optional for anon tokens)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    // 2. Get the secret key, ensuring it exists
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured in environment variables.');
    }

    super({
      // 3. Configure the strategy to extract the token from the
      // 'Authorization: Bearer <token>' header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 4. Secret key used to sign the token (must match Supabase's secret)
      secretOrKey: secret,
      // 5. Passport should verify the token's expiration date (exp claim)
      ignoreExpiration: false,
    });
  }

  // 6. This method runs after the token is validated (signature and expiration)
  validate(payload: JwtPayload) {
    // NestJS does not need to use 'await' here, it just needs to return
    // the minimal user object to be injected into the request.

    // We return the user's Supabase info based on available payload data
    return {
      sub: payload.sub || payload.ref, // Use sub if available, otherwise ref
      email: payload.email || null,
      role: payload.role,
      ref: payload.ref,
    };
  }
}
