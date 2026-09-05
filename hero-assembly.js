import * as THREE from './assets/vendor/three/three.module.min.js';

// A decorative, original battery illustration. The page and its static image
// are complete before this optional WebGL enhancement is initialized.
const figure = document.querySelector('.assembly');
const stage = figure?.querySelector('.assembly-viewport');
const button = figure?.querySelector('.assembly-action');
const hero = document.querySelector('.hero-engineering');

if (stage && button && hero) {
    initializeAssembly();
}

function initializeAssembly() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!context) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 60);
    const model = new THREE.Group();
    const layers = [];
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const instancedMeshes = new Set();
    const events = new AbortController();
    let renderer;
    let environment;
    let frame = 0;
    let disposed = false;
    let visible = hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight;
    let resizeObserver;
    let visibilityObserver;
    let themeObserver;

    const geometry = value => { geometries.add(value); return value; };
    const material = value => { materials.add(value); return value; };
    const on = (target, name, listener, options = {}) => target.addEventListener(name, listener, { ...options, signal: events.signal });

    function dispose() {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(frame);
        events.abort();
        resizeObserver?.disconnect();
        visibilityObserver?.disconnect();
        themeObserver?.disconnect();
        instancedMeshes.forEach(item => item.dispose());
        geometries.forEach(item => item.dispose());
        materials.forEach(item => item.dispose());
        textures.forEach(item => item.dispose());
        environment?.dispose();
        renderer?.dispose();
        canvas.remove();
        figure.classList.remove('scene-ready');
        button.hidden = true;
    }

    try {
        renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.setClearColor(0x000000, 0);

        // Softboxes reflected in the metal; no external HDR image or model.
        const room = new THREE.Scene();
        room.background = new THREE.Color(0x555a60);
        const panels = [
            { p: [0, 7, 0], s: [9, 0.1, 7], c: 0xffffff, i: 4 },
            { p: [-7, 2, 2], s: [0.1, 7, 5], c: 0xc6d9ee, i: 3 },
            { p: [6, 1, -4], s: [0.1, 6, 4], c: 0xfac7a8, i: 3 },
            { p: [1, 1, 7], s: [5, 5, 0.1], c: 0xffffff, i: 1.7 }
        ];
        for (const panel of panels) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...panel.s), new THREE.MeshBasicMaterial({ color: new THREE.Color(panel.c).multiplyScalar(panel.i) }));
            mesh.position.set(...panel.p);
            room.add(mesh);
        }
        const pmrem = new THREE.PMREMGenerator(renderer);
        environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: innerWidth < 761 ? 128 : 256 });
        scene.environment = environment.texture;
        pmrem.dispose();
        room.traverse(item => { item.geometry?.dispose(); item.material?.dispose(); });

        const graphite = material(new THREE.MeshStandardMaterial({ color: 0x30373d, metalness: 0.8, roughness: 0.36 }));
        const black = material(new THREE.MeshStandardMaterial({ color: 0x101719, metalness: 0.25, roughness: 0.65 }));
        const aluminum = material(new THREE.MeshStandardMaterial({ color: 0xb2c0c9, metalness: 0.96, roughness: 0.26 }));
        const satin = material(new THREE.MeshStandardMaterial({ color: 0x71828d, metalness: 0.9, roughness: 0.4 }));
        const copper = material(new THREE.MeshStandardMaterial({ color: 0xc98157, metalness: 0.94, roughness: 0.24 }));
        const insulator = material(new THREE.MeshStandardMaterial({ color: 0x234447, metalness: 0.35, roughness: 0.46 }));
        const indicator = material(new THREE.MeshStandardMaterial({ color: 0xffb787, emissive: 0xd4785e, emissiveIntensity: 0.35, roughness: 0.35 }));

        const key = new THREE.DirectionalLight(0xe7f0ff, 3);
        key.position.set(-3, 8, 6);
        const rim = new THREE.DirectionalLight(0xffbb90, 2);
        rim.position.set(5, 3, -5);
        scene.add(new THREE.AmbientLight(0xffffff, 0.4), key, rim, model);

        function roundedBox(width, height, depth, radius = 0.08) {
            const shape = new THREE.Shape();
            const x = -width / 2, z = -depth / 2;
            shape.moveTo(x + radius, z);
            shape.lineTo(x + width - radius, z);
            shape.quadraticCurveTo(x + width, z, x + width, z + radius);
            shape.lineTo(x + width, z + depth - radius);
            shape.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth);
            shape.lineTo(x + radius, z + depth);
            shape.quadraticCurveTo(x, z + depth, x, z + depth - radius);
            shape.lineTo(x, z + radius);
            shape.quadraticCurveTo(x, z, x + radius, z);
            const result = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.018, bevelThickness: 0.018, curveSegments: 5 });
            result.rotateX(-Math.PI / 2);
            result.center();
            return geometry(result);
        }

        function part(parent, shape, surface, x = 0, y = 0, z = 0) {
            const mesh = new THREE.Mesh(shape, surface);
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        }

        function layer(separation, delay = 0) {
            const group = new THREE.Group();
            model.add(group);
            layers.push({ group, separation, delay });
            return group;
        }

        function instances(parent, shape, surface, positions) {
            const mesh = new THREE.InstancedMesh(shape, surface, positions.length);
            instancedMeshes.add(mesh);
            const transform = new THREE.Matrix4();
            positions.forEach((position, index) => mesh.setMatrixAt(index, transform.makeTranslation(...position)));
            mesh.instanceMatrix.needsUpdate = true;
            parent.add(mesh);
            return mesh;
        }

        const cooling = layer(0);
        part(cooling, roundedBox(5.35, 0.14, 3.4, 0.19), aluminum, 0, -0.96);
        part(cooling, roundedBox(4.95, 0.055, 3.04, 0.12), satin, 0, -0.85);
        const channel = geometry(new THREE.CylinderGeometry(0.036, 0.036, 4.55, 10));
        for (let row = 0; row < 7; row++) {
            const pipe = part(cooling, channel, copper, 0, -0.802, -1.22 + row * 0.4);
            pipe.rotation.z = Math.PI / 2;
        }
        const port = geometry(new THREE.CylinderGeometry(0.095, 0.095, 0.34, 16));
        for (const z of [-1.05, 1.05]) {
            const fitting = part(cooling, port, copper, -2.81, -0.94, z);
            fitting.rotation.z = Math.PI / 2;
        }

        const housing = layer(0.32, 0.04);
        part(housing, roundedBox(5.08, 0.1, 3.15, 0.15), graphite, 0, -0.72);
        const endWall = roundedBox(0.19, 0.94, 3.15, 0.055);
        for (const x of [-2.46, 2.46]) part(housing, endWall, graphite, x, -0.24);
        part(housing, roundedBox(4.84, 0.82, 0.16, 0.04), graphite, 0, -0.3, -1.49);
        part(housing, roundedBox(4.84, 0.4, 0.16, 0.04), graphite, 0, -0.51, 1.49);
        const rib = roundedBox(0.055, 0.3, 0.05, 0.012);
        instances(housing, rib, satin, Array.from({ length: 29 }, (_, i) => [-2.24 + i * 0.16, -0.49, 1.585]));
        part(housing, roundedBox(0.78, 0.16, 0.028, 0.02), black, 1.52, -0.5, 1.63);
        for (let i = 0; i < 3; i++) part(housing, geometry(new THREE.SphereGeometry(0.024, 8, 6)), i === 0 ? indicator : satin, 1.32 + i * 0.14, -0.5, 1.66);

        const cellBody = geometry(new THREE.CylinderGeometry(0.247, 0.247, 1.1, 28));
        const cellRim = geometry(new THREE.CylinderGeometry(0.253, 0.253, 0.045, 28));
        const cellTop = geometry(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 28));
        const terminal = geometry(new THREE.CylinderGeometry(0.073, 0.073, 0.055, 18));
        const collar = geometry(new THREE.TorusGeometry(0.224, 0.019, 8, 28));
        collar.rotateX(Math.PI / 2);
        for (let row = 0; row < 4; row++) {
            const cells = layer(1.08, 0.09 + row * 0.055);
            const positions = Array.from({ length: 8 }, (_, i) => [-1.98 + i * 0.565, -0.06, -1.02 + row * 0.68]);
            instances(cells, cellBody, aluminum, positions);
            instances(cells, cellRim, satin, positions.map(([x, y, z]) => [x, y + 0.55, z]));
            instances(cells, cellTop, aluminum, positions.map(([x, y, z]) => [x, y + 0.58, z]));
            instances(cells, collar, insulator, positions.map(([x, y, z]) => [x, y + 0.585, z]));
            instances(cells, terminal, copper, positions.map(([x, y, z]) => [x, y + 0.615, z]));
        }

        const busbars = layer(1.92, 0.3);
        const rail = roundedBox(4.5, 0.045, 0.11, 0.035);
        for (let row = 0; row < 4; row++) part(busbars, rail, copper, 0, 0.595, -1.02 + row * 0.68);
        const bridge = roundedBox(0.12, 0.045, 0.79, 0.035);
        for (let i = 0; i < 3; i++) part(busbars, bridge, copper, i % 2 ? -2.12 : 2.12, 0.595, -0.68 + i * 0.68);

        const lid = layer(2.65, 0.38);
        const lidSide = roundedBox(0.22, 0.12, 3.22, 0.065);
        const lidEnd = roundedBox(4.9, 0.12, 0.2, 0.065);
        for (const x of [-2.46, 2.46]) part(lid, lidSide, graphite, x, 0.78);
        for (const z of [-1.51, 1.51]) part(lid, lidEnd, graphite, 0, 0.78, z);
        const brace = roundedBox(0.095, 0.065, 2.9, 0.025);
        for (const x of [-1.12, 1.12]) part(lid, brace, graphite, x, 0.76);
        const bolt = geometry(new THREE.CylinderGeometry(0.067, 0.067, 0.036, 6));
        const boltPoints = [-2.46, 2.46].flatMap(x => [-1.46, 0, 1.46].map(z => [x, 0.86, z]));
        instances(lid, bolt, aluminum, boltPoints);

        // A soft, locally generated contact shadow, without a shadow-map pass.
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = shadowCanvas.height = 128;
        const paint = shadowCanvas.getContext('2d');
        const gradient = paint.createRadialGradient(64, 64, 6, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(0,0,0,0.7)');
        gradient.addColorStop(0.45, 'rgba(0,0,0,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        paint.fillStyle = gradient;
        paint.fillRect(0, 0, 128, 128);
        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        textures.add(shadowTexture);
        const shadowMaterial = material(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: document.documentElement.dataset.theme === 'light' ? 0.35 : 0.6 }));
        const shadow = part(model, geometry(new THREE.PlaneGeometry(8.5, 6)), shadowMaterial, 0, -1.3);
        shadow.rotation.x = -Math.PI / 2;

        let width = 1, height = 1;
        let rotationX = 0, rotationY = 0;
        let targetX = 0, targetY = 0;
        let separation = 0, targetSeparation = 0;
        let introStart = null;
        let introFinished = reducedMotion.matches || !visible || document.hidden || scrollY > 40;
        let previousTime = 0;
        let manualState = null;

        function updateButton() {
            const expanded = targetSeparation >= 0.5;
            button.setAttribute('aria-pressed', String(expanded));
            button.querySelector('span').textContent = expanded ? 'Assemble module' : 'Explore assembly';
        }

        function readScroll() {
            targetSeparation = manualState ?? (reducedMotion.matches ? 0 : THREE.MathUtils.clamp(-hero.getBoundingClientRect().top / Math.min(480, hero.offsetHeight * 0.65), 0, 1));
            updateButton();
        }

        function requestRender() {
            if (!frame && visible && !document.hidden && !disposed) frame = requestAnimationFrame(render);
        }

        function resize() {
            width = Math.max(1, stage.clientWidth);
            height = Math.max(1, stage.clientHeight);
            renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 760 ? 1 : 1.5));
            renderer.setSize(width, height, false);
            requestRender();
        }

        function render(time) {
            frame = 0;
            if (disposed || !visible || document.hidden) return;
            const step = reducedMotion.matches ? 1 : 1 - Math.exp(-Math.min((time - previousTime) / 1000 || 1 / 60, 0.05) * 8);
            previousTime = time;
            rotationX = THREE.MathUtils.lerp(rotationX, targetX, step);
            rotationY = THREE.MathUtils.lerp(rotationY, targetY, step);
            separation = THREE.MathUtils.lerp(separation, targetSeparation, step);

            let intro = 0;
            if (!introFinished) {
                if (introStart === null) introStart = time;
                intro = Math.min((time - introStart) / 2200, 1);
                if (intro === 1) introFinished = true;
            }
            for (const item of layers) {
                const progress = THREE.MathUtils.clamp((intro - item.delay * 0.55) / (1 - item.delay * 0.55), 0, 1);
                const opening = introFinished ? 0 : Math.pow(1 - progress, 3);
                item.group.position.y = item.separation * Math.max(separation, opening);
            }
            const opening = introFinished ? separation : Math.max(separation, Math.pow(1 - intro, 2));
            model.rotation.set(rotationX, -0.16 + rotationY, 0);
            const viewHeight = Math.max(5.45 + opening * 1.5, (6.9 + opening * 0.25) / (width / height));
            const centerY = 0.02 + opening * 1.03;
            camera.left = -viewHeight * width / height / 2;
            camera.right = -camera.left;
            camera.top = viewHeight / 2;
            camera.bottom = -camera.top;
            camera.position.set(7.8, 6.6 + centerY, 9.7);
            camera.lookAt(0, centerY, 0);
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
            figure.classList.add('scene-ready');

            const moving = Math.abs(rotationX - targetX) + Math.abs(rotationY - targetY) + Math.abs(separation - targetSeparation) > 0.0004;
            if (!introFinished || moving) requestRender();
        }

        function pause() {
            cancelAnimationFrame(frame);
            frame = 0;
            previousTime = 0;
            introFinished = true;
        }

        on(hero, 'pointermove', event => {
            if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
            const bounds = hero.getBoundingClientRect();
            targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.32;
            targetX = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.12;
            requestRender();
        }, { passive: true });
        on(hero, 'pointerleave', () => { targetX = targetY = 0; requestRender(); });
        on(window, 'scroll', () => { manualState = null; readScroll(); requestRender(); }, { passive: true });
        on(button, 'click', () => {
            introFinished = true;
            manualState = targetSeparation >= 0.5 ? 0 : 1;
            readScroll();
            requestRender();
        });
        on(document, 'visibilitychange', () => { if (document.hidden) pause(); else requestRender(); });
        on(reducedMotion, 'change', () => {
            introFinished = true;
            targetX = targetY = 0;
            readScroll();
            requestRender();
        });
        on(canvas, 'webglcontextlost', () => dispose());
        on(window, 'pagehide', event => { if (event.persisted) pause(); else dispose(); });
        on(window, 'pageshow', requestRender);

        visibilityObserver = new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            if (visible) { readScroll(); requestRender(); }
            else pause();
        });
        visibilityObserver.observe(figure);
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(stage);
        themeObserver = new MutationObserver(() => {
            shadowMaterial.opacity = document.documentElement.dataset.theme === 'light' ? 0.35 : 0.6;
            requestRender();
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        stage.append(canvas);
        button.hidden = false;
        readScroll();
        resize();
    } catch (error) {
        // Keep the supplied illustration if rendering is unsupported or fails.
        dispose();
        console.warn('The interactive illustration is unavailable.', error);
    }
}
