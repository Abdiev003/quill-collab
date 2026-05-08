import { Type, plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const TTL_PATTERN = /^(\d+)\s*(s|m|h|d|w)$/i;
const TTL_MULTIPLIERS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
  w: 60 * 60 * 24 * 7,
};

function parseTtlToSeconds(raw: string, key: string): number {
  const trimmed = raw.trim();
  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber > 0) return asNumber;
  const match = TTL_PATTERN.exec(trimmed);
  if (!match) {
    throw new Error(
      `${key} must be a positive integer (seconds) or "<n><s|m|h|d|w>" (got "${raw}")`,
    );
  }
  return Number(match[1]) * TTL_MULTIPLIERS[match[2].toLowerCase()];
}

export class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  API_PORT = 4000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TTL: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TTL: string = '7d';

  @IsInt()
  @Min(1)
  JWT_ACCESS_TTL_SECONDS!: number;

  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL_SECONDS!: number;

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = 'http://localhost:3000';
}

export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const accessTtl = (raw.JWT_ACCESS_TTL as string | undefined) ?? '15m';
  const refreshTtl = (raw.JWT_REFRESH_TTL as string | undefined) ?? '7d';
  const enriched = {
    ...raw,
    JWT_ACCESS_TTL: accessTtl,
    JWT_REFRESH_TTL: refreshTtl,
    JWT_ACCESS_TTL_SECONDS: parseTtlToSeconds(accessTtl, 'JWT_ACCESS_TTL'),
    JWT_REFRESH_TTL_SECONDS: parseTtlToSeconds(refreshTtl, 'JWT_REFRESH_TTL'),
  };

  const validated = plainToInstance(EnvVars, enriched, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map(
          (e) =>
            `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
        )
        .join('\n')}`,
    );
  }

  return validated;
}
