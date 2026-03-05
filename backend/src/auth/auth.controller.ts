import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { JwtGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    signup(@Body() dto: SignupDto) {
        return this.authService.signUp(
            dto.email,
            dto.password,
            dto.name,
            dto.gymId,
            dto.phone,
        );
    }

    @Post('login')
    login(@Body() dto: { email: string; password: string; gymId?: string }) {
        return this.authService.signIn(dto.email, dto.password, dto.gymId);
    }

    @Get('me')
    @UseGuards(JwtGuard)
    me(@Req() req: { token: string }) {
        return this.authService.getCurrentUser(req.token);
    }

    @Post('reset-password')
    resetPassword(@Body() dto: { email: string }) {
        return this.authService.resetPassword(dto.email);
    }
}