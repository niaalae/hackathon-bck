import './env'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { NestExpressApplication } from '@nestjs/platform-express'
import { existsSync } from 'fs'
import { join } from 'path'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'

type ExpressLike = {
  get: (path: RegExp, handler: (req: unknown, res: { sendFile: (path: string) => void }) => void) => void
}

const resolveFrontendDist = () => {
  const candidates = [
    join(process.cwd(), 'frontend', 'dist'),
    join(process.cwd(), '..', 'frontend', 'dist'),
    join(__dirname, '..', '..', 'frontend', 'dist'),
    join(__dirname, '..', 'frontend', 'dist')
  ]

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) {
      return candidate
    }
  }

  return null
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : null

  if (process.env.NODE_ENV !== 'production') {
    const len = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0
    // eslint-disable-next-line no-console
    console.log(`GROQ_API_KEY length: ${len}`)
  }

  app.use(cookieParser())

  app.enableCors({
    origin: allowedOrigins && allowedOrigins.length ? allowedOrigins : true,
    credentials: true
  })
  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true
    })
  )
  app.useGlobalFilters(new ApiExceptionFilter())

  const frontendDist = resolveFrontendDist()
  if (frontendDist) {
    app.useStaticAssets(frontendDist)

    const instance = app.getHttpAdapter().getInstance() as ExpressLike
    instance.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(join(frontendDist, 'index.html'))
    })
  }

  const port = Number(process.env.PORT ?? 4001)
  await app.listen(port, '127.0.0.1')
}

bootstrap()
