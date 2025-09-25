import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'devsecret',
    });
  }

  async validate(payload: any) {
    // what becomes req.user - incluir toda la información del payload
    return { 
      id: payload.sub, 
      userId: payload.sub,
      email: payload.email, 
      role: payload.role,
      organizationId: payload.organizationId,
      permissions: payload.permissions,
      regions: payload.regions,
      teams: payload.teams
    };
  }
}
