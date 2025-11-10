interface Vec2d {
  x: number;
  y: number;
}

const zeroVec = (): Vec2d => ({ x: 0, y: 0 });
const vecAdd = (a: Vec2d, b: Vec2d): Vec2d => ({ x: a.x + b.x, y: a.y + b.y });
const vecMult = (scalar: number, vec: Vec2d) => ({
  x: vec.x * scalar,
  y: vec.y * scalar,
});
const vecSub = (a: Vec2d, b: Vec2d) => vecAdd(a, vecMult(-1, b));
const vecMag = (v: Vec2d) => Math.sqrt(v.x ** 2 + v.y ** 2);
const dist = (a: Vec2d, b: Vec2d) => vecMag(vecSub(a, b));

class Point {
  oldPos: Vec2d;
  pos: Vec2d;
  acc: Vec2d;

  isAncor: boolean = false;

  constructor(pos: Vec2d, isAncor: boolean = false) {
    this.isAncor = isAncor;
    this.pos = pos;
    this.oldPos = { ...pos };
    this.acc = zeroVec();
  }

  updatePos(deltaTime: number) {
    if (this.isAncor) return;

    let v = vecSub(this.pos, this.oldPos);
    this.oldPos = { ...this.pos };

    this.pos = vecAdd(
      this.pos,
      vecAdd(v, vecMult(deltaTime * deltaTime, this.acc))
    );
  }
}

class Rope {
  points: Point[];
  length: number;
  restDist: number;

  constructor(pos: Vec2d, nPoints: number, length: number) {
    this.points = Array.from(
      { length: nPoints },
      (_, i) =>
        new Point({ x: pos.x + (length / nPoints) * i, y: pos.y }, i === 0)
    );

    this.length = length;
    this.restDist = length / nPoints;
  }

  updatePosns(deltaTime: number) {
    for (const point of this.points) {
      if (point.isAncor) continue;
      point.acc.y = 20;
    }

    for (const point of this.points) {
      point.updatePos(deltaTime);
    }

    this.solveConstraints(10);
  }

  solveConstraints(nIters: number) {
    for (let iter = 0; iter < nIters; iter++) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const a = this.points[i];
        const b = this.points[i + 1];

        const dp = vecSub(b.pos, a.pos);

        const dist = vecMag(dp);

        const diff = (dist - this.restDist) / dist;

        if (a.isAncor && b.isAncor) {
          continue;
        }
        if (a.isAncor) {
          const offset = vecMult(diff, dp);
          if (!b.isAncor) b.pos = vecSub(b.pos, offset);
        } else if (b.isAncor) {
          const offset = vecMult(diff, dp);
          if (!a.isAncor) a.pos = vecAdd(a.pos, offset);
        } else {
          if (!a.isAncor) {
            const offset = vecMult(diff * 0.5, dp);
            a.pos = vecAdd(a.pos, offset);
          }
          if (!b.isAncor) {
            const offset = vecMult(diff * 0.5, dp);
            b.pos = vecSub(b.pos, offset);
          }
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    ctx.moveTo(this.points[0].pos.x, this.points[0].pos.y);

    for (const point of this.points) {
      ctx.lineTo(point.pos.x, point.pos.y);
    }

    ctx.stroke();
  }
}

const myrope = new Rope({ x: 250, y: 100 }, 23, 200);

myrope.points[0].isAncor = false;
// const last = myrope.points.at(-1)!;
// last.isAncor = true;
// last.pos.x = 350;

const canvas: HTMLCanvasElement = document.querySelector(
  "#canvas"
) as HTMLCanvasElement;

const ctx: CanvasRenderingContext2D = canvas.getContext(
  "2d"
) as CanvasRenderingContext2D;

let prevTime = Date.now();

const mainLoop = () => {
  const curTime = Date.now();
  myrope.updatePosns((curTime - prevTime) / 1000);
  prevTime = curTime;

  myrope.render(ctx, canvas);

  requestAnimationFrame(mainLoop);
};

let mouseDown = false;
let mousePoint: null | Point = null;

canvas.addEventListener("mousedown", (e: MouseEvent) => {
  mouseDown = true;
  const pointerVec: Vec2d = {
    x: e.offsetX,
    y: e.offsetY,
  };

  const { bestPoint } = myrope.points.reduce(
    ({ bestPoint, bestDist }, cur) =>
      dist(cur.pos, pointerVec) <= bestDist
        ? { bestPoint: cur, bestDist: dist(cur.pos, pointerVec) }
        : { bestPoint, bestDist },
    {
      bestPoint: myrope.points[0],
      bestDist: dist(pointerVec, myrope.points[0].pos),
    }
  );

  bestPoint.isAncor = true;
  bestPoint.pos = pointerVec;

  mousePoint = bestPoint;
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
  const pointerVec: Vec2d = {
    x: e.offsetX,
    y: e.offsetY,
  };

  if (!mouseDown) return;
  if (!mousePoint) return;

  mousePoint.pos = pointerVec;
});

canvas.addEventListener("mouseup", (e: MouseEvent) => {
  mouseDown = false;
  if (!mousePoint) return;
  mousePoint.isAncor = false;
});

mainLoop();
