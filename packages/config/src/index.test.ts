import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from './env';
import { isFeatureEnabled } from './feature-flags';
import { resolveAiConfig, AI_TIER_LIMITS, DEFAULT_AI_MODEL_ID } from './ai.config';

describe('Config Package Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('validates environment variables when DATABASE_URL is set', () => {
      const config = validateEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
        NODE_ENV: 'development',
      });
      expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/testdb');
      expect(config.PORT).toBe(3001);
      expect(config.NODE_ENV).toBe('development');
    });

    it('fails in production if DATABASE_URL is missing', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          NEON_AUTH_BASE_URL: 'https://auth.example.com',
          INNGEST_SIGNING_KEY: 'prod-signing-key',
          INNGEST_EVENT_KEY: 'prod-event-key',
        });
      }).toThrow('System Environment Failure');
    });

    it('fails in production if NEON_AUTH_JWKS_URL and NEON_AUTH_BASE_URL are missing', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
          INNGEST_SIGNING_KEY: 'prod-signing-key',
          INNGEST_EVENT_KEY: 'prod-event-key',
        });
      }).toThrow('System Environment Failure');
    });

    it('fails in production if default mock Inngest keys are used', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
          NEON_AUTH_BASE_URL: 'https://auth.example.com',
          INNGEST_SIGNING_KEY: 'mock-inngest-key',
        });
      }).toThrow('System Environment Failure');
    });

    it('succeeds in production when all critical secrets are provided', () => {
      const config = validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/proddb',
        NEON_AUTH_JWKS_URL: 'https://auth.example.com/jwks.json',
        INNGEST_SIGNING_KEY: 'sign-key-live-12345',
        INNGEST_EVENT_KEY: 'event-key-live-12345',
      });
      expect(config.NODE_ENV).toBe('production');
      expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/proddb');
    });

    it('validates RESEND_FROM_EMAIL for both standard and RFC 5322 display name formats', () => {
      const plain = validateEnv({
        RESEND_FROM_EMAIL: 'info@moneymatters.kaesava.au',
      });
      expect(plain.RESEND_FROM_EMAIL).toBe('info@moneymatters.kaesava.au');

      const rfc5322 = validateEnv(
        {
          RESEND_FROM_EMAIL: 'Money Matters <info@moneymatters.kaesava.au>',
        },
        true
      );
      expect(rfc5322.RESEND_FROM_EMAIL).toBe('Money Matters <info@moneymatters.kaesava.au>');

      expect(() => {
        validateEnv(
          {
            RESEND_FROM_EMAIL: 'invalid-email-address',
          },
          true
        );
      }).toThrow('System Environment Failure');
    });
  });



  describe('isFeatureEnabled', () => {
    const validAppId = '01908bde-34bb-7b19-a178-574211bc93aa';
    const invalidAppId = '00000000-0000-0000-0000-000000000000';

    it('returns false if app ID is not registered', () => {
      expect(isFeatureEnabled('premiumEnabled', invalidAppId)).toBe(false);
      expect(isFeatureEnabled('partnerInvite', invalidAppId)).toBe(false);
    });

    it('evaluates premiumEnabled flag without and with premium override', () => {
      expect(isFeatureEnabled('premiumEnabled', validAppId, false)).toBe(false);
      expect(isFeatureEnabled('premiumEnabled', validAppId, true)).toBe(true);
    });

    it('evaluates standard feature flags from app configuration', () => {
      expect(isFeatureEnabled('partnerInvite', validAppId)).toBe(false);
      expect(isFeatureEnabled('offlineSync', validAppId)).toBe(false);
      expect(isFeatureEnabled('aiAssistant', validAppId)).toBe(true);
    });
  });

  describe('ai.config', () => {
    it('resolves default AI config values correctly', () => {
      const cfg = resolveAiConfig({});
      expect(cfg.CF_ACCOUNT_ID).toBeUndefined();
      expect(cfg.AI_MODEL_ID).toBe(DEFAULT_AI_MODEL_ID);
      expect(AI_TIER_LIMITS.free.monthlyLlmCalls).toBe(150);
      expect(AI_TIER_LIMITS.free.burstPerMinute).toBe(10);
    });
  });
});
