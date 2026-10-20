// Real Canvas2D / CPU-throttled Chromium benchmark, not a physical-device power test.
// Run from the workspace: node artifacts/geit-website/scripts/profile-hero-light-field.mjs [source.tsx] [output.json]
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import http from "node:http";
import ts from "typescript";

const source = process.argv[2] ?? "artifacts/geit-website/src/components/hero-light-field.tsx";
const output = process.argv[3] ?? "generated-artifacts/hero-profile.json";
const seconds = Number(process.env.HERO_PROFILE_SECONDS ?? 30);
const code = ts.transpileModule(await readFile(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText.replaceAll("import.meta.env.DEV", "false");
const page = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a1424}#hero{width:100vw;height:100vh}canvas{width:100%;height:100%}</style>
<div id="hero"><canvas></canvas><svg></svg></div><script>
window.stats={costs:[],intervals:[],particles:[],longTasks:[],start:0};
new PerformanceObserver(list=>stats.longTasks.push(...list.getEntries().filter(e=>stats.start && e.startTime>=stats.start).map(e=>e.duration))).observe({type:'longtask',buffered:true});
const wrap=document.querySelector('#hero'),canvas=document.querySelector('canvas'),fallback=document.querySelector('svg');
let refs=0,effect,cleanup,drawStart=0,draws=0,lastDraw=0;
const ctx=canvas.getContext('2d');
const transform=ctx.setTransform.bind(ctx),image=ctx.drawImage.bind(ctx);
ctx.setTransform=(...args)=>{drawStart=performance.now();draws=0;transform(...args)};
ctx.drawImage=(...args)=>{draws++;image(...args)};
const composite=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'globalCompositeOperation');
Object.defineProperty(ctx,'globalCompositeOperation',{get(){return composite.get.call(ctx)},set(v){
composite.set.call(ctx,v);
if(v==='source-over' && drawStart && stats.start){
const now=performance.now();stats.costs.push(now-drawStart);stats.particles.push(draws);
if(lastDraw)stats.intervals.push(now-lastDraw);lastDraw=now;
}}});
const hooks={useRef:()=>({current:[wrap,canvas,fallback][refs++]}),useEffect:fn=>effect=fn,useId:()=> 'profile'};
const exports={},require=name=>name==='react'?hooks:{jsx:()=>null,jsxs:()=>null};
${code}
window.begin=()=>{stats.start=performance.now();exports.HeroLightField({});cleanup=effect()};
window.finish=()=>{cleanup();return {...stats,elapsed:performance.now()-stats.start,dpr:devicePixelRatio,canvasPixels:canvas.width*canvas.height}};
</script>`;
const server = http.createServer((_, res) => { res.setHeader("Content-Type", "text/html"); res.end(page); });
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const profile = await mkdtemp(path.join(tmpdir(), "hero-chromium-"));
const chrome = spawn(process.env.CHROMIUM_PATH ?? "chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
let ws, id = 0;
const pending = new Map();
try {
  const browserUrl = await new Promise((resolve, reject) => {
    let stderr = "";
    chrome.stderr.on("data", chunk => { stderr += chunk; const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) resolve(match[1]); });
    chrome.on("error", reject);
    chrome.on("exit", code => reject(new Error(`Chromium exited ${code}: ${stderr}`)));
  });
  const port = new URL(browserUrl).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener("open", resolve));
  ws.addEventListener("message", e => {
    const msg = JSON.parse(e.data), waiter = pending.get(msg.id);
    if (waiter) { pending.delete(msg.id); msg.error ? waiter.reject(new Error(JSON.stringify(msg.error))) : waiter.resolve(msg.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params }));
  });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const results = [];
  for (const device of [
    { label: "small-phone-6x", width: 360, height: 800, deviceScaleFactor: 2, rate: 6 },
    { label: "large-phone-4x", width: 390, height: 844, deviceScaleFactor: 3, rate: 4 },
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: device.width, height: device.height, deviceScaleFactor: device.deviceScaleFactor, mobile: true,
    });
    await send("Emulation.setCPUThrottlingRate", { rate: device.rate });
    await send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}` });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate("typeof window.begin==='function'")) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await send("Performance.enable");
    // Same page, animation not mounted: CPU-idle control.
    const metrics = async () => Object.fromEntries((await send("Performance.getMetrics")).metrics.map(m => [m.name, m.value]));
    const idleStart = await metrics();
    await new Promise(resolve => setTimeout(resolve, 2000));
    const before = await metrics();
    await evaluate("window.begin()");
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    const raw = await evaluate("window.finish()");
    const after = await metrics();
    await new Promise(resolve => setTimeout(resolve, 2000));
    const stopped = await metrics();
    const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0;
    const sum = values => values.reduce((a, b) => a + b, 0);
    const result = {
      ...device, seconds: raw.elapsed / 1000, frames: raw.costs.length,
      fps: raw.costs.length / (raw.elapsed / 1000),
      drawMsP50: percentile(raw.costs, .5), drawMsP95: percentile(raw.costs, .95),
      drawsOver33ms: raw.costs.filter(v => v > 33.33).length,
      drawsOver50ms: raw.costs.filter(v => v > 50).length,
      intervalMsP95: percentile(raw.intervals, .95),
      intervalsOver50ms: raw.intervals.filter(v => v > 50).length,
      longTasks: raw.longTasks.length, longTaskMs: sum(raw.longTasks),
      drawMsPerSecond: sum(raw.costs) / (raw.elapsed / 1000),
      mainThreadMsPerSecond: (after.TaskDuration - before.TaskDuration) * 1000 / (raw.elapsed / 1000),
      idleMainThreadMsPerSecond: (before.TaskDuration - idleStart.TaskDuration) * 500,
      stoppedMainThreadMsPerSecond: (stopped.TaskDuration - after.TaskDuration) * 500,
      particlesFirst: raw.particles[0], particlesLast: raw.particles.at(-1),
      spritesPerSecond: sum(raw.particles) / (raw.elapsed / 1000),
      canvasPixels: raw.canvasPixels,
    };
    results.push(result); console.log(JSON.stringify(result, null, 2));
  }
  await writeFile(output, JSON.stringify({ source, chromium: await send("Browser.getVersion"), results }, null, 2));
} finally {
  ws?.close(); chrome.kill(); server.close();
  if (chrome.exitCode === null) await new Promise(resolve => chrome.once("exit", resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
