import { motion } from 'framer-motion';
import { Camera, Loader2, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FaceCameraModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onCapture: () => Promise<void>;
  onCancel: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onVideoReady?: () => void;
  initialEmail?: string;
  onEmailChange?: (email: string) => void;
}

export const FaceCameraModal = ({
  isOpen,
  isLoading,
  onCapture,
  onCancel,
  videoRef,
  canvasRef,
  onVideoReady,
  initialEmail = '',
  onEmailChange,
}: FaceCameraModalProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [showCamera, setShowCamera] = useState(false);

  console.log('🎬 [DEBUG] FaceCameraModal render:', { isOpen, isLoading, showCamera, email });
  
  if (!isOpen) {
    console.log('⚠️ [DEBUG] FaceCameraModal isOpen is false, returning null');
    return null;
  }

  // Sync initialEmail prop to local state when it changes
  useEffect(() => {
    console.log('🔄 [DEBUG] initialEmail prop changed:', initialEmail);
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleContinueToCamera = () => {
    if (!email.trim()) {
      alert('Vui lòng nhập địa chỉ email');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Vui lòng nhập email hợp lệ');
      return;
    }

    console.log('📧 [DEBUG] Email confirmed:', email);
    onEmailChange?.(email);
    setShowCamera(true);
  };

  const handleBackToEmail = () => {
    console.log('⬅️ [DEBUG] Returning to email input');
    setShowCamera(false);
  };

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    console.log('🎥 [DEBUG] onLoadedMetadata event fired');
    console.log('📊 [DEBUG] Video element at onLoadedMetadata:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      hasStream: !!video.srcObject,
    });
    
    console.log('▶️ [DEBUG] Attempting to play video');
    video.play()
      .then(() => {
        console.log('✅ [DEBUG] Video playing successfully');
      })
      .catch((err) => {
        console.error('❌ [DEBUG] Initial play failed:', err);
        console.error('Error type:', { code: err.code, name: err.name, message: err.message });
        console.log('⏳ [DEBUG] Retrying play after 200ms');
        setTimeout(() => {
          video.play()
            .then(() => {
              console.log('✅ [DEBUG] Video playing successfully after retry');
            })
            .catch((retryErr) => {
              console.error('❌ [DEBUG] Retry play failed:', retryErr);
              console.error('Retry error details:', { code: retryErr.code, name: retryErr.name, message: retryErr.message });
            });
        }, 200);
      });
  };

  // Verify refs on mount and signal when ready
  useEffect(() => {
    if (!showCamera) return;

    console.log('🔍 [DEBUG] FaceCameraModal useEffect - verifying refs:', {
      hasVideoRef: !!videoRef.current,
      hasCanvasRef: !!canvasRef.current,
      videoId: videoRef.current?.id,
      canvasId: canvasRef.current?.id,
    });
    
    if (videoRef.current && canvasRef.current) {
      console.log('✅ [DEBUG] Both refs ready, calling onVideoReady callback');
      onVideoReady?.();
    }
  }, [videoRef, canvasRef, onVideoReady, showCamera]);

  return (
    <motion.div key="face-camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="space-y-4">
        {!showCamera ? (
          // Step 1: Email Input
          <>
            <div className="p-6 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Xác thực với Email
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="faceEmail" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="w-4 h-4" />
                    Địa chỉ Email
                  </label>
                  <input
                    id="faceEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && handleContinueToCamera()}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Email sẽ được dùng để xác minh khuôn mặt của bạn
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToCamera}
                    className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
                  >
                    Tiếp tục → Chụp hình
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Step 2: Camera Capture
          <>
            <div
              style={{
                backgroundColor: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #e5e7eb',
                height: '320px',
                width: '100%',
                position: 'relative',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                onLoadedMetadata={handleVideoLoadedMetadata}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: 'black',
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
                onClick={handleBackToEmail}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                ← Quay lại
              </button>
              <button
                type="button"
                onClick={onCapture}
                disabled={isLoading}
                className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Chụp
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
