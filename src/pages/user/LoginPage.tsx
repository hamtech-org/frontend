import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useVerifyLoginOtpMutation, useRegisterMutation, useVerifyEmailMutation, useFaceLoginMutation } from '@/store/api/authApi';
import logo from '@/assets/images/logo_tron.png';
import { LoginForm, type LoginFormValues, RegisterForm, type RegisterFormValues, OtpVerificationForm, type OtpFormValues, FaceCameraModal } from './components';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isLoginOtpPending, setIsLoginOtpPending] = useState(false);
  const [registrationOtpPending, setRegistrationOtpPending] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [recentEmails, setRecentEmails] = useState<string[]>(() => {
    const stored = localStorage.getItem('recentEmails');
    return stored ? JSON.parse(stored) : [];
  });

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mutations
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const [verifyLoginOtp, { isLoading: isVerifyingLoginOtp, error: verifyLoginOtpError }] = useVerifyLoginOtpMutation();
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();
  const [verifyEmail, { isLoading: isVerifying, error: verifyError }] = useVerifyEmailMutation();
  const [faceLogin, { isLoading: isFaceLogging }] = useFaceLoginMutation();

  // Login handlers
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data).unwrap();
      setRecentEmails((prev) => {
        const updated = [data.email, ...prev.filter((e) => e !== data.email)].slice(0, 3);
        localStorage.setItem('recentEmails', JSON.stringify(updated));
        return updated;
      });
      setLoginEmail(data.email);
      setIsLoginOtpPending(true);
    } catch (err) {
      console.error('Failed to login:', err);
    }
  };

  const onLoginOtpSubmit = async (data: OtpFormValues) => {
    try {
      await verifyLoginOtp({
        email: loginEmail,
        otp: data.otp,
      }).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Failed to verify login OTP:', err);
    }
  };

  // Register handlers
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await register(registerData).unwrap();
      setRegistrationEmail(data.email);
      setRegistrationOtpPending(true);
    } catch (err) {
      console.error('Failed to register:', err);
    }
  };

  const onRegisterOtpSubmit = async (data: OtpFormValues) => {
    try {
      await verifyEmail({
        email: registrationEmail,
        otp: data.otp,
      }).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Failed to verify email:', err);
    }
  };

  // Face login handlers
  const startFaceCamera = async () => {
    console.log('🎬 [DEBUG] startFaceCamera called');
    try {
      console.log('📹 [DEBUG] Requesting camera permission with constraints:', {
        video: { facingMode: 'user' },
        audio: false,
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      console.log('✅ [DEBUG] Camera stream obtained:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      console.log('🎬 [DEBUG] Setting cameraStream state');
      setCameraStream(stream);
      
      console.log('🎬 [DEBUG] Setting showFaceCamera to true, isVideoReady reset to false');
      setIsVideoReady(false);
      setShowFaceCamera(true);
    } catch (err) {
      console.error('❌ [DEBUG] Failed to access camera:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error details:', { type: err instanceof Error ? err.name : 'unknown', message: errorMessage });
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền của ứng dụng.');
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) return;

      context.drawImage(videoRef.current, 0, 0, 320, 240);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);

      setShowFaceCamera(false);

      await faceLogin({ image: imageData }).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Face login failed:', err);
      alert('Đăng nhập bằng khuôn mặt không thành công. Vui lòng thử lại.');
    }
  };

  const cancelFaceCamera = () => {
    console.log('❌ [DEBUG] cancelFaceCamera called');
    console.log('🛑 [DEBUG] Stopping all camera tracks');
    cameraStream?.getTracks().forEach((track) => {
      console.log('Stopping track:', { kind: track.kind, enabled: track.enabled });
      track.stop();
    });
    console.log('📭 [DEBUG] Clearing camera stream state');
    setCameraStream(null);
    console.log('📳 [DEBUG] Resetting isVideoReady');
    setIsVideoReady(false);
    console.log('🎬 [DEBUG] Closing camera modal');
    setShowFaceCamera(false);
  };

  // Wait for video element to be ready before attaching stream
  useEffect(() => {
    console.log('⏳ [DEBUG] Stream attachment useEffect triggered:', {
      showFaceCamera,
      cameraStreamExists: !!cameraStream,
      isVideoReady,
    });

    if (!showFaceCamera || !cameraStream || !isVideoReady) {
      console.log('⚠️ [DEBUG] not ready to attach stream:', {
        showFaceCamera,
        cameraStreamExists: !!cameraStream,
        isVideoReady,
      });
      return;
    }

    const video = videoRef.current;
    if (!video) {
      console.error('❌ [DEBUG] video element not found in ref');
      return;
    }

    console.log('🔌 [DEBUG] Attaching stream to video element');
    video.srcObject = cameraStream;
    console.log('✅ [DEBUG] Stream attached successfully');
    console.log('📊 [DEBUG] Video element state after attachment:', {
      hasStream: !!video.srcObject,
      paused: video.paused,
      ended: video.ended,
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState,
      networkState: video.networkState,
    });
  }, [showFaceCamera, cameraStream, isVideoReady]);

  // Cleanup stream on unmount
  useEffect(() => {
    console.log('🧹 [DEBUG] Cleanup useEffect - setting up cleanup function');
    return () => {
      console.log('🧹 [DEBUG] Cleanup running - stopping all tracks');
      cameraStream?.getTracks().forEach((track) => {
        console.log('Cleaning up track:', { kind: track.kind, enabled: track.enabled });
        track.stop();
      });
      if (videoRef.current) {
        console.log('🧹 [DEBUG] Clearing video ref srcObject');
        videoRef.current.srcObject = null;
      }
      console.log('✅ [DEBUG] Cleanup completed');
    };
  }, [cameraStream]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <img src={logo} alt="Zalogram" className="w-16 h-16 mx-auto mb-4" />
            <AnimatePresence mode="wait">
              <motion.div
                key={isRegister ? 'reg-title' : 'login-title'}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {isRegister ? 'Bắt đầu hành trình của bạn với chúng tôi.' : 'Chào mừng trở lại!'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {isRegister ? (
              <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RegisterForm
                  onSubmit={onRegisterSubmit}
                  isLoading={isRegistering}
                  error={registerError}
                  onLoginClick={() => setIsRegister(false)}
                />
              </motion.div>
            ) : registrationOtpPending ? (
              <motion.div key="register-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OtpVerificationForm
                  email={registrationEmail}
                  onSubmit={onRegisterOtpSubmit}
                  isLoading={isVerifying}
                  error={verifyError}
                  onBack={() => {
                    setRegistrationOtpPending(false);
                    setRegistrationEmail('');
                  }}
                />
              </motion.div>
            ) : isLoginOtpPending ? (
              <motion.div key="login-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OtpVerificationForm
                  email={loginEmail}
                  onSubmit={onLoginOtpSubmit}
                  isLoading={isVerifyingLoginOtp}
                  error={verifyLoginOtpError}
                  onBack={() => setIsLoginOtpPending(false)}
                />
              </motion.div>
            ) : showFaceCamera ? (
              <FaceCameraModal
                isOpen={showFaceCamera}
                isLoading={isFaceLogging}
                onCapture={captureFace}
                onCancel={cancelFaceCamera}
                videoRef={videoRef}
                canvasRef={canvasRef}
                onVideoReady={() => {
                  console.log('📞 [DEBUG] onVideoReady callback called from FaceCameraModal');
                  setIsVideoReady(true);
                }}
              />
            ) : (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoginForm
                  onSubmit={onLoginSubmit}
                  isLoading={isLoggingIn}
                  error={loginError}
                  onRegisterClick={() => setIsRegister(true)}
                  onFaceLoginClick={startFaceCamera}
                  isFaceLoggingIn={isFaceLogging}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
