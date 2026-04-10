import { motion } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface FaceCameraModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onCapture: () => Promise<void>;
  onCancel: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onVideoReady?: () => void;
}

export const FaceCameraModal = ({
  isOpen,
  isLoading,
  onCapture,
  onCancel,
  videoRef,
  canvasRef,
  onVideoReady,
}: FaceCameraModalProps) => {
  console.log('🎬 [DEBUG] FaceCameraModal render:', { isOpen, isLoading });
  
  if (!isOpen) {
    console.log('⚠️ [DEBUG] FaceCameraModal isOpen is false, returning null');
    return null;
  }

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
  }, [videoRef, canvasRef, onVideoReady]);

  return (
    <motion.div key="face-camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="space-y-4">
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
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onCapture}
            disabled={isLoading}
            className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
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
      </div>
    </motion.div>
  );
};
