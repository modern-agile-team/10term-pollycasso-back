import * as bcrypt from 'bcrypt';

const SALT_OR_ROUNDS = 10;

export const PasswordEncoderUtil = {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_OR_ROUNDS);
  },

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  },
};
