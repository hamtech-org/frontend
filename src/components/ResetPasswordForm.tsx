import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
const passwordMsg = 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt';

const resetPasswordSchema = z
  .object({
    otp: z.string().length(6, 'OTP phải có 6 chữ số').regex(/^\d+$/, 'OTP chỉ được chứa chữ số'),
    newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').regex(passwordRegex, passwordMsg),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  email: string;
  onSubmit: (data: ResetPasswordFormValues) => Promise<void>;
  isLoading: boolean;
  error: any;
  onBack: () => void;
}

export const ResetPasswordForm = ({
  email,
  onSubmit,
  isLoading,
  error,
  onBack,
}: ResetPasswordFormProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Đặt lại mật khẩu</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Nhập mã OTP và mật khẩu mới cho tài khoản {email}
        </p>
      </div>

      <div>
        <label
          htmlFor="otp"
          className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300"
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Mã OTP</span>
        </label>
        <input
          id="otp"
          type="text"
          placeholder="XXXXXX"
          maxLength={6}
          {...register('otp')}
          className="mt-4 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.otp && <p className="mt-1 text-sm text-red-500">{errors.otp.message}</p>}
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300"
        >
          <Lock className="w-5 h-5" />
          <span>Mật khẩu mới</span>
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            {...register('newPassword')}
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
        {errors.newPassword && (
          <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300"
        >
          <Lock className="w-5 h-5" />
          <span>Xác nhận mật khẩu</span>
        </label>
        <input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          {...register('confirmPassword')}
          className="mt-4 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      {error && <div className="text-red-500 text-sm text-center">{getApiErrorMessage(error)}</div>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
        >
          {isLoading ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <>
              Đổi mật khẩu
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
