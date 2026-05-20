import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-react';

export function remoteUsersWithVideo(client: IAgoraRTCClient): IAgoraRTCRemoteUser[] {
  return client.remoteUsers.filter((u) => u.hasVideo || u.videoTrack != null);
}

export function remoteVideoUids(client: IAgoraRTCClient): number[] {
  return remoteUsersWithVideo(client)
    .map((u) => Number(u.uid))
    .filter((n) => Number.isFinite(n));
}

export async function subscribeLiveRemote(
  client: IAgoraRTCClient,
  user: IAgoraRTCRemoteUser,
  mediaType: 'audio' | 'video',
): Promise<void> {
  try {
    if (mediaType === 'audio') {
      if (!user.audioTrack) await client.subscribe(user, 'audio');
      await user.audioTrack?.play();
      return;
    }
    if (!user.videoTrack) {
      await client.subscribe(user, 'video');
    }
  } catch {
    /* remote left or track đang đổi (screen → camera) */
  }
}

export async function ensureRemoteTracksSubscribed(client: IAgoraRTCClient): Promise<void> {
  for (const user of client.remoteUsers) {
    try {
      if (user.hasAudio && !user.audioTrack) {
        await client.subscribe(user, 'audio');
      }
      if (user.audioTrack) {
        await user.audioTrack.play();
      }
      if (user.hasVideo && !user.videoTrack) {
        await client.subscribe(user, 'video');
      }
    } catch {
      /* user may have left */
    }
  }
}

export function placeAllLiveRemoteVideos(
  client: IAgoraRTCClient,
  wrapId: (uid: string | number) => string,
  place: (user: IAgoraRTCRemoteUser, el: HTMLDivElement) => void,
): void {
  for (const user of remoteUsersWithVideo(client)) {
    const wrap = document.getElementById(wrapId(user.uid));
    if (wrap && user.videoTrack) place(user, wrap as HTMLDivElement);
  }
}

/** Sau khi host đổi track (tắt share → camera), subscribe lại và gắn vào DOM. */
export async function resyncLiveRemoteVideos(
  client: IAgoraRTCClient,
  wrapId: (uid: string | number) => string,
  place: (user: IAgoraRTCRemoteUser, el: HTMLDivElement) => void,
): Promise<void> {
  await ensureRemoteTracksSubscribed(client);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => placeAllLiveRemoteVideos(client, wrapId, place));
  });
}
