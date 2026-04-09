export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ILoginResponse extends IAuthTokens {
  userId: string;
}

export interface IFaceLoginRequest {
  image: string;
}

export interface IEnableFaceLoginRequest {
  image: string;
}

export interface IForgotPasswordRequest {
  email: string;
}

export interface IResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface IVerifyEmailRequest {
  email: string;
  otp: string;
}
