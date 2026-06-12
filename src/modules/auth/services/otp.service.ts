import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { OTP_EXPIRY_SECONDS, OTP_MAX_ATTEMPTS, OTP_RESEND_LIMIT, OTP_RESEND_WINDOW } from '../constants/otp.constants';

@Injectable()
export class OtpService {
    constructor(
        private readonly redisService: RedisService,
    ) { }

    generateOtp(): string {
        return crypto
            .randomInt(100000, 999999)
            .toString();
    }

    async storeOtp(
        userId: string,
        otp: string,
    ): Promise<void> {
        const hash = await bcrypt.hash(
            otp,
            10,
        );

        await this.redisService.set(
            `otp:verify:${userId}`,
            hash,
            OTP_EXPIRY_SECONDS,
        );
    }

    async verifyOtp(
        userId: string,
        otp: string,
    ): Promise<boolean> {
        const storedHash =
            await this.redisService.get(
                `otp:verify:${userId}`,
            );

        if (!storedHash) {
            return false;
        }

        return bcrypt.compare(
            otp,
            storedHash,
        );
    }

    async deleteOtp(
        userId: string,
    ): Promise<void> {
        await this.redisService.del(
            `otp:verify:${userId}`,
        );
    }

    async getAttempts(
        userId: string,
    ): Promise<number> {
        const attempts =
            await this.redisService.get(
                `otp:attempts:${userId}`,
            );

        return Number(attempts ?? 0);
    }

    async incrementAttempts(
        userId: string,
    ): Promise<number> {
        const key =
            `otp:attempts:${userId}`;

        const attempts =
            await this.redisService.increment(
                key,
            );

        await this.redisService.expire(
            key,
            OTP_EXPIRY_SECONDS,
        );

        return attempts;
    }

    async hasExceededAttempts(
        userId: string,
    ): Promise<boolean> {
        const attempts =
            await this.getAttempts(userId);

        return attempts >= OTP_MAX_ATTEMPTS;
    }
    async clearAttempts(
        userId: string,
    ): Promise<void> {
        await this.redisService.del(
            `otp:attempts:${userId}`,
        );
    }

    async trackResendRequest(
        userId: string,
    ): Promise<number> {
        const key =
            `otp:resend:${userId}`;

        const count =
            await this.redisService.increment(
                key,
            );

        if (count === 1) {
            await this.redisService.expire(
                key,
                OTP_RESEND_WINDOW,
            );
        }

        return count;
    }

    async canResendOtp(
        userId: string,
    ): Promise<boolean> {
        const count = Number(
            await this.redisService.get(
                `otp:resend:${userId}`,
            ),
        );

        return count < OTP_RESEND_LIMIT;
    }

}
