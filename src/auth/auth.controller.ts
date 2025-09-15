import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "src/common/decorators/public.decorator";


@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  @Public()
  @HttpCode(201)
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto);
    return user;
  }

  @Post("login")
  @Public()
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("forgot-password")
  @HttpCode(200)
  async forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post("reset-password")
  @HttpCode(200)
  async reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Get("me")
  getMe(@CurrentUser() user: any) {
    return this.auth.getUser(user.userId);
  }
}
 