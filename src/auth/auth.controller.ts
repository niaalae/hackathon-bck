import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';

@Controller()
export class AuthController {
    constructor(private readonly authService:AuthService){}

    @Post('register')
    async register(@Body() data:RegisterDto){
        return this.authService.register(data)
    }

    @Post('login')
    @HttpCode(200)
    async login(@Body() data:LoginDto, @Res({passthrough:true}) res:Response){
        return this.authService.login(data, res)
    }

    @Post('refresh')
    @HttpCode(200)
    async refresh(@Req() req: Request, @Res({passthrough:true}) res : Response){
        return this.authService.refresh(req,res)
    }

    @Post('logout')
    @HttpCode(200)
    async logout(@Res({passthrough:true}) res :Response){
        return this.authService.logout(res)
    }
}
