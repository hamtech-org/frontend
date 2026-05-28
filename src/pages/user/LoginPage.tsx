import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useLoginMutation,
  useVerifyLoginOtpMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useFaceLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from '@/store/api/authApi';
import { apiClient } from '@/services/api';
import AwsFaceLivenessComponent from '@/components/AwsFaceLivenessComponent';
import logo from '@/assets/images/logo_tron.png';
import {
  LoginForm,
  type LoginFormValues,
  RegisterForm,
  type RegisterFormValues,
  OtpVerificationForm,
  type OtpFormValues,
  ForgotPasswordForm,
  type ForgotPasswordFormValues,
  ResetPasswordForm,
  type ResetPasswordFormValues,
} from '../../components';
import { X, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPasswordPending, setIsResetPasswordPending] = useState(false);
  const [isLoginOtpPending, setIsLoginOtpPending] = useState(false);
  const [registrationOtpPending, setRegistrationOtpPending] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Face login states
  const [showFaceLoginEmailDialog, setShowFaceLoginEmailDialog] = useState(false);
  const [faceLoginEmail, setFaceLoginEmail] = useState('');
  const [livenessSessionId, setLivenessSessionId] = useState('');
  const [showAwsFaceLiveness, setShowAwsFaceLiveness] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postLoginPath = searchParams.get('redirect')?.trim() || '/';

  // Mutations
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const [verifyLoginOtp, { isLoading: isVerifyingLoginOtp, error: verifyLoginOtpError }] =
    useVerifyLoginOtpMutation();
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();
  const [verifyEmail, { isLoading: isVerifying, error: verifyError }] = useVerifyEmailMutation();
  const [faceLogin, { isLoading: isFaceLoginLoading }] = useFaceLoginMutation();
  const [forgotPassword, { isLoading: isForgotLoading, error: forgotError }] =
    useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResetLoading, error: resetError }] =
    useResetPasswordMutation();

  // Login handlers
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data).unwrap();
      setLoginEmail(data.email);
      setIsLoginOtpPending(true);
    } catch (err) {
      console.error('Failed to login:', getApiErrorMessage(err, 'Đăng nhập thất bại'));
    }
  };

  const onLoginOtpSubmit = async (data: OtpFormValues) => {
    try {
      await verifyLoginOtp({
        email: loginEmail,
        otp: data.otp,
      }).unwrap();
      navigate(postLoginPath.startsWith('/') ? postLoginPath : '/');
    } catch (err) {
      console.error('Failed to verify login OTP:', err);
    }
  };

  // Register handlers
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      console.log('📝 [DEBUG] onRegisterSubmit called with email:', data.email);
      const { confirmPassword, ...registerData } = data;
      console.log('📝 [DEBUG] Sending register request...');
      const result = await register(registerData).unwrap();
      console.log('✅ [DEBUG] Register successful:', result);
      setRegistrationEmail(data.email);
      console.log('📝 [DEBUG] Setting registrationOtpPending to true');
      setRegistrationOtpPending(true);
    } catch (err) {
      console.error('❌ [DEBUG] Failed to register:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error details:', { message: errorMessage });
    }
  };

  const onRegisterOtpSubmit = async (data: OtpFormValues) => {
    try {
      await verifyEmail({
        email: registrationEmail,
        otp: data.otp,
      }).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Failed to verify email:', err);
    }
  };

  // Forgot Password handlers
  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await forgotPassword(data).unwrap();
      setForgotPasswordEmail(data.email);
      setIsResetPasswordPending(true);
      setIsForgotPassword(false);
    } catch (err) {
      console.error('Failed to send forgot password OTP:', err);
    }
  };

  const onResetPasswordSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await resetPassword({
        email: forgotPasswordEmail,
        token: data.otp,
        newPassword: data.newPassword,
      }).unwrap();

      // Success - go back to login
      setIsResetPasswordPending(false);
      setIsForgotPassword(false);
      setIsRegister(false);
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  // Face login handlers
  const startFaceLogin = async () => {
    try {
      if (!faceLoginEmail.trim()) {
        return;
      }

      // Create liveness session
      const livenessResponse = await apiClient.post('/auth/face-liveness/start', {});
      const sessionId = livenessResponse.data?.data?.sessionId;

      if (!sessionId) {
        return;
      }

      setLivenessSessionId(sessionId);
      setShowFaceLoginEmailDialog(false);
      setShowAwsFaceLiveness(true);
    } catch (err) {
      console.error('Face liveness error:', err);
    }
  };

  const handleFaceLivenessSuccess = async () => {
    try {
      await faceLogin({
        email: faceLoginEmail,
        livenessSessionId,
      }).unwrap();

      setShowAwsFaceLiveness(false);
      setLivenessSessionId('');
      setFaceLoginEmail('');
      navigate('/');
    } catch (error: any) {
      setShowAwsFaceLiveness(false);
      setLivenessSessionId('');

      const errorMsg =
        error?.data?.message || 'Đăng nhập bằng khuôn mặt thất bại. Vui lòng thử lại.';
      console.error('Face login error:', errorMsg);
    }
  };

  const cancelFaceLiveness = () => {
    setShowAwsFaceLiveness(false);
    setLivenessSessionId('');
    setShowFaceLoginEmailDialog(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <img src={logo} alt="Zalogram" className="w-16 h-16 mx-auto mb-4" />
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  isRegister
                    ? 'reg-title'
                    : isForgotPassword
                      ? 'forgot-title'
                      : isResetPasswordPending
                        ? 'reset-title'
                        : 'login-title'
                }
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isRegister
                    ? 'Tạo tài khoản'
                    : isForgotPassword
                      ? 'Quên mật khẩu'
                      : isResetPasswordPending
                        ? 'Đặt lại mật khẩu'
                        : 'Đăng nhập'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {isRegister
                    ? 'Bắt đầu hành trình của bạn với chúng tôi.'
                    : isForgotPassword || isResetPasswordPending
                      ? 'Khôi phục quyền truy cập vào tài khoản.'
                      : 'Chào mừng trở lại!'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {registrationOtpPending ? (
              <motion.div
                key="register-otp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <OtpVerificationForm
                  email={registrationEmail}
                  onSubmit={onRegisterOtpSubmit}
                  isLoading={isVerifying}
                  error={verifyError}
                  onBack={() => {
                    setRegistrationOtpPending(false);
                    setRegistrationEmail('');
                  }}
                />
              </motion.div>
            ) : isRegister ? (
              <motion.div
                key="register"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RegisterForm
                  onSubmit={onRegisterSubmit}
                  isLoading={isRegistering}
                  error={registerError}
                  onLoginClick={() => setIsRegister(false)}
                />
              </motion.div>
            ) : isLoginOtpPending ? (
              <motion.div
                key="login-otp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <OtpVerificationForm
                  email={loginEmail}
                  onSubmit={onLoginOtpSubmit}
                  isLoading={isVerifyingLoginOtp}
                  error={verifyLoginOtpError}
                  onBack={() => setIsLoginOtpPending(false)}
                />
              </motion.div>
            ) : isForgotPassword ? (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ForgotPasswordForm
                  onSubmit={onForgotPasswordSubmit}
                  isLoading={isForgotLoading}
                  error={forgotError}
                  onBack={() => setIsForgotPassword(false)}
                />
              </motion.div>
            ) : isResetPasswordPending ? (
              <motion.div
                key="reset-password"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ResetPasswordForm
                  email={forgotPasswordEmail}
                  onSubmit={onResetPasswordSubmit}
                  isLoading={isResetLoading}
                  error={resetError}
                  onBack={() => {
                    setIsResetPasswordPending(false);
                    setIsForgotPassword(true);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoginForm
                  onSubmit={onLoginSubmit}
                  isLoading={isLoggingIn}
                  error={loginError}
                  onRegisterClick={() => setIsRegister(true)}
                  onForgotPasswordClick={() => setIsForgotPassword(true)}
                />

                {/* Face Login Divider */}
                <div className="mt-6 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        hoặc
                      </span>
                    </div>
                  </div>
                </div>

                {/* Face Login Button */}
                <button
                  onClick={() => setShowFaceLoginEmailDialog(true)}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
                >
                  🔐 Đăng nhập bằng khuôn mặt
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Face Login Email Dialog */}
      <AnimatePresence>
        {showFaceLoginEmailDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowFaceLoginEmailDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Đăng nhập bằng khuôn mặt
                </h3>
                <button
                  onClick={() => setShowFaceLoginEmailDialog(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Nhập email để xác minh danh tính của bạn.
              </p>

              <input
                type="email"
                value={faceLoginEmail}
                onChange={(e) => setFaceLoginEmail(e.target.value)}
                placeholder="Nhập email"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    startFaceLogin();
                  }
                }}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFaceLoginEmailDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={startFaceLogin}
                  disabled={isFaceLoginLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isFaceLoginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tiếp tục'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AWS Face Liveness Modal */}
      <AnimatePresence>
        {showAwsFaceLiveness && livenessSessionId && (
          <AwsFaceLivenessComponent
            sessionId={livenessSessionId}
            region="us-east-1"
            onSuccess={handleFaceLivenessSuccess}
            onCancel={cancelFaceLiveness}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
