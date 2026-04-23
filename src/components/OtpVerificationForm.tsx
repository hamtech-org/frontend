import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP phải có 6 chữ số').regex(/^\d+$/, 'OTP chỉ được chứa chữ số'),
});

export type OtpFormValues = z.infer<typeof otpSchema>;

interface OtpVerificationFormProps {
  email: string;
  onSubmit: (data: OtpFormValues) => Promise<void>;
  isLoading: boolean;
  error: any;
  onBack: () => void;
}

export const OtpVerificationForm = ({
  email,
  onSubmit,
  isLoading,
  error,
  onBack,
}: OtpVerificationFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="otp"
          className="flex items-center gap-3 text-lg font-medium text-gray-700 dark:text-gray-300"
        >
          <ShieldCheck className="w-5 h-5" />
          <div>
            <div>Nhập mã OTP</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">
              Mã xác thực đã được gửi đến {email}
            </div>
          </div>
        </label>
        <input
          id="otp"
          type="text"
          placeholder="XXXXXX"
          {...register('otp')}
          className="mt-4 block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:ring-blue-500 focus:border-blue-500"
          maxLength={6}
        />
        {errors.otp && <p className="mt-1 text-sm text-red-500">{errors.otp.message}</p>}
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center">
          {(error as any)?.data?.message || 'Đã có lỗi xảy ra'}
        </div>
      )}

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
  );
};
