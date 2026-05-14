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

export interface ISessionDeviceInfo {
  userAgent: string;
  os?: string;
  browser?: string;
}

export interface IAuthSessionSummary {
  sessionId: string;
  deviceInfo: ISessionDeviceInfo;
  ipAddress: string;
  location: {
    city: string;
    region: string;
    country: string;
    countryCode: string;
  } | null;
  expiresAt: number;
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
  isCurrent: boolean;
  isActive: boolean;
}

export interface IFaceLoginRequest {
  email: string;
  livenessSessionId: string;
}

export interface IEnableFaceLoginRequest {
  password: string;
  livenessSessionId: string;
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

export interface IVerifyLoginOtpRequest {
  email: string;
  otp: string;
}
