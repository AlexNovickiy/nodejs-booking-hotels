import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/models/user.js', () => ({
  UsersCollection: { findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn() },
}));

vi.mock('../../db/models/session.js', () => ({
  SessionsCollection: { findOne: vi.fn(), create: vi.fn(), deleteOne: vi.fn() },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock_token'),
    verify: vi.fn(),
  },
}));

vi.mock('../../utils/getEnvVar.js', () => ({
  getEnvVar: vi.fn().mockReturnValue('test_secret'),
}));

vi.mock('../../utils/sendMail.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  default: { readFile: vi.fn().mockResolvedValue('<html>{{name}} {{link}}</html>') },
}));

vi.mock('handlebars', () => ({
  default: { compile: vi.fn().mockReturnValue(() => '<html>Alex link</html>') },
}));

vi.mock('../../utils/googleOAuth2.js', () => ({
  validateCode: vi.fn(),
  getFullNameFromGoogleTokenPayload: vi.fn().mockReturnValue('Google User'),
}));

import { UsersCollection } from '../../db/models/user.js';
import { SessionsCollection } from '../../db/models/session.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshUsersSession,
  requestResetToken,
  resetPassword,
} from '../../services/auth.js';

const mockUser = {
  _id: 'uid1',
  name: 'Alex',
  email: 'alex@test.com',
  password: 'hashed_password',
};

const mockSession = {
  _id: 'sid1',
  userId: 'uid1',
  accessToken: 'acc_token',
  refreshToken: 'ref_token',
  refreshTokenValidUntil: new Date(Date.now() + 9999999),
};

describe('registerUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('реєструє нового юзера', async () => {
    UsersCollection.findOne.mockResolvedValue(null);
    UsersCollection.create.mockResolvedValue(mockUser);

    const result = await registerUser({ email: 'alex@test.com', password: '12345' });

    expect(bcrypt.hash).toHaveBeenCalledWith('12345', 10);
    expect(UsersCollection.create).toHaveBeenCalled();
    expect(result).toEqual(mockUser);
  });

  it('кидає 409 якщо email вже зайнятий', async () => {
    UsersCollection.findOne.mockResolvedValue(mockUser);

    await expect(registerUser({ email: 'alex@test.com', password: '12345' })).rejects.toMatchObject({
      status: 409,
      message: 'Email in use',
    });
  });
});

describe('loginUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('повертає сесію при успішному логіні', async () => {
    UsersCollection.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    SessionsCollection.deleteOne.mockResolvedValue({});
    SessionsCollection.create.mockResolvedValue(mockSession);

    const result = await loginUser({ email: 'alex@test.com', password: '12345' });
    expect(result).toEqual(mockSession);
  });

  it('кидає 401 якщо юзер не знайдений', async () => {
    UsersCollection.findOne.mockResolvedValue(null);

    await expect(loginUser({ email: 'x@x.com', password: '12345' })).rejects.toMatchObject({
      status: 401,
    });
  });

  it('кидає 401 якщо пароль невірний', async () => {
    UsersCollection.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(loginUser({ email: 'alex@test.com', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('logoutUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('видаляє сесію', async () => {
    SessionsCollection.deleteOne.mockResolvedValue({});
    await logoutUser('sid1');
    expect(SessionsCollection.deleteOne).toHaveBeenCalledWith({ _id: 'sid1' });
  });
});

describe('refreshUsersSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('оновлює сесію при валідному refresh token', async () => {
    SessionsCollection.findOne.mockResolvedValue(mockSession);
    SessionsCollection.deleteOne.mockResolvedValue({});
    SessionsCollection.create.mockResolvedValue({ ...mockSession, _id: 'sid2' });

    const result = await refreshUsersSession({
      sessionId: 'sid1',
      refreshToken: 'ref_token',
    });

    expect(SessionsCollection.create).toHaveBeenCalled();
    expect(result._id).toBe('sid2');
  });

  it('кидає 401 якщо сесія не знайдена', async () => {
    SessionsCollection.findOne.mockResolvedValue(null);

    await expect(
      refreshUsersSession({ sessionId: 'sid_bad', refreshToken: 'bad' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('кидає 401 якщо refresh token прострочений', async () => {
    SessionsCollection.findOne.mockResolvedValue({
      ...mockSession,
      refreshTokenValidUntil: new Date(Date.now() - 1000),
    });

    await expect(
      refreshUsersSession({ sessionId: 'sid1', refreshToken: 'ref_token' }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe('requestResetToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('відправляє email з токеном скидання пароля', async () => {
    UsersCollection.findOne.mockResolvedValue(mockUser);
    const { sendEmail } = await import('../../utils/sendMail.js');

    await requestResetToken('alex@test.com');

    expect(jwt.sign).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
  });

  it('кидає 404 якщо юзер не знайдений', async () => {
    UsersCollection.findOne.mockResolvedValue(null);

    await expect(requestResetToken('notfound@test.com')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('resetPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('змінює пароль при валідному токені', async () => {
    jwt.verify.mockReturnValue({ email: 'alex@test.com', sub: 'uid1' });
    UsersCollection.findOne.mockResolvedValue(mockUser);
    UsersCollection.updateOne.mockResolvedValue({});
    SessionsCollection.deleteOne.mockResolvedValue({});

    await resetPassword({ token: 'valid_token', password: 'newpass' });

    expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
    expect(UsersCollection.updateOne).toHaveBeenCalled();
    expect(SessionsCollection.deleteOne).toHaveBeenCalled();
  });

  it('кидає 401 при невалідному токені', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });

    await expect(resetPassword({ token: 'bad', password: 'newpass' })).rejects.toMatchObject({
      status: 401,
    });
  });

  it('кидає 404 якщо юзер не знайдений після декодування токена', async () => {
    jwt.verify.mockReturnValue({ email: 'gone@test.com', sub: 'uid_gone' });
    UsersCollection.findOne.mockResolvedValue(null);

    await expect(resetPassword({ token: 'token', password: 'newpass' })).rejects.toMatchObject({
      status: 404,
    });
  });
});
