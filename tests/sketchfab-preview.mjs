import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
  await page.route('**/__model-preview', route => route.fulfill({ contentType: 'text/html', body: `<html><head><style>body{margin:0;background:#dce2d7}#label{position:absolute;top:24px;left:32px;font:24px sans-serif;color:#263b32}</style><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head><body><div id="label"></div></body></html>` }));
  await page.goto('http://localhost:5173/__model-preview');
  await page.evaluate(async () => {
    const T = await import('three'), { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(1200, 850); renderer.setClearColor('#dce2d7'); renderer.toneMapping = T.ACESFilmicToneMapping;
    document.body.append(renderer.domElement);
    const scene = new T.Scene(); scene.add(new T.HemisphereLight('#ffffff', '#858979', 2));
    const sun = new T.DirectionalLight('#fff1dc', 2.4); sun.position.set(2, 5, 4); scene.add(sun);
    const camera = new T.PerspectiveCamera(45, 1200 / 850, .01, 100);
    let model;
    window.showModel = async name => {
      if (model) scene.remove(model);
      model = (await new GLTFLoader().loadAsync(`/assets/models/sketchfab/${name}.glb`)).scene;
      const bounds = new T.Box3().setFromObject(model, true), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
      const scale = 3 / Math.max(...size.toArray()); model.scale.setScalar(scale); model.position.copy(center).multiplyScalar(-scale); model.position.y -= size.y * scale / 2 * -.15; scene.add(model);
      camera.position.set(4, 2.5, 5); camera.lookAt(0, 0, 0); renderer.render(scene, camera);
      document.querySelector('#label').textContent = name;
      return { name, size: size.toArray().map(n => +n.toFixed(3)), min: bounds.min.toArray().map(n => +n.toFixed(3)) };
    };
  });
  for (const name of ['tree-canopy', 'tree-garden', 'tree-slender', 'kitchen-counter', 'apartment-sofa', 'apartment-fridge', 'kitchen-oven', 'kitchen-pendants']) {
    console.log(await page.evaluate(name => window.showModel(name), name));
    await page.screenshot({ path: `test-results/model-${name}.png` });
  }
} finally { await browser.close(); }
