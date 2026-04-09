import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, User, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useRegisterMutation } from '@/store/api/authApi';
import { ILoginRequest, IRegisterRequest } from '@/types/auth.types';
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

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

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
  control,
  register,
  errors,
  trigger,
}: {
  fields: any[];
  control: any;
  register: any;
  errors: any;
  trigger: (name: any) => void;
}) => {
  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <label htmlFor={field.name} className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300">
            {field.icon}
            {field.title}
          </label>
          <div className="relative">
            <input
              id={field.name}
              type={field.showPasswordToggle && field.showPassword ? 'text' : field.type}
              {...register(field.name, {
                onChange: () => trigger(field.name),
              })}
              className="mt-1 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
              autoComplete="off"
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
            {errors[field.name] && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-1 text-sm text-red-500">
                {errors[field.name].message}
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

  // Login Form
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const {
    register: loginFormRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Failed to login:', err);
    }
  };

  // Register Form
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();
  const {
    register: registerFormRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    trigger: triggerRegister,
    control: registerFormControl,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const [regStep, setRegStep] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    console.log('Submitting registration with data:', data);
    try {
      const { confirmPassword, ...registerData } = data;
      const result = await register(registerData).unwrap();
      console.log('Registration successful:', result);
      navigate('/');
    } catch (err) {
      console.error('Failed to register:', err);
    }
  };

  const handleNextStep = async () => {
    const fieldsPerStep: (keyof RegisterFormValues)[][] = [['displayName'], ['email'], ['password', 'confirmPassword']];
    const currentFields = fieldsPerStep[regStep];
    const isValid = await triggerRegister(currentFields);

    if (isValid) {
      if (regStep < 2) {
        setPage([regStep + 1, 1]);
        setRegStep(regStep + 1);
      } else {
        handleRegisterSubmit(onRegisterSubmit)();
      }
    }
  };

  const handlePrevStep = () => {
    if (regStep > 0) {
      setPage([regStep - 1, -1]);
      setRegStep(regStep - 1);
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
                        control={registerFormControl}
                        register={registerFormRegister}
                        errors={registerErrors}
                        trigger={triggerRegister}
                      />
                    </motion.div>
                  </AnimatePresence>
                </form>

                {registerError && (
                  <div className="text-red-500 text-sm text-center mt-4">
                    {/* @ts-ignore */}
                    {registerError?.data?.message || 'Đã có lỗi xảy ra'}
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
                    disabled={isRegistering}
                    className="flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                  >
                    {isRegistering ? (
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
