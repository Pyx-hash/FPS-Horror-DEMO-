import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/PointerLockControls.js';
import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';
import { spawn } from 'child_process';

const canvas = document.getElementById('gameCanvas');
const startBtn = document.getElementById('startBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settings');
const backBtn = document.getElementById('backBtn');
const graphicsQuality = document.getElementById('graphicsQuality');
const volMaster = document.getElementById('volMaster');
const volMusic = document.getElementById('volMusic');
const volSfx = document.getElementById('volSfx');
const sensSlider = document.getElementById('sens');
const invertY = document.getElementById('invertY');
const serverAddrInput = document.getElementById('serverAddr');
const messages = document.getElementById('messages');
const healthVal = document.getElementById('healthVal');
const ammoVal = document.getElementById('ammoVal');

let settings = {
    graphics: 'medium',
    vol: {
        master: 0.8,
        music: 0.4,
        sfx: 0.8
    },
    sens: 1,
    invertY: false
};

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.03);
const camerta = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camerta.position.set(0,1.6,0);
const controls = new PointerLockControls(camerta, renderer.domElement);
let player = {
    id: null,
    pos: new THREE.Vector3(),
    rotY: 0,
    health: 100,
    ammo: 30
};
const hemi = new THREE.HemisphereLight(0x404040, 0x000000, 0.8);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffeedd, 0.6);
dir.position.set(-5,10,5);
dir.castShadow = true;
dir.shadow.mapSize.width = dir.shadow.mapSize.height = 1024;
dir.shadow.camera.near = 0.5;
dir.shadow.camera.far = 50;
scene.add(dir);

    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x111111
    });
    const floorGeo = new THREE.PlaneGeometry(200,200);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);

    function mkBox(x,z,w,h,d,c) {
        const g = new THREE.BoxGeometry(w,h,d);
        const m = new THREE.MeshStandardMaterial({
            color: c||0x222222
        });
        const box = new THREE.Mesh(g, m);
        box.position.set(x, h/2, z);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
    }
    mkBox(0, -10, 10, 4, 2, 0x191919);
    mkBox(-16, 2, 6, 3, 18, 0x1a1a1a);
    mkBox(12, 8, 8, 4, 6, 0x1b1b1b);

    const lamp = new THREE.PointLight(0xffaa88, 0.8, 15);
    lamp.position.set(2,3,-4);
    scene.add(lamp);

    const cross = document.createElement('div');
    cross.style.position = 'fixed';
    cross.style.left='50%';
    cross.style.top='50%';
    cross.style.transform='translate(-50%, -50%)';
    cross.style.pointerEvents='none';
    cross.innerHTML = '<div style="width: 6px; height: 6px; background: #fff; border-radius: 50%></div>';
    document.body.appendChild(cross);

    const listener = new THREE.AudioListener();
    camera.add(listener);
    const audioLoader = new THREE.AudioLoader();
    const music = new THREE.Audio(listener);
    const sfxShot = new THREE.Audio(listener);
    const sfxHit = new THREE.Audio(listener);

    audioLoader.load('/src/audio/creepy_whispering.mp3', buffer => {
        music.setBuffer(buffer);
        music.setLoop(true);
        music.setVolume(settings.vol.music*settings.vol.master);
        music.play();
    }, () => {}, () => {});
    audioLoader.load('/src/audio/metal_hit_strike.mp3', buffer => {
        sfxShot.setBuffer(buffer);
        sfxShot.setVolume(settings.vol.sfx*settings.vol.master);
    }, () => {}, ()=>{});
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let velocity = new THREE.Vector3();
    let direction = new THREE.Vector3();
    let move = {
        forward: false,
        back: false,
        left: false,
        right: false,
        sprint: false
    };
    const onKey = (e,down) => {
        if(e.code === 'KeyW') move.forward=down;
        if(e.code === 'KeyS') move.back=down;
        if(e.code === 'KeyA') move.left=down;
        if(e.code === 'KeyD') move.right=down;
        if(e.code === 'ShiftLeft') move.sprint=down;
    };
    window.addEventListener('keydown', (e)=>onKey(e,true));
    window.addEventListener('keyup', (e) => onKey(e,false));
    startBtn.addEventListener('click', () => {
        controls.lock();
    });
    controls.addEventListener('lock', () => {
        document.getElementById('menu').classList.add('hidden');
    });
    controls.addEventListener('unlock', () => {
        document.getElementById('menu').classList.remove('hidden');
    });
    let sensitivity = settings.sens;
    document.addEventListener('mousemove', (e) => {

    });

    const raycaster = new THREE.Raycaster();
    const bullets = [];

    function shoot() {
        if (player.ammo <= 0) return;
        player.ammo -= 1;
        updateHud();

        if(sfxShot.isBuffer) sfxShot.play();
        const origin = camera.getWorldPosition(new THREE.Vecttor3());
        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
        raycaster.set(origin, dir);
        const hits = raycaster.intersectObjects(enemyGroup.children, true);
        if(hits.length>0) {
            const target = hits[0].object.userData.enemy;
            if(target) {
                target.hp -= 40;
                if(sfxHit.isBuffer) sfxHit.play();
            }
        }
        if(socket && socket.connected) {
            socket.emit('shoot', {
                pos: origin.toArray(),
                dir: dir.toArray()
            });
        }
    }
    window.addEventListener('mousedown', (e) => {
        if(controls.isLocked) shoot();
    });

    const enemyGroup = new THREE.Group();
    scene.add(enemyGroup);

    class Enemy {
        constructor(x,z) {
            this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5,12,12), new THREE.MeshStandardMaterial({color:0x550000}));
            this.mesh.position.set(x,0.5,z);
            this.mesh.castShadow = true;
            this.mesh.usesrData.enemy = this;
            enemyGroup.add(this.mesh);
            this.hp = 100;
            this.state = 'idle';
            this.speed = 1 + Math.random()*0.7;
            this.nextSound = 0;
        }
        update(dt) {
            if(this.hp<=0 && this.state !=='dead') {
                this.state='dead';
                this.mesh.material.color.setHex(0x222222);
            }
            if(this.state==='dead') return;
            const ppos = camera.getWorldPosition(new THREE.Vector3());
            const dist = this.mesh.position.distanceTo(ppos);
            if(disst < 12)
                this.state = 'chase';
            if(this.state==='chase') {
                const dir = ppos.clone().sub(this.mesh.position).setY(0).normalize();
                this.mesh.position.add(dir.multiplyScalar(this.speed*dt));
                if(dist < 1.2) {
                    if(perf.now() > (this.lastAttack || 0) + 800) {
                        player.health -= 10;
                        this.lastAttack = perf.now();
                        updateHud();
                        flashMessage('You were hit!');
                    }
                }
            }
        }
    }

    const enemies = [];
    function spawnEnemy(x,z) {
        const e = new Enemy(x,z);
        enemies.push(e);
    }
    spawnEnemy(5, -6);
    spawnEnemy(-8, 10);
    spawnEnemy(15, 2);

    function updateHud() {
        healthVal.innerText = Math.max(0, Math.floor(player.health));
        ammoVal.innerText = player.ammo;
    }
    function flashMessage(text, ms=1500) {
        messages.innerText = text;
        setTimeout(() => {
            if(messages.innerText===text) 
                messages.innerText='';
        }, ms);
    } 
    let socket = null;
    let remotePlayers = {};
    const playerMeshes = new Map();

    function connectToServer(url) {
        if(socket) {
            socket.disconnect();
            socket = null;
        }
        try {
            socket = io(url);
        } catch(e) {
            console.warn('Socket.IO import/connection failed: ', e);
            flashMessage('Multiplayer Disabled: cannot connect');
            return;
        }
        socket.on('connect', () => {
            player.id = socket.id;
            flashMessage('Connected: ' + socket.id, 1500);
            socket.emit('join', {
                name: 'Player' + Math.floor(Math.random()*1000)
            });
        });
        socket.on('state', data => {
            // data.players = {id: {pos: [x,y,z],rotY,health}}

            for (const id in data.players) {
                if(id === socket.id) continue;
                const p = data.players[id];
                if(!remotePlayers[id]) {
                    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.3,1.0,4,8), new THREE.MeshStandardMaterial({color: 0x3399ff}));
                    m.castShadow = true;
                    scene.add(m);
                    remotePlayers[id] = { mesh:m, last: performance.now()};
                }
                remotePlayers[id].mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
                remotePlayers[id].mesh.rotation.y = p.rotY;
            }
        });
        socket.on('playerJoined', (id) => {
            flashMessage('Player Joined:' + id, 1200);
        });
        socket.on('playerLeft', (id) => {
            if(remotePlayers[id]) {
                scene.remove(remotePlayers[id].mesh);
                delete remotePlayers[id];
            }
            flashMessage('Player Left: ' + id, 1000);
        });
       socket.on('shoot', (payload) => {
    // Create muzzle flash sprite
    const texture = new THREE.TextureLoader().load('/src/textures/muzzle-fire.jpg');
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
    });

    const muzzleFlash = new THREE.Sprite(material);
    muzzleFlash.scale.set(0.5, 0.5, 0.5); // Adjust size
    muzzleFlash.position.set(payload.pos.x, payload.pos.y, payload.pos.z);

    scene.add(muzzleFlash);

    // Remove it after a short delay
    setTimeout(() => {
        scene.remove(muzzleFlash);
        material.dispose();
        texture.dispose();
    }, 50); // 50ms for quick flash
    });
}
setInterval(() => {
    if(!socket || !socket.connected) return;
    const pos = camera.getWorldPosition(new THREE.Vector3());
    socket.emit('update', {
        pos: [pos.x, pos.y, pos.z],
        rotY: camera.rotation.y,
        health: player.health
    });
}, 100);

const clock = new THREE.Clock();
const perf = {
    now: () => performance.now()
};
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const speed = move.sprint ? 6 : 3;
    const forward = controls.getDirection(new THREE.Vector3()).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), forward).normalize();

    let moveDir = new THREE.Vector3();
    if(move.forward) moveDir.add(forward.clone().negate());
    if(move.left) moveDir.add(right.clone().negate());
    if(move.right) moveDir.add(right);
    if(moveDir.lengthSq()>0) moveDir.normalize();

    controls.moveRight( moveDir.x * speed * dt);
    controls.moveForward( moveDir.z * speed * dt);
    enemies.forEach(e => e.update(dt));

    for(let i = enemies.length-1; i>=0;i--) {
        const e = enemies[i];
        if(e.state === 'dead') {
            enemyGroup.remove(e.mesh);
            enemies.splice(i,1);
            setTimeout(() =>spawnEnemy((Math.random()-0.5)*20, (Math.random()-0.5)*20), 5000);
        }
    }
    lamp.intensity = 0.6 + Math.sin(perf.now()/80)*0.2;
    if(player.health < 30) {
        scene.background = new THREE.Color(0x110000);
    } else {
        scene.background = new THREE.Color(0x000000);
    }
    renderer.render(scene, camera);
}
animate();
settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
});
backBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    applySettings();
});
graphicsQuality.addEventListener('change', () => {
    settings.graphics = graphicsQuality.value;
    applySettings();
});
volMaster.addEventListener('input', () => {
    settings.vol.master = parseFloat(volMaster.value);
    applySettings();
});
volMusic.addEventListener('input', () => {
    settings.vol.music = parseFloat(volMusic.value);
    applySettings();
});
volSfx.addEventListener('input', () => {
    settings.vol.sfx = parseFloat(volSfx.value);
    applySettings();
});
sensSlider.addEventListener('input', () => {
    settings.sens = parseFloat(sensSlider.value);
    applySettings();
});
invertY.addEventListener('change', ()=> {
    settings.invertY = invertY.checked;
    applySettings();
});
function applyVolume() {
    if(music.isBuffer) music.setVolume(settings.vol.master * settings.vol.music);
    if(sfxShot.isBuffer) sfxShot.setVolume(settings.vol.master * settings.vol.sfx);
}
function applySettings() {
    if(settings.graphics === 'low') {
        renderer.shadowMap.enabled = false;
        scene.fog.density = 0.01;
    } else if(settings.graphics === 'medium') {
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        scene.fog.density = 0.03;
    } else {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        scene.fog.density = 0.04;
    }
    sensitivity = settings.sens;
    applyVolume();
}
applySettings();
applyVolume();
updateHud();

document.getElementById('serverAddr').addEventListener('click', () => {
    const addr = serverAddrInput.value || 'http://localhost:3000';
    connectToServer(addr);
});