import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Camera, ArrowRight, Check } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ethereal-bg dark:bg-midnight-bg">
      <div className="w-full max-w-xl space-y-12">
        <div className="flex items-center justify-between gap-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-blue-600' : 'bg-black/5 dark:bg-white/5'
              }`}
            />
          ))}
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-extrabold tracking-tight">
              {step === 1 && 'Bắt đầu với tên của bạn.'}
              {step === 2 && 'Giới thiệu về bản thân.'}
              {step === 3 && 'Bạn đã sẵn sàng!'}
            </h2>
            <p className="text-muted-foreground text-lg">
              {step === 1 && 'Đây là cách bạn xuất hiện với mọi người trong cộng đồng.'}
              {step === 2 && 'Một vài dòng giới thiệu giúp mọi người hiểu bạn hơn.'}
              {step === 3 && 'Chào mừng đến với hệ sinh thái HamTech.'}
            </p>
          </div>

          <div className="space-y-6">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Họ và tên"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none text-lg font-medium"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kể câu chuyện của bạn..."
                  rows={4}
                  className="w-full px-6 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none text-lg font-medium resize-none"
                />
                <div className="flex items-center gap-4 p-6 rounded-2xl border-2 border-dashed border-inherit hover:border-blue-600/40 transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold">Tải ảnh đại diện</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG hoặc WEBP. Tối đa 5MB.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 space-y-6"
              >
                <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center text-white shadow-xl shadow-green-500/20">
                  <Check className="w-12 h-12" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{name || 'Người dùng'}</p>
                  <p className="text-muted-foreground">Hồ sơ của bạn đã sẵn sàng.</p>
                </div>
              </motion.div>
            )}

            <button
              type="button"
              onClick={nextStep}
              disabled={step === 1 && !name}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-600/20 group"
            >
              {step === 3 ? 'Vào HamTech' : 'Tiếp tục'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
