import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormValues) => Promise<void>;
  isLoading: boolean;
  error: any;
  onRegisterClick: () => void;
}

export const LoginForm = ({
  onSubmit,
  isLoading,
  error,
  onRegisterClick,
}: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });



  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300">
          <Mail className="w-5 h-5" />
          <div>
            <div>Email</div>
          </div>
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="mt-4 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300">
          <Lock className="w-5 h-5" />
          <div>
            <div>Mật khẩu</div>
          </div>
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            className="mt-4 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center">
          {/* @ts-expect-error RTK Query error shape is not strongly typed here */}
          {error?.data?.message || 'Đã có lỗi xảy ra'}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            Đăng nhập
            <ArrowRight className="ml-2 w-5 h-5" />
          </>
        )}
      </button>

      <div className="text-center">
        <button type="button" onClick={onRegisterClick} className="text-sm text-blue-600 hover:underline">
          Chưa có tài khoản? Đăng ký
        </button>
      </div>
    </form>
  );
};
