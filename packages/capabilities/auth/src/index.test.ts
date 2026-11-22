import { describe, it, expect, vi } from 'vitest';
import type { DbOrTx } from '@kaesava/db/rings/capabilities';
import {
  checkEmailAuthProviderHandler,
  getAuthMethodsHandler,
  setAccountPasswordHandler,
} from './index';

describe('Capability Auth Handlers', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  it('checkEmailAuthProviderHandler identifies Google-only vs linked/credential accounts', async () => {
    const googleOnlyDb = { execute: vi.fn().mockResolvedValue([{ providerId: 'google' }]) };
    expect(await checkEmailAuthProviderHandler(googleOnlyDb as unknown as DbOrTx)('g@example.com')).toEqual({
      isGoogleOnly: true,
    });

    const linkedDb = {
      execute: vi.fn().mockResolvedValue([{ providerId: 'google' }, { providerId: 'credential' }]),
    };
    expect(await checkEmailAuthProviderHandler(linkedDb as unknown as DbOrTx)('both@example.com')).toEqual({
      isGoogleOnly: false,
    });

    const unknownDb = { execute: vi.fn().mockResolvedValue([]) };
    expect(await checkEmailAuthProviderHandler(unknownDb as unknown as DbOrTx)('none@example.com')).toEqual({
      isGoogleOnly: false,
    });
  });

  it('getAuthMethodsHandler returns hasPassword and hasGoogle flags accurately', async () => {
    const googleOnlyDb = {
      execute: vi.fn().mockResolvedValue([{ providerId: 'google', accountId: 'google-123', password: null }]),
    };
    expect(await getAuthMethodsHandler(googleOnlyDb as unknown as DbOrTx)(userId)).toEqual({
      hasPassword: false,
      hasGoogle: true,
      googleAccountId: 'google-123',
    });

    const bothDb = {
      execute: vi.fn().mockResolvedValue([
        { providerId: 'google', accountId: 'google-123', password: null },
        { providerId: 'credential', accountId: userId, password: 'salt:hashedvalue' },
      ]),
    };
    expect(await getAuthMethodsHandler(bothDb as unknown as DbOrTx)(userId)).toEqual({
      hasPassword: true,
      hasGoogle: true,
      googleAccountId: 'google-123',
    });
  });

  it('setAccountPasswordHandler inserts new credential row, updates null password row, and rejects duplicate', async () => {
    const hashFn = vi.fn().mockResolvedValue('salt:hash123');

    const insertDb = {
      execute: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
    };
    expect(await setAccountPasswordHandler(insertDb as unknown as DbOrTx, hashFn)(userId, 'NewPass123!')).toEqual({
      success: true,
    });
    expect(hashFn).toHaveBeenCalledWith('NewPass123!');
    expect(insertDb.execute).toHaveBeenCalledTimes(2);

    const updateDb = {
      execute: vi.fn().mockResolvedValueOnce([{ id: 'acc-1', password: null }]).mockResolvedValueOnce([]),
    };
    expect(await setAccountPasswordHandler(updateDb as unknown as DbOrTx, hashFn)(userId, 'NewPass123!')).toEqual({
      success: true,
    });
    expect(updateDb.execute).toHaveBeenCalledTimes(2);

    const existingDb = {
      execute: vi.fn().mockResolvedValueOnce([{ id: 'acc-1', password: 'already:hashed' }]),
    };
    await expect(
      setAccountPasswordHandler(existingDb as unknown as DbOrTx, hashFn)(userId, 'NewPass123!')
    ).rejects.toThrow('PASSWORD_ALREADY_SET');
  });
});
