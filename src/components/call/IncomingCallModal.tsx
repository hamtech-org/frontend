import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCallContext } from '@/contexts/CallContext';
import type { RootState } from '@/store/store';

export default function IncomingCallModal() {
  const { acceptCall, rejectCall } = useCallContext();
  const { status, callType, callerName, callerId } = useSelector(
    (state: RootState) => state.call,
  );

  const isVisible = status === 'incoming-ringing';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-[360px] rounded-3xl bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 p-8 text-center shadow-2xl"
          >
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold">
                {(callerName || callerId || '?')[0].toUpperCase()}
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">
              {callerName || callerId}
            </h3>
            <p className="text-sm text-white/50 mb-8 flex items-center justify-center gap-2">
              {callType === 'video' ? (
                <Video className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              Cuộc gọi {callType === 'video' ? 'video' : 'thoại'} đến...
            </p>

            <div className="flex items-center justify-center gap-8">
              <button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg shadow-red-600/30"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>

              <button
                onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg shadow-green-500/30"
              >
                <Phone className="w-7 h-7 text-white" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
