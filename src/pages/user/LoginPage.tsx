import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, User, Mail, Lock, ShieldCheck, Camera, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useVerifyLoginOtpMutation, useRegisterMutation, useVerifyEmailMutation, useFaceLoginMutation } from '@/store/api/authApi';
import logo from '@/assets/images/logo_tron.png';

// Schemas
const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').max(50, 'Tên hiển thị không quá 50 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP phải có 6 chữ số').regex(/^\d+$/, 'OTP chỉ được chứa chữ số'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

const Step = ({
  fields,
  register,
  errors,
  trigger,
  otpRegister,
  otpErrors,
}: {
  fields: any[];
  register?: any;
  errors?: any;
  trigger?: (name: any) => void;
  otpRegister?: any;
  otpErrors?: any;
}) => {
  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <label htmlFor={field.name} className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300">
            {field.icon}
            <div>
              <div>{field.title}</div>
              {field.subtitle && <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">{field.subtitle}</div>}
            </div>
          </label>
          <div className="relative">
            <input
              id={field.name}
              type={field.showPasswordToggle && field.showPassword ? 'text' : field.type}
              placeholder={field.isOtp ? 'XXXXXX' : ''}
              {...(field.isOtp ? otpRegister : register)(field.name, {
                onChange: () => (field.isOtp ? undefined : trigger?.(field.name)),
              })}
              className="mt-1 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
              autoComplete="off"
              maxLength={field.isOtp ? 6 : undefined}
            />
            {field.showPasswordToggle && (
              <button
                type="button"
                onClick={field.togglePassword}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {field.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>
          <AnimatePresence>
            {(field.isOtp ? otpErrors?.[field.name] : errors?.[field.name]) && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-1 text-sm text-red-500">
                {field.isOtp ? otpErrors[field.name]?.message : errors[field.name]?.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // Store stream in ref, not state

  // Face Login
  const [faceLogin, { isLoading: isFaceLogging }] = useFaceLoginMutation();
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [recentEmails, setRecentEmails] = useState<string[]>(() => {
    const stored = localStorage.getItem('recentEmails');
    return stored ? JSON.parse(stored) : [];
  });

  // Login Form
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const [verifyLoginOtp, { isLoading: isVerifyingLoginOtp, error: verifyLoginOtpError }] = useVerifyLoginOtpMutation();
  const {
    register: loginFormRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: loginOtpFormRegister,
    handleSubmit: handleLoginOtpSubmit,
    formState: { errors: loginOtpErrors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
  });

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginOtpPending, setIsLoginOtpPending] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data).unwrap();
      // Store email for quick login
      setRecentEmails((prev) => {
        const updated = [data.email, ...prev.filter((e) => e !== data.email)].slice(0, 3);
        localStorage.setItem('recentEmails', JSON.stringify(updated));
        return updated;
      });
      setLoginEmail(data.email);
      setIsLoginOtpPending(true);
    } catch (err) {
      console.error('Failed to login:', err);
    }
  };

  /// Face Login Handlers
  const startFaceCamera = async () => {
    try {
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });

      setCurrentStream(stream);
      setShowFaceCamera(true);
    } catch (err) {
      console.error('Failed to access camera:', err);
      setShowFaceCamera(false);
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền của ứng dụng.');
    }
  };

  // Assign stream when modal opens
  useEffect(() => {
    if (showFaceCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      setCurrentStream(streamRef.current);
    }
  }, [showFaceCamera]);

  // Cleanup stream
  useEffect(() => {
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject = null;
      }
    };
  }, [currentStream]);

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) return;

      context.drawImage(videoRef.current, 0, 0, 320, 240);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);

      setShowFaceCamera(false);
      setCurrentStream(null);

      await faceLogin({ image: imageData }).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Face login failed:', err);
      alert('Đăng nhập bằng khuôn mặt không thành công. Vui lòng thử lại.');
    }
  };

  const cancelFaceCamera = () => {
    setShowFaceCamera(false);
    setCurrentStream(null);
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

  // Register Form
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();
  const [verifyEmail, { isLoading: isVerifying, error: verifyError }] = useVerifyEmailMutation();
  const {
    register: registerFormRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    trigger: triggerRegister,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const {
    register: otpFormRegister,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
  });

  const [regStep, setRegStep] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await register(registerData).unwrap();
      setRegistrationEmail(data.email);
      // Move to OTP verification step
      if (regStep < 3) {
        setPage([3, 1]);
        setRegStep(3);
      }
    } catch (err) {
      console.error('Failed to register:', err);
    }
  };

  const onOtpSubmit = async (data: OtpFormValues) => {
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

  const handleNextStep = async () => {
    const fieldsPerStep: (keyof RegisterFormValues)[][] = [['displayName'], ['email'], ['password', 'confirmPassword']];
    
    // If we're on the OTP step (step 3), handle OTP submission
    if (regStep === 3) {
      handleOtpSubmit(onOtpSubmit)();
      return;
    }

    // For other steps, validate and move to next
    const currentFields = fieldsPerStep[regStep];
    const isValid = await triggerRegister(currentFields);

    if (isValid) {
      if (regStep < 2) {
        setPage([regStep + 1, 1]);
        setRegStep(regStep + 1);
      } else if (regStep === 2) {
        // On password step, submit registration
        handleRegisterSubmit(onRegisterSubmit)();
      }
    }
  };

  const handlePrevStep = () => {
    if (regStep > 0) {
      if (regStep === 3) {
        // Going back from OTP step to password step
        setPage([2, -1]);
        setRegStep(2);
      } else {
        setPage([regStep - 1, -1]);
        setRegStep(regStep - 1);
      }
    }
  };

  const registrationSteps = [
    {
      fields: [
        {
          title: 'Tên của bạn là gì?',
          name: 'displayName',
          type: 'text',
          icon: <User />,
        },
      ],
    },
    {
      fields: [
        {
          title: 'Email của bạn?',
          name: 'email',
          type: 'email',
          icon: <Mail />,
        },
      ],
    },
    {
      fields: [
        {
          title: 'Tạo một mật khẩu an toàn',
          name: 'password',
          type: 'password',
          icon: <Lock />,
          showPasswordToggle: true,
          showPassword: showPassword,
          togglePassword: () => setShowPassword(!showPassword),
        },
        {
          title: 'Xác nhận lại mật khẩu',
          name: 'confirmPassword',
          type: 'password',
          icon: <Lock />,
          showPasswordToggle: true,
          showPassword: showConfirmPassword,
          togglePassword: () => setShowConfirmPassword(!showConfirmPassword),
        },
      ],
    },
    {
      fields: [
        {
          title: 'Nhập mã OTP',
          subtitle: `Mã xác thực đã được gửi đến ${registrationEmail}`,
          name: 'otp',
          type: 'text',
          icon: <ShieldCheck />,
          isOtp: true,
        },
      ],
    },
  ];

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
            {isRegister ? (
              // Registration multi-step form
              <motion.div key="register">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-6 h-48">
                  <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                      key={page}
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      <Step
                        {...registrationSteps[regStep]}
                        register={registerFormRegister}
                        errors={registerErrors}
                        trigger={triggerRegister}
                        otpRegister={otpFormRegister}
                        otpErrors={otpErrors}
                      />
                    </motion.div>
                  </AnimatePresence>
                </form>

                {(registerError || verifyError) && (
                  <div className="text-red-500 text-sm text-center mt-4">
                    {/* @ts-ignore */}
                    {registerError?.data?.message || verifyError?.data?.message || 'Đã có lỗi xảy ra'}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={handlePrevStep}
                    disabled={regStep === 0}
                    className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isRegistering || isVerifying}
                    className="flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                  >
                    {isRegistering || isVerifying ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        {regStep === 3 ? 'Hoàn tất' : 'Tiếp theo'}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-6 text-center">
                  <button onClick={() => setIsRegister(false)} className="text-sm text-blue-600 hover:underline">
                    Đã có tài khoản? Đăng nhập
                  </button>
                </div>
              </motion.div>
            ) : isLoginOtpPending ? (
              // Login OTP Verification
              <motion.div key="login-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={handleLoginOtpSubmit(onLoginOtpSubmit)} className="space-y-6">
                  <div>
                    <label
                      htmlFor="login-otp"
                      className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <div>
                        <div>Nhập mã OTP</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">Mã xác thực đã được gửi đến {loginEmail}</div>
                      </div>
                    </label>
                    <input
                      id="login-otp"
                      type="text"
                      placeholder="XXXXXX"
                      {...loginOtpFormRegister('otp')}
                      className="mt-4 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      maxLength={6}
                    />
                    {loginOtpErrors.otp && <p className="mt-1 text-sm text-red-500">{loginOtpErrors.otp.message}</p>}
                  </div>

                  {(verifyLoginOtpError || loginError) && (
                    <div className="text-red-500 text-sm text-center">
                      {/* @ts-ignore */}
                      {verifyLoginOtpError?.data?.message || loginError?.data?.message || 'Đã có lỗi xảy ra'}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginOtpPending(false);
                        resetLoginForm();
                      }}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifyingLoginOtp}
                      className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                    >
                      {isVerifyingLoginOtp ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          Xác nhận
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : showFaceCamera ? (
              // Face Camera
              <motion.div key="face-camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-4">
                  <div style={{ 
                    backgroundColor: '#000', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb',
                    height: '320px',
                    width: '100%',
                    position: 'relative'
                  }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <canvas ref={canvasRef} className="hidden" width={320} height={240} />

                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Căn chỉnh khuôn mặt của bạn vào khung hình rồi nhấn "Chụp"
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={cancelFaceCamera}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={captureFace}
                      disabled={isFaceLogging}
                      className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {isFaceLogging ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Chụp
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              // Login form
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-6">

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      {...loginFormRegister('email')}
                      className="mt-1 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    {loginErrors.email && <p className="mt-1 text-sm text-red-500">{loginErrors.email.message}</p>}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        {...loginFormRegister('password')}
                        className="mt-1 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="mt-1 text-sm text-red-500">{loginErrors.password.message}</p>}
                  </div>

                  {loginError && (
                    <div className="text-red-500 text-sm text-center">
                      {/* @ts-ignore */}
                      {loginError?.data?.message || 'Đã có lỗi xảy ra'}
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          Đăng nhập
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Face Login Button */}
                  <button
                    type="button"
                    onClick={startFaceCamera}
                    disabled={isFaceLogging}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-blue-600 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    {isFaceLogging ? 'Đang xử lý...' : 'Đăng nhập bằng khuôn mặt'}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <button onClick={() => setIsRegister(true)} className="text-sm text-blue-600 hover:underline">
                    Chưa có tài khoản? Đăng ký
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
