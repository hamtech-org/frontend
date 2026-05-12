import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, User, Mail, Lock } from 'lucide-react';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
      .max(50, 'Tên hiển thị không quá 50 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt',
      ),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSubmit: (data: RegisterFormValues) => Promise<void>;
  isLoading: boolean;
  error: any;
  onLoginClick: () => void;
}

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
}: {
  fields: any[];
  register?: any;
  errors?: any;
  trigger?: (name: any) => void;
}) => {
  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <label
            htmlFor={field.name}
            className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300"
          >
            {field.icon}
            <div>
              <div>{field.title}</div>
              {field.subtitle && (
                <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  {field.subtitle}
                </div>
              )}
            </div>
          </label>
          <div className="relative">
            <input
              id={field.name}
              type={field.showPasswordToggle && field.showPassword ? 'text' : field.type}
              placeholder={field.placeholder}
              {...register(field.name, {
                onChange: () => trigger?.(field.name),
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
            {errors?.[field.name] && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-1 text-sm text-red-500"
              >
                {errors[field.name]?.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export const RegisterForm = ({ onSubmit, isLoading, error, onLoginClick }: RegisterFormProps) => {
  const [regStep, setRegStep] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const handleNextStep = async () => {
    const fieldsPerStep: (keyof RegisterFormValues)[][] = [
      ['displayName'],
      ['email'],
      ['password', 'confirmPassword'],
    ];
    const currentFields = fieldsPerStep[regStep];
    console.log(
      '📝 [DEBUG] RegisterForm - validating fields:',
      currentFields,
      'for step:',
      regStep,
    );
    const isValid = await trigger(currentFields);

    if (isValid) {
      if (regStep < 2) {
        console.log('📝 [DEBUG] RegisterForm - moving to next step:', regStep + 1);
        setPage([regStep + 1, 1]);
        setRegStep(regStep + 1);
      } else if (regStep === 2) {
        console.log('📝 [DEBUG] RegisterForm - final step, submitting form');
        handleSubmit(onSubmit)();
      }
    } else {
      console.log('❌ [DEBUG] RegisterForm - validation failed for fields:', currentFields);
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
          placeholder: 'VD: John Doe',
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
          placeholder: 'your@email.com',
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
          placeholder: '••••••••',
        },
        {
          title: 'Xác nhận lại mật khẩu',
          name: 'confirmPassword',
          type: 'password',
          icon: <Lock />,
          showPasswordToggle: true,
          showPassword: showConfirmPassword,
          togglePassword: () => setShowConfirmPassword(!showConfirmPassword),
          placeholder: '••••••••',
        },
      ],
    },
  ];

  return (
    <div>
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
              register={register}
              errors={errors}
              trigger={trigger}
            />
          </motion.div>
        </AnimatePresence>
      </form>

      {error && (
        <div className="text-red-500 text-sm text-center mt-4">{getApiErrorMessage(error)}</div>
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
          disabled={isLoading}
          className="flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              Tiếp theo
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </button>
      </div>

      <div className="mt-6 text-center">
        <button onClick={onLoginClick} className="text-sm text-blue-600 hover:underline">
          Đã có tài khoản? Đăng nhập
        </button>
      </div>
    </div>
  );
};
