import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Globe, Lock, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import {
  useGetCommunityByInviteCodeQuery,
  useAcceptInviteLinkMutation,
} from '@/store/api/communityApi';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

export default function JoinCommunityPage() {
  const { inviteCode = '' } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();

  const {
    data: communityRes,
    isLoading,
    isError,
    error,
  } = useGetCommunityByInviteCodeQuery(inviteCode, {
    skip: !inviteCode,
  });
  const [acceptInviteLink, { isLoading: isJoining }] = useAcceptInviteLinkMutation();
  const [joinSuccess, setJoinSuccess] = useState(false);

  const community = communityRes?.data;
  const isAlreadyMember = community?.viewerRole !== null && community?.viewerRole !== undefined;

  const handleJoin = async () => {
    if (!inviteCode) return;
    try {
      await acceptInviteLink(inviteCode).unwrap();
      setJoinSuccess(true);
      toast.success('Gia nhập cộng đồng thành công!');
      setTimeout(() => {
        navigate(`/communities/${community?.groupId}`);
      }, 1500);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể gia nhập cộng đồng này');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Đang xác thực liên kết mời...
        </p>
      </div>
    );
  }

  if (isError || !community) {
    const errMsg =
      (error as any)?.data?.message || 'Đường liên kết mời này đã hết hạn hoặc không tồn tại.';
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl border border-red-500/10 bg-red-500/5 backdrop-blur-xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Liên kết không hợp lệ</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{errMsg}</p>
          </div>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold h-11 rounded-2xl flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-md w-full rounded-3xl border border-border bg-card/65 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-blue-500/5">
        {/* Cover image or fallback gradient */}
        <div className="h-36 w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700">
          {community.coverUrl && (
            <>
              <img
                src={community.coverUrl}
                alt={community.name}
                className="w-full h-full object-cover blur-[2px] scale-105 opacity-90"
              />
              <div className="absolute inset-0 bg-black/25" />
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 h-9 w-9 rounded-full bg-black/20 hover:bg-black/45 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 pt-0 relative flex flex-col items-center">
          {/* Avatar overlap */}
          <div className="w-24 h-24 rounded-3xl border-4 border-card bg-card shadow-lg flex items-center justify-center overflow-hidden -mt-12 shrink-0 z-10">
            {community.avatar ? (
              <img
                src={community.avatar}
                alt={community.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-black text-blue-600 select-none">
                {community.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="text-center mt-4 w-full">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
              {community.category}
            </span>

            <h2 className="text-2xl font-black text-foreground mt-2 tracking-tight line-clamp-2 px-2">
              {community.name}
            </h2>

            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-muted-foreground mt-3">
              <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-xl">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                {community.memberCount.toLocaleString('vi-VN')} thành viên
              </span>
              <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-xl">
                {community.type === 'public' ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-green-500" />
                    Công khai
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Riêng tư
                  </>
                )}
              </span>
            </div>

            <div className="mt-5 text-sm text-muted-foreground leading-relaxed px-2 bg-muted/30 border border-border/40 p-4 rounded-2xl line-clamp-3 text-left">
              {community.description ||
                'Không có mô tả cho cộng đồng này. Mời bạn tham gia để cùng kết nối.'}
            </div>
          </div>

          <div className="w-full mt-6">
            {joinSuccess ? (
              <div className="w-full py-3 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/25 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                <CheckCircle className="w-5 h-5 animate-bounce" />
                Gia nhập thành công! Đang chuyển hướng...
              </div>
            ) : isAlreadyMember ? (
              <Button
                onClick={() => navigate(`/communities/${community.groupId}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-2xl"
              >
                Bạn đã là thành viên - Vào nhóm
              </Button>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-2xl text-sm relative group overflow-hidden"
              >
                {isJoining ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </div>
                ) : (
                  <>
                    Chấp nhận lời mời & Gia nhập
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
