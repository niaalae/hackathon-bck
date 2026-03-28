import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import { RegisterDto } from './dto/register.dto'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import type { Request, Response } from 'express'

@Controller()
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	async register(@Body() data: RegisterDto) {
		return this.authService.register(data)
	}

	@Post('login')
	@HttpCode(200)
	async login(@Body() data: LoginDto, @Res({ passthrough: true }) res: Response) {
		return this.authService.login(data, res)
	}

	@Post('auth/google')
	@HttpCode(200)
	async GoogleLogin(@Req() req: Request) {
		const { token } = req.body

		try {
			const payload = await this.authService.verifyGoogleToken(token)
			return payload
			// const { email, name, sub: googleId } = payload

			// // 1. Find or create user
			// let user = await User.findOne({ email })

			// await this.register({ name, email, password: googleId })

			// // 2. Issue YOUR JWT (same as normal login)
			// // const jwtToken = generateJWT(user)

			// return { token: jwtToken }
		} catch (err) {
			return { error: 'Invalid Google token' }
		}
	}

	@Post('refresh')
	@HttpCode(200)
	async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		return this.authService.refresh(req, res)
	}

	@Post('logout')
	@HttpCode(200)
	async logout(@Res({ passthrough: true }) res: Response) {
		return this.authService.logout(res)
	}
}
