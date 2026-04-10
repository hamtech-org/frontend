import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useVerifyLoginOtpMutation, useRegisterMutation, useVerifyEmailMutation } from '@/store/api/authApi';
import logo from '@/assets/images/logo_tron.png';
import { LoginForm, type LoginFormValues, RegisterForm, type RegisterFormValues, OtpVerificationForm, type OtpFormValues } from '../../components';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoginOtpPending, setIsLoginOtpPending] = useState(false);
  const [registrationOtpPending, setRegistrationOtpPending] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');

  const navigate = useNavigate();

  // Mutations
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const [verifyLoginOtp, { isLoading: isVerifyingLoginOtp, error: verifyLoginOtpError }] = useVerifyLoginOtpMutation();
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();
  const [verifyEmail, { isLoading: isVerifying, error: verifyError }] = useVerifyEmailMutation();

  // Login handlers
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data).unwrap();
      setLoginEmail(data.email);
      setIsLoginOtpPending(true);
    } catch (err) {
      console.error('Failed to login:', err);
    }
  };

  const onLoginOtpSubmit = async (data: OtpFormValues) => {
    try {
      await verifyLoginOtp({
        email: loginEmail,
        otp: data.otp,
      }).unwrap();
      navigate('/');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <img src={logo} alt="Zalogram" className="w-16 h-16 mx-auto mb-4" />
            <AnimatePresence mode="wait">
              <motion.div
                key={isRegister ? 'reg-title' : 'login-title'}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {isRegister ? 'Bắt đầu hành trình của bạn với chúng tôi.' : 'Chào mừng trở lại!'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {registrationOtpPending ? (
              <motion.div key="register-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
              <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RegisterForm
                  onSubmit={onRegisterSubmit}
                  isLoading={isRegistering}
                  error={registerError}
                  onLoginClick={() => setIsRegister(false)}
                />
              </motion.div>
            ) : isLoginOtpPending ? (
              <motion.div key="login-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OtpVerificationForm
                  email={loginEmail}
                  onSubmit={onLoginOtpSubmit}
                  isLoading={isVerifyingLoginOtp}
                  error={verifyLoginOtpError}
                  onBack={() => setIsLoginOtpPending(false)}
                />
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoginForm
                  onSubmit={onLoginSubmit}
                  isLoading={isLoggingIn}
                  error={loginError}
                  onRegisterClick={() => setIsRegister(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
