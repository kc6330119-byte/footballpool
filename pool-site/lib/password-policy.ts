export const passwordHelp = 'Use at least 5 characters, with no spaces.';
export const validNewPassword = (password: string) => password.length >= 5 && password.length <= 128 && !/\s/u.test(password);
