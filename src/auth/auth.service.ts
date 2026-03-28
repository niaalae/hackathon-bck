import { PrismaService } from '@/prisma/prisma.service'
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { Request, Response } from 'express'
import * as bcrypt from 'bcrypt'
import { getPrismaErrorCode } from '@/prisma/prisma-error.util'
import { normalizeJsonInput } from '@/prisma/prisma-json.util'
import { OAuth2Client } from 'google-auth-library'

@Injectable()
export class AuthService {
	constructor(
		private prismaService: PrismaService,
		private readonly jwtService: JwtService,
	) {}

	async register(data: RegisterDto) {
		try {
			await this.prismaService.user.create({
				data: {
					name: data.name,
					email: data.email,
					passwordHash: await bcrypt.hash(data.password, 12),
					preferences: normalizeJsonInput(data.preferences),
					role: data.role ?? 'TRAVELER',
				},
			})
		} catch (e) {
			if (getPrismaErrorCode(e) === 'P2002') throw new ConflictException('A user with the same email is already registered')
			throw e
		}
	}

	async login(loginDto: LoginDto, res: Response) {
		const user = await this.prismaService.user.findUnique({
			where: { email: loginDto.email },
		})

		if (!user) throw new NotFoundException({ email: 'email_not_found' })

		const valid = await bcrypt.compare(loginDto.password, user.passwordHash)
		if (!valid) throw new UnauthorizedException({ password: 'wrong_password' })

		const { passwordHash: passwd, ...userData } = user

		const refreshToken = this.jwtService.sign({ id: user.id }, { expiresIn: '30d', secret: process.env.JWT_REFRESH_SECRET })

		res.cookie('refreshtoken', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			path: '/api/refresh',
			maxAge: 30 * 24 * 60 * 60 * 1000,
		})

		return {
			user: userData,
			token: this.jwtService.sign({ id: user.id }, { expiresIn: '1h', secret: process.env.JWT_SECRET }),
		}
	}

	async refresh(req: Request, res: Response) {
		try {
			const refreshtoken = req.cookies?.refreshtoken

			if (!refreshtoken)
				throw new UnauthorizedException({
					message: 'No refresh token provided',
				})

			const payload = this.jwtService.verify(refreshtoken, {
				secret: process.env.JWT_REFRESH_SECRET,
			})

			const user = await this.prismaService.user.findUnique({
				where: { id: payload.id },
			})

			if (!user) throw new NotFoundException('user_not_found')

			const { passwordHash: passwd, ...userData } = user

			return {
				user: userData,
				token: this.jwtService.sign({ id: user.id }, { secret: process.env.JWT_SECRET, expiresIn: '1h' }),
			}
		} catch (err) {
			this.logout(res)
			throw new UnauthorizedException('invalid_refresh_token')
		}
	}

	async logout(res: Response) {
		res.clearCookie('refreshtoken', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			path: '/api/refresh',
		})
	}

	async verifyGoogleToken(token: string) {
		const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: process.env.GOOGLE_CLIENT_ID,
		})

		return ticket.getPayload()
	}
}
