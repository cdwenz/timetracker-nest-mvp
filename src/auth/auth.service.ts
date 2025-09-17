import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ConfigService } from "@nestjs/config";
import { randomBytes, createHash } from "crypto";

import { Role } from "./roles.enum";
import { permissionsForRole } from "./permissions";
import { EmailService } from "./email.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService
  ) {}

  private buildJwtPayload(user: any) {
    const role: Role = (user.role as Role) ?? Role.FIELD_TECH;
    const permissions = permissionsForRole(role);

    // Opcional: adjuntar alcance si ya lo tenés (orgId, regiones, teams)
    return {
      sub: user.id,
      email: user.email,
      role,
      permissions,
      organizationId: user.organizationId ?? null,
      regions: user.regions?.map((r: any) => r.id) ?? [],
      teams: user.teams?.map((t: any) => t.id) ?? [],
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new BadRequestException("Email already registered");

    const allowedDomain = "@wycliffeassociates.org";
    if (!dto.email.toLowerCase().endsWith(allowedDomain)) {
      throw new BadRequestException(
        `Solo se permiten correos ${allowedDomain}`
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    
    // 🆕 Obtener o crear organización por defecto
    let organization = await this.prisma.organization.findFirst({
      where: { name: "Default Organization" }
    });
    
    if (!organization) {
      console.log('🏢 Creando organización por defecto...');
      organization = await this.prisma.organization.create({
        data: { name: "Default Organization" }
      });
      console.log('✅ Organización creada:', organization.id);
    }
    
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        country: dto.country,
        email: dto.email,
        passwordHash,
        role: (dto.role as any) ?? "FIELD_TECH",
        organizationId: organization.id, // 🆕 Asignar organización automáticamente
      },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        role: true,
        organizationId: true, // 🆕 Incluir en la respuesta
        createdAt: true,
      },
    });
    
    console.log('✅ Usuario registrado con organización:', {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId
    });
    
    return { message: 'Usuario registrado', user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const payload = this.buildJwtPayload(user);

    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>("JWT_EXPIRES") ?? "24h",
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        expiresIn: this.config.get<string>("REFRESH_EXPIRES") ?? "7d",
      }
    );

    return {
      message: "Login correcto",
      access_token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        country: user.country,
        role: payload.role,
        permissions: payload.permissions,
      },
    };
  };
  // ===== Forgot/Reset password =====

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Siempre responder 200 para evitar enumeración de usuarios
    if (!user) return { ok: true };

    // Limpiar tokens previos sin usar
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl =
      this.config.get<string>("APP_URL") || "http://localhost:3000";
    const link = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    await this.email.sendPasswordReset(email, link);

    // En DEV, devolvemos el link para facilitar prueba desde Flutter
    if (
      (this.config.get<string>("NODE_ENV") || "development") !== "production"
    ) {
      return { ok: true, reset_link: link };
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const rec = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      throw new BadRequestException("Token inválido o expirado");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: rec.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  // ===== Get USER =====

  async getUser(userId: string) {
    console.log("USER ID: ", userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
      createdAt: user.createdAt,
    };
  }
}
