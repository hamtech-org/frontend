import React, { useState } from 'react';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import { Loader, Heading, View, Button, Text } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react-liveness/styles.css';
import '@aws-amplify/ui-react/styles.css';
import { AlertCircle } from 'lucide-react';

interface AwsFaceLivenessComponentProps {
  sessionId: string;
  region?: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
}

export const AwsFaceLivenessComponent: React.FC<AwsFaceLivenessComponentProps> = ({
  sessionId,
  region = 'us-east-1',
  onSuccess,
  onCancel,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Handle analysis completion
  const handleAnalysisComplete = async () => {
    console.log('✅ [DEBUG] Face liveness analysis complete, calling onSuccess callback...');
    try {
      setIsAnalyzing(true);
      await onSuccess();
      setSuccessMessage('✅ Xác thực khuôn mặt thành công!');
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 1500);
    } catch (err: unknown) {
      console.error('❌ [DEBUG] onSuccess callback failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Không xác định được lỗi';
      setError(`Lỗi xử lý: ${errorMsg}`);
      setIsAnalyzing(false);
    }
  };

  // Helper: Extract error message from various error formats
  const extractErrorMessage = (err: any): string => {
    console.log('🔍 [DEBUG] Full error object:', err);
    console.log('🔍 [DEBUG] Error keys:', Object.keys(err || {}));
    
    // Try common error properties
    if (err?.message) return err.message;
    if (err?.msg) return err.msg;
    if (err?.error?.message) return err.error.message;
    if (err?.toString && typeof err.toString === 'function') {
      const str = err.toString();
      if (str && str !== '[object Object]') return str;
    }
    
    // Check if it's a string representation
    if (typeof err === 'string') return err;
    
    // Parse based on error type hints
    if (err?.code) return `Lỗi (${err.code})`;
    if (err?.name) return `${err.name}`;
    
    // Default
    return 'Lỗi xác thực khuôn mặt không xác định. Vui lòng thử lại.';
  };

  // Handle AWS errors with better extraction
  const handleError = (err: any) => {
    console.error('🔥 [LIVENESS] AWS error occurred');
    const errorMsg = extractErrorMessage(err);
    console.error('✅ [LIVENESS] Extracted error message:', errorMsg);
    setError(errorMsg);
  };

  // Session ID validation
  if (!sessionId) {
    return (
      <View className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
        <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <Heading level={3} className="text-red-600 mb-4">
            Lỗi Phiên
          </Heading>
          <Text>SessionId không hợp lệ. Vui lòng thử lại.</Text>
          <Button onClick={onCancel} variation="primary" className="mt-6 w-full">
            Hủy
          </Button>
        </View>
      </View>
    );
  }
  // Show success state
  if (successMessage) {
    return (
      <View className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
        <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-pulse">
          <Heading level={2} className="text-green-600 mb-4">
            {successMessage}
          </Heading>
          <Text className="text-gray-600 dark:text-gray-300">
            Đang hoàn tất thiết lập...
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    const isNetworkError = error.toLowerCase().includes('network') || 
                          error.toLowerCase().includes('connect') ||
                          error.toLowerCase().includes('timeout');
    const isCameraError = error.toLowerCase().includes('camera') || 
                         error.toLowerCase().includes('permission');
    
    return (
      <View className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
        <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
          <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <Heading level={5} className="text-red-800 dark:text-red-300">
                  Lỗi Xác Thực
                </Heading>
                <Text className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {error}
                </Text>
              </div>
            </div>
          </View>

          {/* Helpful hints based on error type */}
          <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <Text className="text-xs text-blue-700 dark:text-blue-300">
              {isNetworkError && (
                <>💡 <strong>Mẹo:</strong> Hãy kiểm tra kết nối internet của bạn và thử lại.</>
              )}
              {isCameraError && (
                <>💡 <strong>Mẹo:</strong> Hãy kiểm tra quyền truy cập camera trong cài đặt trình duyệt.</>
              )}
              {!isNetworkError && !isCameraError && (
                <>💡 <strong>Mẹo:</strong> Hãy thử lại hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn.</>
              )}
            </Text>
          </View>

          <View className="flex gap-3">
            <Button
              onClick={() => {
                setError(null);
                window.location.reload();
              }}
              variation="primary"
              className="flex-1"
            >
              Thử Lại
            </Button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Hủy
            </button>
          </View>
        </View>
      </View>
    );
  }

  // Show analyzing state
  if (isAnalyzing) {
    return (
      <View className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
        <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <Loader size="large" className="mb-6" />
          <Heading level={3} className="mb-2">
            Đang Xử Lý
          </Heading>
          <Text className="text-gray-600 dark:text-gray-300">
            Vui lòng chờ trong khi chúng tôi xác minh...
          </Text>
        </View>
      </View>
    );
  }

  // Main liveness detection UI
  return (
    <View className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
      <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <View className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <Heading level={3} className="text-white">
            Xác Thực Khuôn Mặt
          </Heading>
          <Text className="text-blue-100 text-sm mt-2">
            Vui lòng theo các chỉ dẫn để hoàn tất xác thực
          </Text>
        </View>

        {/* Liveness Detector */}
        <View className="p-6">
          <FaceLivenessDetector
            sessionId={sessionId}
            region={region}
            onUserCancel={onCancel}
            onAnalysisComplete={handleAnalysisComplete}
            onError={handleError}
          />
        </View>

        {/* Footer */}
        <View className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <Text className="text-xs text-gray-600 dark:text-gray-400 text-center">
            💡 Hãy căn chỉnh khuôn mặt vào vòng tròn và thực hiện các chuyển động được yêu cầu
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AwsFaceLivenessComponent;
