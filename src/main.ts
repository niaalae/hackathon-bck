import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { NestExpressApplication } from '@nestjs/platform-express'
// import { ApiExceptionFilter } from './common/filters/api-exception.filter'

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
  // app.useGlobalFilters(new ApiExceptionFilter())

  await app.listen(process.env.PORT ?? 4001)
}

bootstrap()
