// Service for managing hidden files/folders password
const HIDDEN_PASSWORD_KEY = 'vaultnexus_hidden_password';
const HIDDEN_PASSWORD_TYPE_KEY = 'vaultnexus_hidden_password_type';

export type PasswordType = '4-digit' | '6-digit' | 'unlimited';

export const hiddenService = {
  // Set the hidden page password
  setPassword(password: string, type: PasswordType): void {
    localStorage.setItem(HIDDEN_PASSWORD_KEY, password);
    localStorage.setItem(HIDDEN_PASSWORD_TYPE_KEY, type);
  },

  // Get the password type
  getPasswordType(): PasswordType | null {
    const type = localStorage.getItem(HIDDEN_PASSWORD_TYPE_KEY);
    return type as PasswordType | null;
  },

  // Check if password is set
  isPasswordSet(): boolean {
    return localStorage.getItem(HIDDEN_PASSWORD_KEY) !== null;
  },

  // Verify password
  verifyPassword(password: string): boolean {
    const storedPassword = localStorage.getItem(HIDDEN_PASSWORD_KEY);
    return storedPassword === password;
  },

  // Clear password (for reset)
  clearPassword(): void {
    localStorage.removeItem(HIDDEN_PASSWORD_KEY);
    localStorage.removeItem(HIDDEN_PASSWORD_TYPE_KEY);
  },

  // Validate password format based on type
  validatePassword(password: string, type: PasswordType): boolean {
    if (type === '4-digit') {
      return /^\d{4}$/.test(password);
    } else if (type === '6-digit') {
      return /^\d{6}$/.test(password);
    } else {
      // unlimited - any non-empty string
      return password.length > 0;
    }
  },
};

