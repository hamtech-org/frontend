/** Worker vẽ composite lên OffscreenCanvas — không bị throttle khi tab host ở background. */

type LivePipRect = { nx: number; ny: number; nw: number };

const LIVE_PIP_ASPECT = 4 / 3;
const DRAW_INTERVAL_MS = 33;

type InitMsg = {
  type: 'init';
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  pip: LivePipRect;
};

type SourcesMsg = {
  type: 'sources';
  screen: ReadableStream<VideoFrame>;
  cam: ReadableStream<VideoFrame>;
};

type PipMsg = { type: 'pip'; pip: LivePipRect };
type StopMsg = { type: 'stop' };

type WorkerInMsg = InitMsg | SourcesMsg | PipMsg | StopMsg;

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let canvasW = 1280;
let canvasH = 720;
let pip: LivePipRect = { nx: 0.76, ny: 0.72, nw: 0.22 };

let latestScreen: VideoFrame | null = null;
let latestCam: VideoFrame | null = null;

let drawTimer: ReturnType<typeof setInterval> | null = null;
let screenAbort: AbortController | null = null;
let camAbort: AbortController | null = null;
let drewFirstFrame = false;

function replaceFrame(prev: VideoFrame | null, next: VideoFrame): VideoFrame {
  prev?.close();
  return next;
}

async function pumpFrames(
  stream: ReadableStream<VideoFrame>,
  signal: AbortSignal,
  onFrame: (frame: VideoFrame) => void,
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done || signal.aborted) break;
      if (value) onFrame(value);
    }
  } catch {
    /* aborted */
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}

function drawContain(
  c: OffscreenCanvasRenderingContext2D,
  frame: VideoFrame,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const vw = frame.displayWidth;
  const vh = frame.displayHeight;
  if (!vw || !vh) return;
  const scale = Math.min(dw / vw, dh / vh);
  const w = vw * scale;
  const h = vh * scale;
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;
  c.drawImage(frame, x, y, w, h);
}

function drawRoundedFrame(
  c: OffscreenCanvasRenderingContext2D,
  frame: VideoFrame,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const vw = frame.displayWidth;
  const vh = frame.displayHeight;
  if (!vw || !vh) return;

  c.save();
  c.beginPath();
  c.roundRect(x, y, w, h, radius);
  c.clip();

  const scale = Math.max(w / vw, h / vh);
  const sw = vw * scale;
  const sh = vh * scale;
  const sx = x + (w - sw) / 2;
  const sy = y + (h - sh) / 2;
  c.drawImage(frame, sx, sy, sw, sh);
  c.restore();

  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(x, y, w, h, radius);
  c.stroke();
  c.restore();
}

function drawFrame(): void {
  if (!ctx) return;
  const W = canvasW;
  const H = canvasH;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, W, H);

  if (latestScreen) {
    drawContain(ctx, latestScreen, 0, 0, W, H);
  }

  if (latestCam) {
    const pw = pip.nw * W;
    const ph = (pip.nw / LIVE_PIP_ASPECT) * W;
    const px = pip.nx * W;
    const py = pip.ny * H;
    drawRoundedFrame(ctx, latestCam, px, py, pw, ph, 10);
  }

  if (!drewFirstFrame && latestScreen && latestCam) {
    drewFirstFrame = true;
    self.postMessage({ type: 'first-frame' });
  }
}

function startDrawLoop(): void {
  if (drawTimer != null) return;
  drawTimer = setInterval(drawFrame, DRAW_INTERVAL_MS);
}

function stopDrawLoop(): void {
  if (drawTimer != null) {
    clearInterval(drawTimer);
    drawTimer = null;
  }
}

function stopSources(): void {
  screenAbort?.abort();
  camAbort?.abort();
  screenAbort = null;
  camAbort = null;
}

function cleanupFrames(): void {
  latestScreen?.close();
  latestCam?.close();
  latestScreen = null;
  latestCam = null;
  drewFirstFrame = false;
}

function handleStop(): void {
  stopDrawLoop();
  stopSources();
  cleanupFrames();
  ctx = null;
}

self.onmessage = (ev: MessageEvent<WorkerInMsg>) => {
  const msg = ev.data;
  switch (msg.type) {
    case 'init': {
      canvasW = msg.width;
      msg.canvas.width = msg.width;
      msg.canvas.height = msg.height;
      canvasH = msg.height;
      const c = msg.canvas.getContext('2d');
      if (!c) return;
      ctx = c;
      pip = msg.pip;
      drewFirstFrame = false;
      startDrawLoop();
      break;
    }
    case 'sources': {
      drewFirstFrame = false;
      stopSources();
      screenAbort = new AbortController();
      camAbort = new AbortController();
      void pumpFrames(msg.screen, screenAbort.signal, (f) => {
        latestScreen = replaceFrame(latestScreen, f);
      });
      void pumpFrames(msg.cam, camAbort.signal, (f) => {
        latestCam = replaceFrame(latestCam, f);
      });
      break;
    }
    case 'pip':
      pip = msg.pip;
      break;
    case 'stop':
      handleStop();
      break;
    default:
      break;
  }
};
