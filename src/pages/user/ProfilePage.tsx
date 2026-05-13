import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  Mail,
  Phone,
  FileText,
  User as UserIcon,
  Loader2,
  Check,
  X,
  MonitorSmartphone,
  ShieldOff,
} from 'lucide-react';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/userApi';
import {
  useEnableFaceLoginMutation,
  useDisableFaceLoginMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
} from '@/store/api/authApi';
import { apiClient } from '@/services/api';
import AwsFaceLivenessComponent from '@/components/AwsFaceLivenessComponent';
import type { IAuthSessionSummary } from '@/types/auth.types';

// ── Validation Schema ──
const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
    .max(50, 'Tên hiển thị không quá 50 ký tự'),
  bio: z.string().max(500, 'Bio không quá 500 ký tự').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^(\+84\d{9,10})?$/, 'Số điện thoại không hợp lệ (định dạng: +84901234567)')
    .optional()
    .or(z.literal('')),
  avatar: z.string().url().optional().or(z.literal('')),
});

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

const ProfilePage: React.FC = () => {
  const { data: profileData, isLoading, error } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [enableFaceLogin, { isLoading: isEnablingFaceLogin }] = useEnableFaceLoginMutation();
  const [disableFaceLogin, { isLoading: isDisablingFaceLogin }] = useDisableFaceLoginMutation();
  const { data: sessionsRes, isLoading: sessionsLoading } = useGetSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [faceLoginEnabled, setFaceLoginEnabled] = useState(() => {
    const saved = localStorage.getItem('faceLoginEnabled');
    return saved !== null ? saved === 'true' : false; // Default to false if not set
  });
  const [livenessSessionId, setLivenessSessionId] = useState('');
  const [showAwsFaceLiveness, setShowAwsFaceLiveness] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState<{ show: boolean; password: string }>({
    show: false,
    password: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const formData = new FormData();
      formData.append('displayName', data.displayName);
      if (data.bio) formData.append('bio', data.bio);
      if (data.phone) formData.append('phone', data.phone);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await updateProfile(formData).unwrap();
      setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
      setSelectedFile(null);
      setAvatarPreview(null); // Reset preview to show fresh avatar from API
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
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAvatarPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startFaceCamera = async () => {
    try {
      // Step 1: Create liveness session with AWS
      const livenessResponse = await apiClient.post('/auth/face-liveness/start', {});
      const sessionId = livenessResponse.data?.data?.sessionId;

      if (!sessionId) {
        setMessage({
          type: 'error',
          text: 'Không thể khởi tạo phiên xác thực khuôn mặt. Vui lòng thử lại.',
        });
        return;
      }
      setLivenessSessionId(sessionId);
      setShowAwsFaceLiveness(true);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Không thể khởi tạo phiên xác thực khuôn mặt. Vui lòng thử lại.',
      });
    }
  };

  const handleAwsFaceLivenessSuccess = async () => {
    try {
      // AWS has verified liveness and extracted reference image
      // Now complete enablement with previously entered password
      await enableFaceLogin({
        password: passwordDialog.password,
        livenessSessionId,
      }).unwrap();

      setFaceLoginEnabled(true);
      setLivenessSessionId('');
      setShowAwsFaceLiveness(false);
      setPasswordDialog({ show: false, password: '' });

      setMessage({
        type: 'success',
        text: 'Đăng nhập bằng khuôn mặt đã được bật!',
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      // Close modals and turn off toggle on failure
      setShowAwsFaceLiveness(false);
      setLivenessSessionId('');
      setFaceLoginEnabled(false);

      // Show error message
      const errorMsg =
        (error as any)?.data?.message ||
        'Có lỗi xảy ra khi bật đăng nhập bằng khuôn mặt. Vui lòng thử lại.';
      setMessage({
        type: 'error',
        text: errorMsg,
      });
    }
  };

  const handlePasswordConfirm = async () => {
    try {
      if (!passwordDialog.password.trim()) {
        setMessage({
          type: 'error',
          text: 'Vui lòng nhập mật khẩu',
        });
        return;
      }

      // Password verified locally, close dialog (but KEEP password in state for liveness success)
      // Don't clear password yet - it's needed when liveness succeeds
      setPasswordDialog({ ...passwordDialog, show: false });
      await startFaceCamera();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Có lỗi xảy ra. Vui lòng thử lại.',
      });
      setPasswordDialog({ show: false, password: '' });
    }
  };

  const cancelAwsFaceLiveness = () => {
    setLivenessSessionId('');
    setShowAwsFaceLiveness(false);
    setPasswordDialog({ show: false, password: '' });
  };

  const cancelPasswordDialog = () => {
    setPasswordDialog({ show: false, password: '' });
    setShowAwsFaceLiveness(false);
    setLivenessSessionId('');
  };

  const handleToggleFaceLogin = async () => {
    if (!faceLoginEnabled) {
      // Enable face login - show password verification first
      setPasswordDialog({ show: true, password: '' });
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
        setMessage({
          type: 'error',
          text: err?.data?.message || 'Có lỗi xảy ra khi tắt đăng nhập bằng khuôn mặt',
        });
      }
    }
  };

  const sessions = useMemo(() => {
    const rows = sessionsRes?.data ?? [];
    return [...rows].sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sessionsRes?.data]);

  const formatSessionLocation = (loc: IAuthSessionSummary['location']) => {
    if (!loc) return '—';
    const parts = [loc.city, loc.region, loc.country].filter((p) => p && String(p).trim());
    return parts.length ? parts.join(', ') : '—';
  };

  const getSessionStatus = (s: IAuthSessionSummary) => {
    if (s.isRevoked) {
      return {
        label: 'Đã thu hồi',
        className:
          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      };
    }
    if (!s.isActive) {
      return {
        label: 'Hết hạn / không còn hiệu lực',
        className:
          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
      };
    }
    return {
      label: 'Đang hoạt động',
      className:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    };
  };

  const handleRevokeSession = async (s: IAuthSessionSummary) => {
    if (!s.isActive || s.isRevoked) return;
    setRevokingSessionId(s.sessionId);
    try {
      await revokeSession(s.sessionId).unwrap();
      if (s.isCurrent) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return;
      }
      setMessage({ type: 'success', text: 'Đã thu hồi truy cập thiết bị.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.data?.message || err?.data?.error?.message || 'Không thể thu hồi phiên',
      });
    } finally {
      setRevokingSessionId(null);
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
                <button onClick={handleAvatarClick} className="relative inline-block group">
                  <img
                    src={
                      avatarPreview ||
                      user?.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.userId}`
                    }
                    alt={user?.displayName}
                    className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover"
                  />
                  <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-40 rounded-full transition flex items-center justify-center">
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
                {errors.bio && <p className="mt-1 text-sm text-red-500">{errors.bio.message}</p>}
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
                      {user?.status === 'online'
                        ? 'Đang hoạt động'
                        : user?.status === 'away'
                          ? 'Vắng mặt'
                          : 'Ngoại tuyến'}
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

        {/* Sessions / thiết bị đăng nhập */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <MonitorSmartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thiết bị đăng nhập
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Phiên đang hoạt động và lịch sử; hiển thị IP và thiết bị tại thời điểm đăng nhập.
                Thu hồi sẽ vô hiệu hóa refresh token trên phiên đó.
              </p>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {sessionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                Chưa có phiên đăng nhập nào được lưu.
              </p>
            ) : (
              <ul className="space-y-3">
                {sessions.map((s) => {
                  const status = getSessionStatus(s);
                  const canRevoke = s.isActive && !s.isRevoked;
                  return (
                    <li
                      key={s.sessionId}
                      className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {s.deviceInfo.browser || 'Trình duyệt'} ·{' '}
                            {s.deviceInfo.os || 'Hệ điều hành'}
                          </span>
                          {s.isCurrent && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                              Thiết bị này
                            </span>
                          )}
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>
                            <span className="text-gray-500 dark:text-gray-500">IP:</span>{' '}
                            <span className="font-mono text-gray-800 dark:text-gray-200">
                              {s.ipAddress || '—'}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-500 dark:text-gray-500">
                              Vị trí ước tính:
                            </span>{' '}
                            {formatSessionLocation(s.location)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Đăng nhập: {new Date(s.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canRevoke || revokingSessionId !== null}
                        onClick={() => handleRevokeSession(s)}
                        className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        {revokingSessionId === s.sessionId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldOff className="w-4 h-4" />
                        )}
                        Thu hồi truy cập
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
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
            <strong>💡 Mẹo:</strong> Bạn có thể nhấp vào ảnh đại diện để thay đổi nó. Các thay đổi
            sẽ được lưu ngay khi bạn nhấp nút "Lưu thay đổi".
          </p>
        </motion.div>
      </div>

      {/* AWS Face Liveness Modal */}
      <AnimatePresence>
        {showAwsFaceLiveness && livenessSessionId && (
          <AwsFaceLivenessComponent
            sessionId={livenessSessionId}
            region="us-east-1"
            onSuccess={handleAwsFaceLivenessSuccess}
            onCancel={cancelAwsFaceLiveness}
          />
        )}
      </AnimatePresence>

      {/* Portal avoids broken `fixed` inside App.tsx route `motion.div` (transform / will-change). */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {passwordDialog.show && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] backdrop-blur-md bg-black/40 flex items-center justify-center p-4"
                onClick={cancelPasswordDialog}
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
                      Xác thực mật khẩu
                    </h3>
                    <button
                      onClick={cancelPasswordDialog}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Nhập mật khẩu của bạn để bảo mật tài khoản trước khi bật đăng nhập bằng khuôn
                    mặt.
                  </p>

                  <input
                    type="password"
                    value={passwordDialog.password}
                    onChange={(e) =>
                      setPasswordDialog({ ...passwordDialog, password: e.target.value })
                    }
                    placeholder="Nhập mật khẩu"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePasswordConfirm();
                      }
                    }}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={cancelPasswordDialog}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handlePasswordConfirm}
                      disabled={isEnablingFaceLogin}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isEnablingFaceLogin ? (
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
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

export default ProfilePage;
