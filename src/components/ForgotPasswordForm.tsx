import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSubmit: (data: ForgotPasswordFormValues) => Promise<void>;
  isLoading: boolean;
  error: any;
  onBack: () => void;
}

export const ForgotPasswordForm = ({
  onSubmit,
  isLoading,
  error,
  onBack,
}: ForgotPasswordFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quên mật khẩu?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Nhập email của bạn để nhận mã OTP khôi phục mật khẩu.
        </p>
      </div>

      <div>
        <label
          htmlFor="email"
          className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300"
        >
          <Mail className="w-5 h-5" />
          <span>Email</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="your@email.com"
          {...register('email')}
          className="mt-4 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
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
              Gửi OTP
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
