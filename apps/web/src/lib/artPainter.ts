import { createArtJob, type ArtJob, type ArtRecipe } from "@/lib/folderArt";

/**
 * One painter for the whole page.
 *
 * Every surface that wants generated artwork queues it here and the queue
 * spends a few milliseconds a frame on it, so a wall of application cards
 * never stalls the main thread. Finished paintings are cached by recipe, seed
 * and size — and because NN folds seeds into a small set, a screen of 34
 * cards costs a bounded number of paintings rather than thirty-four.
 *
 * This lives apart from any one component on purpose. Two components with
 * two private queues would each claim their own slice of every frame, and
 * together they would spend twice the budget and jank exactly when the most
 * is on screen.
 */
const artCache = new Map<string, Promise<HTMLCanvasElement>>();
const queue: { job: ArtJob; priority: number; done: (c: HTMLCanvasElement) => void }[] = [];
let pumping = false;

/** Milliseconds of each frame the painter is allowed to spend. */
const BUDGET_MS = 8;

/**
 * Rows painted between clock checks.
 *
 * The budget above is the real guard; this only decides how often the loop
 * stops to look at it. At four rows a card took far longer than it needed to
 * — most of the budget went on `performance.now()` rather than on pixels —
 * and a stack of thirty-four applications sat half-blank for seconds.
 */
const ROWS_PER_SLICE = 14;

function pump() {
  if (pumping) return;
  pumping = true;
  const tick = () => {
    const until = performance.now() + BUDGET_MS;
    while (queue.length && performance.now() < until) {
      const head = queue[0]!;
      if (head.job.step(ROWS_PER_SLICE)) {
        queue.shift();
        const canvas = document.createElement("canvas");
        canvas.width = head.job.width;
        canvas.height = head.job.height;
        const context = canvas.getContext("2d");
        if (context) {
          context.putImageData(
            new ImageData(head.job.pixels, canvas.width, canvas.height),
            0,
            0,
          );
        }
        head.done(canvas);
      }
    }
    if (queue.length) requestAnimationFrame(tick);
    else pumping = false;
  };
  requestAnimationFrame(tick);
}

/**
 * Queue one painting. Lower `priority` paints first.
 *
 * NN uses 0 for what the founder is looking at — a folder's back panel, the
 * carousel card at the centre — and 1 for everything behind glass or off to
 * the side, which can afford to arrive a beat later.
 */
export function paintArt(
  recipe: ArtRecipe,
  seed: number,
  width: number,
  height: number,
  priority: number,
): Promise<HTMLCanvasElement> {
  const key = JSON.stringify([recipe, seed, width, height]);
  let pending = artCache.get(key);
  if (!pending) {
    pending = new Promise<HTMLCanvasElement>((done) => {
      // Never jump ahead of the job already in progress: its pixel buffer is
      // half written, and restarting it would throw that work away.
      let at = queue.length;
      while (at > 1 && queue[at - 1]!.priority > priority) at -= 1;
      queue.splice(at, 0, { job: createArtJob(width, height, recipe, seed), priority, done });
      pump();
    });
    artCache.set(key, pending);
  }
  return pending;
}

/** Test seam: forgets every cached painting. Never called by the product. */
export function resetArtPainterForTests(): void {
  artCache.clear();
  queue.length = 0;
  pumping = false;
}
