import * as THREE from "three";
import { cameraPose, demoCandles, smooth } from "./chart-journey-math";

export type ChartWorld = { render: (progress: number) => void; resize: () => void; dispose: () => void };

export function createChartWorld(host: HTMLElement, accent: string, onFailure: () => void): ChartWorld {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x04060a, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 150);
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xdceaff, 0x17243b, 2.3));
  const light = new THREE.DirectionalLight(0xffffff, 4); light.position.set(-6, 10, 12); scene.add(light);
  const rim = new THREE.DirectionalLight(accent, 3); rim.position.set(8, -3, 6); scene.add(rim);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const geometry = <T extends THREE.BufferGeometry>(item: T): T => { geometries.push(item); return item; };
  const material = <T extends THREE.Material>(item: T): T => { materials.push(item); return item; };
  const metal = (color: THREE.ColorRepresentation, emissive = color) => material(new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: .18, metalness: .45, roughness: .3 }));
  const glow = (color: THREE.ColorRepresentation, opacity = 1) => material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  const up = metal(0x56dfc0), down = metal(0xf0768b);
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const gridLayer = new THREE.Group(), candleLayer = new THREE.Group(), trendLayer = new THREE.Group(), signalLayer = new THREE.Group(), riskLayer = new THREE.Group();
  root.add(gridLayer, candleLayer, trendLayer, signalLayer, riskLayer);
  const board = new THREE.Mesh(box, metal(0x0c1320, 0x080e19)); board.scale.set(21.3, 9, .14); board.position.z = -.3; gridLayer.add(board);
  const border = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(new THREE.BoxGeometry(21.3, 9, .14))), material(new THREE.LineBasicMaterial({ color: 0x526176, transparent: true, opacity: .45 })));
  border.position.copy(board.position); gridLayer.add(border);
  const gridPoints: number[] = [];
  for (let x = -10; x <= 10; x++) gridPoints.push(x, -4.3, -.2, x, 4.3, -.2);
  for (let y = -4; y <= 4; y++) gridPoints.push(-10.5, y, -.2, 10.5, y, -.2);
  const gridGeo = geometry(new THREE.BufferGeometry()); gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
  gridLayer.add(new THREE.LineSegments(gridGeo, material(new THREE.LineBasicMaterial({ color: 0x415270, transparent: true, opacity: .24 }))));
  demoCandles.forEach((candle) => {
    const body = new THREE.Mesh(box, candle.up ? up : down); body.scale.set(.27, Math.max(.10, Math.abs(candle.close - candle.open)), .27); body.position.set(candle.x, (candle.open + candle.close) / 2, 0); candleLayer.add(body);
    const wick = new THREE.Mesh(box, candle.up ? up : down); wick.scale.set(.035, candle.high - candle.low, .035); wick.position.set(candle.x, (candle.high + candle.low) / 2, 0); candleLayer.add(wick);
    const volume = new THREE.Mesh(box, glow(candle.up ? 0x56dfc0 : 0xf0768b, .2)); volume.scale.set(.26, .13 + Math.abs(Math.sin(candle.x * 3)) * .4, .03); volume.position.set(candle.x, -3.8 + volume.scale.y / 2, -.08); gridLayer.add(volume);
  });
  const curvePoints = demoCandles.map((candle, index) => new THREE.Vector3(candle.x, Math.sin(index * .25) * 1.05 + (index - 19) * .075 - .65, .08));
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const trendLine = new THREE.Mesh(geometry(new THREE.TubeGeometry(curve, 110, .055, 6, false)), metal(0x65e5cf)); trendLayer.add(trendLine);
  const cloudShape = new THREE.Shape();
  curvePoints.forEach((point, i) => i === 0 ? cloudShape.moveTo(point.x, point.y + .22) : cloudShape.lineTo(point.x, point.y + .22));
  [...curvePoints].reverse().forEach(point => cloudShape.lineTo(point.x, point.y - .35)); cloudShape.closePath();
  const cloud = new THREE.Mesh(geometry(new THREE.ShapeGeometry(cloudShape)), glow(0x39c9b0, .22)); trendLayer.add(cloud);
  // Three translucent technical planes split apart, then return to the chart.
  const layerPlanes = [trendLayer, signalLayer, riskLayer].map((layer, index) => {
    const mesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(20.6, 8.3)), glow([0x4dd9c0, 0x7fb3ff, accent][index], .018)); mesh.position.z = -.1; layer.add(mesh);
    const outline = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(new THREE.PlaneGeometry(20.6, 8.3))), material(new THREE.LineBasicMaterial({ color: index === 2 ? accent : 0x66bcd3, transparent: true, opacity: .1 })));
    outline.position.z = -.1; layer.add(outline); return mesh;
  });
  [9, 19, 29].forEach((index, i) => {
    const candle = demoCandles[index];
    const marker = new THREE.Group(); marker.position.set(candle.x, candle.low - .7, .2);
    const cone = new THREE.Mesh(geometry(new THREE.ConeGeometry(.17, .28, 4)), metal(i === 1 ? 0xf0768b : 0x79ffe1)); marker.add(cone);
    const halo = new THREE.Mesh(geometry(new THREE.RingGeometry(.29, .32, 40)), glow(i === 1 ? 0xf0768b : 0x79ffe1, .7)); marker.add(halo);
    const stem = new THREE.Mesh(box, glow(0x8df6dd, .35)); stem.scale.set(.012, .45, .012); stem.position.y = .32; marker.add(stem); signalLayer.add(marker);
  });
  const riskColors = [0x7ee4c8, 0xe2e8f0, 0xf87186];
  [2, .2, -1.3].forEach((y, index) => {
    const bar = new THREE.Mesh(box, glow(riskColors[index], .9)); bar.scale.set(7.1, .025, .025); bar.position.set(5.4, y, .12); riskLayer.add(bar);
    const node = new THREE.Mesh(geometry(new THREE.SphereGeometry(.07, 12, 8)), metal(riskColors[index])); node.position.set(1.85, y, .12); riskLayer.add(node);
  });
  const reward = new THREE.Mesh(geometry(new THREE.PlaneGeometry(7.1, 1.8)), glow(0x44d4b0, .10)); reward.position.set(5.4, 1.1, 0); riskLayer.add(reward);
  const risk = new THREE.Mesh(geometry(new THREE.PlaneGeometry(7.1, 1.5)), glow(0xff577b, .1)); risk.position.set(5.4, -.55, 0); riskLayer.add(risk);
  // A sparse particle field gives camera movement depth without a full-screen effect stack.
  const points: number[] = [];
  for (let i = 0; i < 100; i++) points.push(Math.sin(i * 12.31) * 24, Math.cos(i * 8.57) * 12, -9 - (i % 17));
  const particleGeo = geometry(new THREE.BufferGeometry()); particleGeo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  scene.add(new THREE.Points(particleGeo, material(new THREE.PointsMaterial({ color: 0x7890b4, size: .035, transparent: true, opacity: .4 }))));
  let disposed = false;
  let current = 0;
  const render = (progress: number) => {
    if (disposed) return;
    current = progress;
    const pose = cameraPose(progress, camera.aspect);
    camera.position.set(pose[0], pose[1], pose[2]); camera.lookAt(pose[3], pose[4], pose[5]);
    const assemble = 1 - smooth(.72, .93, progress);
    const trend = smooth(.1, .25, progress), signals = smooth(.32, .46, progress), plan = smooth(.54, .68, progress);
    trendLayer.visible = trend > .01; signalLayer.visible = signals > .01; riskLayer.visible = plan > .01;
    trendLayer.scale.set(Math.max(.001, trend), 1, 1); signalLayer.scale.setScalar(Math.max(.001, signals)); riskLayer.scale.set(Math.max(.001, plan), 1, 1);
    trendLayer.position.z = .4 + trend * assemble * 1.3;
    signalLayer.position.z = .7 + signals * assemble * 2.4;
    riskLayer.position.z = 1 + plan * assemble * 3.5;
    candleLayer.position.z = .25 + smooth(.1, .4, progress) * assemble * .4;
    root.rotation.z = -.035 + smooth(0, .8, progress) * .035;
    root.rotation.y = Math.sin(progress * Math.PI * 2) * .08;
    layerPlanes.forEach((plane, i) => { (plane.material as THREE.MeshBasicMaterial).opacity = .015 + [trend, signals, plan][i] * assemble * .02; });
    renderer.render(scene, camera);
  };
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 1.8, Math.sqrt(1800000 / (width * height)));
    renderer.setPixelRatio(pixelRatio); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(current);
  };
  const contextLost = (event: Event) => { event.preventDefault(); onFailure(); };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  resize();
  return { render, resize, dispose: () => {
    if (disposed) return; disposed = true;
    renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  } };
}
