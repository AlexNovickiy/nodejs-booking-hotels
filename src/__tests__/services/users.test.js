import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/models/user.js', () => ({
  UsersCollection: {
    findById: vi.fn(),
  },
}));

import { UsersCollection } from '../../db/models/user.js';
import { getUsersMeService } from '../../services/users.js';

describe('getUsersMeService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('повертає юзера якщо він існує', async () => {
    const mockUser = { _id: 'uid1', name: 'Alex', email: 'alex@test.com' };
    UsersCollection.findById.mockResolvedValue(mockUser);

    const result = await getUsersMeService('uid1');
    expect(result).toEqual(mockUser);
    expect(UsersCollection.findById).toHaveBeenCalledWith('uid1');
  });

  it('кидає 404 якщо юзер не знайдений', async () => {
    UsersCollection.findById.mockResolvedValue(null);

    await expect(getUsersMeService('nonexistent')).rejects.toMatchObject({
      status: 404,
      message: 'User not found',
    });
  });
});
