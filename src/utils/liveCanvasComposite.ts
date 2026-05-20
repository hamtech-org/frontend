import AgoraRTC, { type ICameraVideoTrack, type ILocalVideoTrack } from 'agora-rtc-react';

/** Loại vùng capture từ getDisplayMedia (Chrome/Edge). */
export type ScreenShareSurface = 'monitor' | 'window' | 'browser' | 'unknown';

export function getScreenShareSurface(track: ILocalVideoTrack): ScreenShareSurface {
  const raw = track.getMediaStreamTrack().getSettings().displaySurface;
  if (raw === 'monitor' || raw === 'window' || raw === 'browser') return raw;
  return 'unknown';
}

/** Full màn hình → PiP OS; tab/window/unknown → composite cam góc. */
export function shouldUseOsCameraPip(surface: ScreenShareSurface): boolean {
  return surface === 'monitor';
}

/** PiP camera: tọa độ & kích thước chuẩn hóa (0–1) theo canvas publish. */
export type LivePipRect = {
  nx: number;
  ny: number;
  nw: number;
};

export const LIVE_COMPOSITE_WIDTH = 1280;
export const LIVE_COMPOSITE_HEIGHT = 720;
export const LIVE_PIP_MIN_NW = 0.12;
export const LIVE_PIP_MAX_NW = 0.35;
export const LIVE_PIP_DEFAULT_NW = 0.22;
export const LIVE_PIP_MARGIN = 0.02;
export const LIVE_PIP_ASPECT = 4 / 3;

declare class MediaStreamTrackProcessor<T = VideoFrame> {
  constructor(init: { track: MediaStreamTrack });
  readonly readable: ReadableStream<T>;
}

type WorkerOutMsg = { type: 'first-frame' };

export function clampPipRect(
  pip: LivePipRect,
  canvasAspect = LIVE_COMPOSITE_WIDTH / LIVE_COMPOSITE_HEIGHT,
): LivePipRect {
  const nw = Math.min(LIVE_PIP_MAX_NW, Math.max(LIVE_PIP_MIN_NW, pip.nw));
  const nh = (nw / LIVE_PIP_ASPECT) * canvasAspect;
  let nx = pip.nx;
  let ny = pip.ny;
  nx = Math.min(1 - LIVE_PIP_MARGIN - nw, Math.max(LIVE_PIP_MARGIN, nx));
  ny = Math.min(1 - LIVE_PIP_MARGIN - nh, Math.max(LIVE_PIP_MARGIN, ny));
  return { nx, ny, nw };
}

export function defaultPipRectBottomRight(): LivePipRect {
  const nw = LIVE_PIP_DEFAULT_NW;
  const nh = (nw / LIVE_PIP_ASPECT) * (LIVE_COMPOSITE_WIDTH / LIVE_COMPOSITE_HEIGHT);
  return clampPipRect({
    nw,
    nx: 1 - LIVE_PIP_MARGIN - nw,
    ny: 1 - LIVE_PIP_MARGIN - nh,
  });
}

export class LiveCanvasCompositor {
  private readonly canvas: HTMLCanvasElement;
  private worker: Worker | null = null;
  private pip: LivePipRect = defaultPipRectBottomRight();
  private captureStream: MediaStream | null = null;
  private customTrack: ILocalVideoTrack | null = null;
  private clonedScreen: MediaStreamTrack | null = null;
  private clonedCam: MediaStreamTrack | null = null;
  private offscreenTransferred = false;
  private firstFrameWaiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = LIVE_COMPOSITE_WIDTH;
    this.canvas.height = LIVE_COMPOSITE_HEIGHT;
  }

  getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  mountPreview(parent: HTMLElement): void {
    const canvas = this.canvas;
    canvas.className = 'block h-full w-full';
    canvas.style.display = 'block';
    if (canvas.parentElement !== parent) {
      parent.replaceChildren(canvas);
    }
  }

  setPip(pip: LivePipRect): void {
    this.pip = clampPipRect(pip);
    this.worker?.postMessage({ type: 'pip', pip: this.pip });
  }

  getPip(): LivePipRect {
    return this.pip;
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    this.worker = new Worker(new URL('./liveCompositor.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = (ev: MessageEvent<WorkerOutMsg>) => {
      if (ev.data.type === 'first-frame') {
        for (const w of this.firstFrameWaiters) w.resolve();
        this.firstFrameWaiters = [];
      }
    };

    return this.worker;
  }

  private initOffscreen(): void {
    if (this.offscreenTransferred) return;

    const worker = this.ensureWorker();
    const offscreen = this.canvas.transferControlToOffscreen();
    worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width: LIVE_COMPOSITE_WIDTH,
        height: LIVE_COMPOSITE_HEIGHT,
        pip: this.pip,
      },
      [offscreen],
    );
    this.offscreenTransferred = true;
  }

  /** Gắn nguồn qua clone MediaStreamTrack — không đụng Agora track gốc. */
  async setSources(screen: ILocalVideoTrack, cam: ICameraVideoTrack): Promise<void> {
    this.stopClonedTracks();

    if (typeof MediaStreamTrackProcessor === 'undefined') {
      throw new Error('Trình duyệt không hỗ trợ MediaStreamTrackProcessor (cần Chrome/Edge 94+)');
    }

    this.clonedScreen = screen.getMediaStreamTrack().clone();
    this.clonedCam = cam.getMediaStreamTrack().clone();

    this.initOffscreen();

    const screenProcessor = new MediaStreamTrackProcessor({ track: this.clonedScreen });
    const camProcessor = new MediaStreamTrackProcessor({ track: this.clonedCam });

    this.ensureWorker().postMessage(
      {
        type: 'sources',
        screen: screenProcessor.readable,
        cam: camProcessor.readable,
      },
      [screenProcessor.readable, camProcessor.readable],
    );
  }

  private waitFirstFrame(timeoutMs = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
      const entry = {
        resolve: () => resolve(),
        reject: (e: Error) => reject(e),
      };
      const timer = window.setTimeout(() => {
        const idx = this.firstFrameWaiters.indexOf(entry);
        if (idx >= 0) this.firstFrameWaiters.splice(idx, 1);
        entry.reject(new Error('Composite không nhận được frame đầu tiên'));
      }, timeoutMs);
      const wrapped = {
        resolve: () => {
          window.clearTimeout(timer);
          const idx = this.firstFrameWaiters.indexOf(wrapped);
          if (idx >= 0) this.firstFrameWaiters.splice(idx, 1);
          entry.resolve();
        },
        reject: (e: Error) => {
          window.clearTimeout(timer);
          const idx = this.firstFrameWaiters.indexOf(wrapped);
          if (idx >= 0) this.firstFrameWaiters.splice(idx, 1);
          entry.reject(e);
        },
      };
      this.firstFrameWaiters.push(wrapped);
    });
  }

  startCapture(): void {
    if (!this.captureStream) {
      this.captureStream = this.canvas.captureStream(30);
    }
  }

  async preparePublishTrack(): Promise<ILocalVideoTrack> {
    await this.waitFirstFrame();
    this.startCapture();
    return this.ensureCustomVideoTrack();
  }

  private stopClonedTracks(): void {
    this.clonedScreen?.stop();
    this.clonedCam?.stop();
    this.clonedScreen = null;
    this.clonedCam = null;
  }

  stop(): void {
    for (const w of this.firstFrameWaiters) {
      w.reject(new Error('Compositor stopped'));
    }
    this.firstFrameWaiters = [];

    this.worker?.postMessage({ type: 'stop' });
    this.worker?.terminate();
    this.worker = null;
    this.offscreenTransferred = false;

    this.stopClonedTracks();

    this.captureStream?.getTracks().forEach((t) => t.stop());
    this.captureStream = null;
    this.customTrack?.close();
    this.customTrack = null;
  }

  async ensureCustomVideoTrack(): Promise<ILocalVideoTrack> {
    if (!this.captureStream) this.startCapture();
    const msTrack = this.captureStream!.getVideoTracks()[0];
    if (!msTrack) throw new Error('Không tạo được stream từ canvas');
    if (!this.customTrack) {
      this.customTrack = AgoraRTC.createCustomVideoTrack({
        mediaStreamTrack: msTrack,
        optimizationMode: 'motion',
      });
    }
    return this.customTrack;
  }
}
