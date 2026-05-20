import type { ICameraVideoTrack } from 'agora-rtc-react';

let pipVideo: HTMLVideoElement | null = null;
let pipContainer: HTMLDivElement | null = null;
let clonedTrack: MediaStreamTrack | null = null;
let pipOpenedByUs = false;
let openInFlight: Promise<boolean> | null = null;

export function isHostCameraPipSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    Boolean(document.pictureInPictureEnabled)
  );
}

export function isHostCameraPipActive(): boolean {
  return pipOpenedByUs && document.pictureInPictureElement != null;
}

async function exitAnyBrowserPip(): Promise<void> {
  if (!document.pictureInPictureElement) return;
  try {
    await document.exitPictureInPicture();
  } catch {
    /* noop */
  }
}

function waitForVideoElement(container: HTMLElement, timeoutMs = 5000): Promise<HTMLVideoElement> {
  const found = container.querySelector('video');
  if (found) return Promise.resolve(found);

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error('Không tìm thấy thẻ video cho PiP'));
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const v = container.querySelector('video');
      if (v) {
        window.clearTimeout(timer);
        observer.disconnect();
        resolve(v);
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  });
}

function bindLeaveHandler(video: HTMLVideoElement): void {
  video.addEventListener(
    'leavepictureinpicture',
    () => {
      pipOpenedByUs = false;
      void closeHostCameraPip();
    },
    { once: true },
  );
}

function cleanupDom(): void {
  clonedTrack?.stop();
  clonedTrack = null;
  if (pipVideo) {
    pipVideo.srcObject = null;
    pipVideo.remove();
  }
  pipVideo = null;
  pipContainer?.remove();
  pipContainer = null;
}

async function openWithAgoraPlay(cam: ICameraVideoTrack): Promise<void> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:640px;height:360px;overflow:hidden;pointer-events:none;';
  document.body.appendChild(container);
  pipContainer = container;

  cam.stop();
  cam.play(container);

  const video = await waitForVideoElement(container);
  video.muted = true;
  video.playsInline = true;
  await video.play().catch(() => {});
  await video.requestPictureInPicture();
  pipVideo = video;
  pipOpenedByUs = true;
  bindLeaveHandler(video);
}

async function openWithClone(cam: ICameraVideoTrack): Promise<void> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.width = 640;
  video.height = 360;
  video.style.cssText =
    'position:fixed;left:-9999px;top:0;width:640px;height:360px;object-fit:cover;pointer-events:none;';
  document.body.appendChild(video);

  clonedTrack = cam.getMediaStreamTrack().clone();
  video.srcObject = new MediaStream([clonedTrack]);
  await video.play();
  await video.requestPictureInPicture();
  pipVideo = video;
  pipOpenedByUs = true;
  bindLeaveHandler(video);
}

async function doOpenHostCameraPip(cam: ICameraVideoTrack): Promise<boolean> {
  if (!isHostCameraPipSupported()) {
    console.warn('[camera-pip] Trình duyệt không hỗ trợ Picture-in-Picture');
    return false;
  }

  if (isHostCameraPipActive()) return true;

  await closeHostCameraPip();
  await exitAnyBrowserPip();

  try {
    await openWithAgoraPlay(cam);
    return true;
  } catch (agoraErr) {
    console.warn('[camera-pip] Agora play PiP thất bại, thử clone track', agoraErr);
    cleanupDom();
    await exitAnyBrowserPip();
    try {
      await openWithClone(cam);
      return true;
    } catch (cloneErr) {
      console.warn('[camera-pip] Không mở được PiP', cloneErr);
      pipOpenedByUs = false;
      cleanupDom();
      return false;
    }
  }
}

/** Cửa sổ PiP camera thô — chỉ trên máy host, một cửa sổ tại một thời điểm. */
export async function openHostCameraPip(cam: ICameraVideoTrack): Promise<boolean> {
  if (openInFlight) return openInFlight;
  openInFlight = doOpenHostCameraPip(cam).finally(() => {
    openInFlight = null;
  });
  return openInFlight;
}

export async function closeHostCameraPip(): Promise<void> {
  pipOpenedByUs = false;
  await exitAnyBrowserPip();
  cleanupDom();
}

/** Gỡ camera khỏi DOM PiP để play lại preview studio / publish Agora. */
export async function restoreHostCameraTrack(cam: ICameraVideoTrack): Promise<void> {
  try {
    cam.stop();
  } catch {
    /* noop */
  }
  await cam.setEnabled(true);
}
