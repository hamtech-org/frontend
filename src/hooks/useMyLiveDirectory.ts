import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import type { LiveSessionListItem } from '@/store/api/liveApi';
import type { RootState } from '@/store/store';
import { socketService } from '@/services/socket';

export const LIVE_AS_VIEWER_PARAM = 'asViewer';

function queryHostPublishingElsewhere(sessionId: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const socket = socketService.getSocket();
      socket.emit(
        'live:host-publish-query',
        { sessionId },
        (res: { publishingElsewhere?: boolean }) => {
          resolve(Boolean(res?.publishingElsewhere));
        },
      );
    } catch {
      resolve(false);
    }
  });
}

export function useMyLiveDirectory(sessions: LiveSessionListItem[] | undefined) {
  const currentUserId = useSelector((s: RootState) => s.auth.user?.userId ?? '');
  const [hostPublishingElsewhere, setHostPublishingElsewhere] = useState(false);

  const mySession = useMemo(
    () => sessions?.find((s) => s.hostUserId === currentUserId && s.status === 'live') ?? null,
    [sessions, currentUserId],
  );

  const publicSessions = useMemo(
    () => sessions?.filter((s) => s.hostUserId !== currentUserId) ?? [],
    [sessions, currentUserId],
  );

  const refreshPublishStatus = useCallback(async () => {
    if (!mySession) {
      setHostPublishingElsewhere(false);
      return;
    }
    const elsewhere = await queryHostPublishingElsewhere(mySession.sessionId);
    setHostPublishingElsewhere(elsewhere);
  }, [mySession]);

  useEffect(() => {
    void refreshPublishStatus();
  }, [refreshPublishStatus]);

  useEffect(() => {
    if (!mySession) return;

    const onMyHostPublishing = (raw: unknown) => {
      const p = raw as { sessionId?: string };
      if (p?.sessionId !== mySession.sessionId) return;
      void refreshPublishStatus();
    };

    socketService.on('live:my-host-publishing', onMyHostPublishing);
    return () => {
      socketService.off('live:my-host-publishing', onMyHostPublishing);
    };
  }, [mySession, refreshPublishStatus]);

  const showMyLiveViewerButton = Boolean(mySession && hostPublishingElsewhere);
  const showResumeHostButton = Boolean(mySession && !hostPublishingElsewhere);

  return {
    mySession,
    publicSessions,
    showMyLiveViewerButton,
    showResumeHostButton,
    hasMyActiveSession: Boolean(mySession),
  };
}
