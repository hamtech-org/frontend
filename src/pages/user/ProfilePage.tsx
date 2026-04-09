import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, Mail, Phone, FileText, User as UserIcon, Loader2, Check, X } from 'lucide-react';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/userApi';
import { useEnableFaceLoginMutation, useDisableFaceLoginMutation } from '@/store/api/authApi';

// ── Validation Schema ──
const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').max(50, 'Tên hiển thị không quá 50 ký tự'),
  bio: z.string().max(500, 'Bio không quá 500 ký tự').optional().or(z.literal('')),
  phone: z.string().regex(/^(\+84\d{9,10})?$/, 'Số điện thoại không hợp lệ (định dạng: +84901234567)').optional().or(z.literal('')),
  avatar: z.string().url().optional().or(z.literal('')),
});

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

const ProfilePage: React.FC = () => {
  const { data: profileData, isLoading, error } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [enableFaceLogin, { isLoading: isEnablingFaceLogin }] = useEnableFaceLoginMutation();
  const [disableFaceLogin, { isLoading: isDisablingFaceLogin }] = useDisableFaceLoginMutation();
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [faceLoginEnabled, setFaceLoginEnabled] = useState(() => {
    const saved = localStorage.getItem('faceLoginEnabled');
    return saved !== null ? saved === 'true' : false; // Default to false if not set
  });
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const user = profileData?.data;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
    },
  });

  // Reset form when user data loads
  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName,
        bio: user.bio || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
      setAvatarPreview(user.avatar);
    }
  }, [user, reset]);

  // Save face login preference to localStorage
  useEffect(() => {
    localStorage.setItem('faceLoginEnabled', String(faceLoginEnabled));
  }, [faceLoginEnabled]);

  const onSubmit = async (data: UpdateProfileFormValues) => {
    try {
      await updateProfile({
        displayName: data.displayName,
        bio: data.bio,
        phone: data.phone,
        avatar: data.avatar,
      }).unwrap();
      setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ',
      });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAvatarPreview(base64);
        // In a real app, you'd upload to S3 and get the URL
        // For now, we'll just store the base64 data
      };
      reader.readAsDataURL(file);
    }
  };


  const startFaceCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 }
        },
      });
      
      // Open modal first to mount video element
      setShowFaceCamera(true);
      
      // Wait for video ref to be available after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays
          videoRef.current.play().catch((err) => {
            console.error('Error playing video:', err);
          });
        }
      }, 100);
    } catch (err) {
      console.error('Failed to access camera:', err);
      setShowFaceCamera(false);
      setMessage({
        type: 'error',
        text: 'Không thể truy cập camera. Vui lòng kiểm tra quyền của ứng dụng.',
      });
    }
  };

  const captureFaceAndEnable = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, 320, 240);
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);

    // Stop camera
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setShowFaceCamera(false);

    try {
      await enableFaceLogin({ image: imageData }).unwrap();
      setFaceLoginEnabled(true);
      setMessage({
        type: 'success',
        text: 'Đăng nhập bằng khuôn mặt đã được bật!',
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to enable face login:', err);
      setMessage({
        type: 'error',
        text: err?.data?.message || 'Có lỗi xảy ra khi bật đăng nhập bằng khuôn mặt',
      });
    }
  };

  const cancelFaceCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    }
    setShowFaceCamera(false);
  };

  const handleToggleFaceLogin = async () => {
    if (!faceLoginEnabled) {
      // Enable face login - open camera
      await startFaceCamera();
    } else {
      // Disable face login
      try {
        await disableFaceLogin().unwrap();
        setFaceLoginEnabled(false);
        setMessage({
          type: 'success',
          text: 'Đăng nhập bằng khuôn mặt đã được tắt!',
        });
        setTimeout(() => setMessage(null), 3000);
      } catch (err: any) {
        console.error('Failed to disable face login:', err);
        setMessage({
          type: 'error',
          text: err?.data?.message || 'Có lỗi xảy ra khi tắt đăng nhập bằng khuôn mặt',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-red-500">Không thể tải thông tin hồ sơ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Quản lý hồ sơ</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chỉnh sửa thông tin cá nhân và tùy chỉnh hồ sơ của bạn
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Avatar Section */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32 relative">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2"
            >
              <div className="relative">
                <button
                  onClick={handleAvatarClick}
                  className="relative inline-block group"
                >
                  <img
                    src={avatarPreview || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.userId}`}
                    alt={user?.displayName}
                    className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full transition flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </motion.div>
          </div>

          {/* Form Section */}
          <div className="pt-20 px-8 pb-8">
            {/* Message Alert */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}
              >
                {message.type === 'success' ? (
                  <Check className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 flex-shrink-0" />
                )}
                <span>{message.text}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email (Read-only) */}
              <div>
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <UserIcon className="w-4 h-4" />
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  {...register('displayName')}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                  placeholder="Nhập tên hiển thị của bạn"
                />
                {errors.displayName && (
                  <p className="mt-1 text-sm text-red-500">{errors.displayName.message}</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="w-4 h-4" />
                  Tiểu sử
                </label>
                <textarea
                  {...register('bio')}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition resize-none"
                  placeholder="Viết một tiểu sử ngắn về bản thân..."
                  rows={4}
                />
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-500">{errors.bio.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {watch('bio')?.length || 0}/500 ký tự
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4" />
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition"
                  placeholder="+84901234567"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              {/* User Status (Read-only) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                    Trạng thái
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        user?.status === 'online'
                          ? 'bg-green-500'
                          : user?.status === 'away'
                            ? 'bg-yellow-500'
                            : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {user?.status === 'online' ? 'Đang hoạt động' : user?.status === 'away' ? 'Vắng mặt' : 'Ngoại tuyến'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                    Loại tài khoản
                  </label>
                  <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                  Trạng thái xác thực
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {user?.isVerified ? (
                    <>
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Email đã được xác thực
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Email chưa được xác thực
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Face Login Toggle */}
              <div>
                <div className="flex items-center justify-between py-4 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Đăng nhập bằng khuôn mặt
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {faceLoginEnabled ? 'Bật' : 'Tắt'} - Nhấp để thay đổi
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFaceLogin}
                    disabled={isEnablingFaceLogin || isDisablingFaceLogin}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${
                      faceLoginEnabled
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                  >
                    {isEnablingFaceLogin || isDisablingFaceLogin ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" />
                    ) : (
                      <span
                        className={`inline-block h-6 w-6 transform bg-white rounded-full transition-transform ${
                          faceLoginEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition shadow-md hover:shadow-lg"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>💡 Mẹo:</strong> Bạn có thể nhấp vào ảnh đại diện để thay đổi nó. Các thay đổi sẽ được lưu ngay khi bạn nhấp nút "Lưu thay đổi".
          </p>
        </motion.div>
      </div>

      {/* Face Camera Modal */}
      <AnimatePresence>
        {showFaceCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm bg-opacity-20 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Chụp ảnh khuôn mặt</h2>
                <p className="text-purple-100 text-sm mt-1">Căn chỉnh khuôn mặt vào khung hình rồi nhấn "Chụp"</p>
              </div>

              {/* Camera Feed */}
              <div className="p-6 space-y-4">
                <div className="bg-black rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    width={320}
                    height={240}
                    className="w-full aspect-video object-cover"
                  />
                </div>
                <canvas ref={canvasRef} className="hidden" width={320} height={240} />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelFaceCamera}
                    className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={captureFaceAndEnable}
                    disabled={isEnablingFaceLogin}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition"
                  >
                    {isEnablingFaceLogin ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Chụp
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
