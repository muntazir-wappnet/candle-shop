import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // ── Core ───────────────────────────────────────────────────────────
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
        GOOGLE_CLIENT_ID: Joi.string().optional(),
        REDIS_URL: Joi.string().required(),

        // ── OTP Channel Toggles ────────────────────────────────────────────
        OTP_EMAIL_ENABLED: Joi.string()
          .valid('true', 'false')
          .default('false'),
        OTP_SMS_ENABLED: Joi.string()
          .valid('true', 'false')
          .default('false'),

        // ── Email (SMTP) ───────────────────────────────────────────────────
        SMTP_HOST: Joi.string().when('OTP_EMAIL_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_PORT: Joi.number().when('OTP_EMAIL_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_SECURE: Joi.string()
          .valid('true', 'false')
          .default('false'),
        SMTP_USER: Joi.string().when('OTP_EMAIL_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_PASS: Joi.string().when('OTP_EMAIL_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_FROM: Joi.string().default('Candle Shop <noreply@candle-shop.com>'),

        // ── SMS (Twilio) ───────────────────────────────────────────────────
        TWILIO_ACCOUNT_SID: Joi.string().when('OTP_SMS_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        TWILIO_AUTH_TOKEN: Joi.string().when('OTP_SMS_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        TWILIO_FROM_NUMBER: Joi.string().when('OTP_SMS_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        TWILIO_DEFAULT_COUNTRY_CODE: Joi.string().default('+91'),
      }),
    }),
    PrismaModule,
    AuthModule,
    RedisModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
