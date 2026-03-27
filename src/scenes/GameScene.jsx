import { useRef, useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';
import useGameStore from '../store/useGameStore';
import audio from '../store/audioManager';
import Profile from '../ui/Profile';
import Projects from '../ui/Projects';
import Skills from '../ui/Skills';
import Contact from '../ui/Contact';
import Certifications from '../ui/Certifications';

// Global camera memory state
export const CURRENT_CAM = { pos: new THREE.Vector3(0, 2, 10), yaw: 0, pitch: 0 };
export const camTarget = {
  savedPos: new THREE.Vector3(0, 2, 10),
  savedYaw: 0,
  savedPitch: 0,
  hasSaved: false,
};

export const flyToStation = (x, y, z, yaw, pitch, saveCurrent = false, targetFov = null) => {
  if (saveCurrent) {
    camTarget.savedPos.copy(CURRENT_CAM.pos);
    camTarget.savedYaw = CURRENT_CAM.yaw;
    camTarget.savedPitch = CURRENT_CAM.pitch;
    camTarget.hasSaved = true;
  }
  window.dispatchEvent(new CustomEvent('camera-fly', { detail: { x, y, z, yaw, pitch, fov: targetFov } }));
};

export const returnCamera = () => {
  if (camTarget.hasSaved) {
    window.dispatchEvent(new CustomEvent('camera-fly', { 
      detail: { 
        x: camTarget.savedPos.x, 
        y: camTarget.savedPos.y, 
        z: camTarget.savedPos.z, 
        yaw: camTarget.savedYaw, 
        pitch: camTarget.savedPitch,
        fov: 62 // Base FOV
      } 
    }));
    camTarget.hasSaved = false;
  }
};

const ENV_PRESET = {
  activePalette: 'goldenHour',
  palettes: {
    goldenHour: {
      background: '#ffe099',
      fog: '#ffd2a6',
      fogNear: 20,
      fogFar: 140,
      skyTop: '#4a90e2',
      skyMid: '#ffb17a',
      skyBottom: '#ffe099',
      ambient: '#fff7ec',
      sun: '#ffedd5',
      dust: '#ffe8bc',
      haze: '#ffd39a',
      streetLamp: '#ffd166',
      windowGlow: '#ffd3a0',
      pedestrianRim: '#ffb980',
      carHead: '#fff4c2',
      carTail: '#ff6b6b',
      stationLights: [
        { color: '#5ca7f2', intensity: 1.45, position: [-9, 3, -1] },
        { color: '#e8b85a', intensity: 1.55, position: [-3, 3, 2] },
        { color: '#79d07a', intensity: 1.5, position: [3, 3, 2] },
        { color: '#df7b7b', intensity: 1.45, position: [9, 3, -1] },
        { color: '#bf9bff', intensity: 1.5, position: [15, 3, 2] }
      ],
      carColors: ['#f8fafc', '#cbd5e1', '#fca5a5', '#93c5fd', '#86efac', '#fcd34d']
    }
  },
  motion: {
    treeSway: 0.055,
    treeSpeed: 0.65,
    wireSway: 0.09,
    wireSpeed: 0.75,
    dustDrift: 2.6,
    hazePulse: 0.015,
    pedestrianBob: 0.05,
    pedestrianStride: 4.2,
    trafficBob: 0.02,
    lampFlicker: 0.16,
    windowFlickerSwing: 0.14,
    signalPulse: 0.35
  },
  quality: {
    desktop: {
      trafficCount: 6,
      pedestrianCount: 4,
      particleCount: 110,
      wireCount: 4,
      haze: true,
      updateDivisor: 1
    },
    mobile: {
      trafficCount: 3,
      pedestrianCount: 2,
      particleCount: 56,
      wireCount: 3,
      haze: false,
      updateDivisor: 2
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// True Free Camera — WASD + Drag Look (Touch Separate) + Breakaway GSAP Fly-To
// ─────────────────────────────────────────────────────────────────────────────
function CameraController({ mobileJoystick, highSensitivity, activeSection }) {
  const { camera } = useThree();
  const keys = useRef({});
  const activeRef = useRef(activeSection);
  const input = useRef({ 
      lookTouchId: null, lx: 0, ly: 0, 
      yaw: 0, pitch: 0, 
      targetYaw: 0, targetPitch: 0 
  });
  const vel = useRef(new THREE.Vector3());
  const curPos = useRef(new THREE.Vector3(0, 2, 10));

  useEffect(() => {
    activeRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const killFly = () => {
      gsap.killTweensOf(curPos.current);
      gsap.killTweensOf(input.current);
      gsap.killTweensOf(camera);
    };

    const handleFly = (e) => {
      const { x, y, z, yaw, pitch, fov } = e.detail;
      killFly();
      
      // Smooth natural walking motion: 1.5s power3.out
      gsap.to(curPos.current, { x, y, z, duration: 1.5, ease: "power3.out" });
      gsap.to(input.current, { targetYaw: yaw, targetPitch: pitch, duration: 1.5, ease: "power3.out" });
      
      if (fov !== undefined && fov !== null) {
        gsap.to(camera, { fov: fov, duration: 1.5, ease: "power2.out", onUpdate: () => camera.updateProjectionMatrix() });
      }
    };
    window.addEventListener('camera-fly', handleFly);

    const setKey = (code, val) => {
      keys.current[code] = val;
      if (val) killFly(); 
    };
    const kd = (e) => setKey(e.code, true);
    const ku = (e) => setKey(e.code, false);

    // Mouse controls (Desktop Drag Look)
    const mDown = (e) => {
      if (activeRef.current !== null) return;
      input.current.lookTouchId = 'mouse';
      input.current.lx = e.clientX; input.current.ly = e.clientY;
      killFly();
    };
    const mMove = (e) => {
      if (input.current.lookTouchId !== 'mouse') return;
      const dx = e.clientX - input.current.lx;
      const dy = e.clientY - input.current.ly;
      input.current.lx = e.clientX; input.current.ly = e.clientY;
      
      const sensitivity = highSensitivity ? 0.005 : 0.0025;
      input.current.targetYaw -= dx * sensitivity;
      input.current.targetPitch -= dy * sensitivity;
      input.current.targetPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, input.current.targetPitch));
    };
    const mUp = () => { input.current.lookTouchId = null; };

    // Multi-Touch Controls (Mobile separation of Joystick and Look)
    const tDown = (e) => {
      if (activeRef.current !== null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        // If touch is on the right side of the screen, it's a Look touch
        if (t.clientX >= window.innerWidth * 0.4 && input.current.lookTouchId === null) {
          input.current.lookTouchId = t.identifier;
          input.current.lx = t.clientX; input.current.ly = t.clientY;
          killFly();
        }
      }
    };
    const tMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === input.current.lookTouchId) {
          // Calculate delta, cap it against lag spikes
          let dx = t.clientX - input.current.lx;
          let dy = t.clientY - input.current.ly;
          if (dx > 50) dx = 50; if (dx < -50) dx = -50;
          if (dy > 50) dy = 50; if (dy < -50) dy = -50;
          
          input.current.lx = t.clientX; input.current.ly = t.clientY;
          
          const sensitivity = highSensitivity ? 0.005 : 0.0025;
          input.current.targetYaw -= dx * sensitivity;
          input.current.targetPitch -= dy * sensitivity;
          input.current.targetPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, input.current.targetPitch));
        }
      }
    };
    const tUp = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === input.current.lookTouchId) {
          input.current.lookTouchId = null;
        }
      }
    };

    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    window.addEventListener('mousedown', mDown); window.addEventListener('mousemove', mMove); window.addEventListener('mouseup', mUp);
    window.addEventListener('touchstart', tDown, { passive: true });
    window.addEventListener('touchmove', tMove, { passive: true });
    window.addEventListener('touchend', tUp);
    window.addEventListener('touchcancel', tUp);

    return () => {
      window.removeEventListener('camera-fly', handleFly);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('mousedown', mDown); window.removeEventListener('mousemove', mMove); window.removeEventListener('mouseup', mUp);
      window.removeEventListener('touchstart', tDown); window.removeEventListener('touchmove', tMove); window.removeEventListener('touchend', tUp); window.removeEventListener('touchcancel', tUp);
    };
  }, [highSensitivity]);

  useEffect(() => {
    if (mobileJoystick && (mobileJoystick.x !== 0 || mobileJoystick.y !== 0)) {
      gsap.killTweensOf(curPos.current);
      gsap.killTweensOf(input.current);
    }
  }, [mobileJoystick]);

  useFrame((state, delta) => {
    const k = keys.current;
    // Cap delta to avoid heavy lag spikes making user jump off map
    const dt = Math.min(delta, 0.1);
    const damp = (a, b, lambda) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-lambda * dt));

    // Update global reference manually for state restore
    CURRENT_CAM.pos.copy(curPos.current);
    CURRENT_CAM.yaw = input.current.yaw;
    CURRENT_CAM.pitch = input.current.pitch;

    const spd = 20;
    const accel = new THREE.Vector3();
    
    if (activeSection === null) {
      // Mathematical exact forward based on standard negative Z axis
      const fwdV = new THREE.Vector3(-Math.sin(input.current.yaw), 0, -Math.cos(input.current.yaw)).normalize();
      const rightV = new THREE.Vector3(Math.cos(input.current.yaw), 0, -Math.sin(input.current.yaw)).normalize();

      let moveX = mobileJoystick ? mobileJoystick.x : 0;
      let moveY = mobileJoystick ? mobileJoystick.y : 0;

      // WASD mapping: KeyW -> moveY=-1
      if (k['KeyW'] || k['ArrowUp']) moveY -= 1;
      if (k['KeyS'] || k['ArrowDown']) moveY += 1;
      if (k['KeyD'] || k['ArrowRight']) moveX += 1;
      if (k['KeyA'] || k['ArrowLeft']) moveX -= 1;

      const joyLen = Math.sqrt(moveX * moveX + moveY * moveY);
      if (joyLen > 1.0) { moveX /= joyLen; moveY /= joyLen; }

      if (moveY !== 0) accel.addScaledVector(fwdV, -moveY);
      if (moveX !== 0) accel.addScaledVector(rightV, moveX);

      if (accel.lengthSq() > 0) {
        accel.normalize().multiplyScalar(spd * Math.min(1.0, Math.max(0.1, joyLen || 1.0)));
      }
    }

    vel.current.lerp(accel, 1 - Math.exp(-10 * dt));
    
    if (vel.current.lengthSq() > 0.001) {
      curPos.current.addScaledVector(vel.current, dt);
    }

    const B = { xMin: -70, xMax: 70, zMin: -55, zMax: 55 };
    curPos.current.x = Math.max(B.xMin, Math.min(B.xMax, curPos.current.x));
    curPos.current.z = Math.max(B.zMin, Math.min(B.zMax, curPos.current.z));

    const t = state.clock.elapsedTime;
    const isMoving = vel.current.lengthSq() > 1;
    let bobY = 2 + Math.sin(t * 1.5) * 0.05;
    if (isMoving) bobY += Math.sin(t * 10) * 0.15; 
    
    curPos.current.y = Math.max(1.0, Math.min(50.0, curPos.current.y));
    
    camera.position.x = damp(camera.position.x, curPos.current.x, 15);
    camera.position.y = damp(camera.position.y, bobY, 10);
    camera.position.z = damp(camera.position.z, curPos.current.z, 15);

    input.current.yaw = damp(input.current.yaw, input.current.targetYaw, 15);
    input.current.pitch = damp(input.current.pitch, input.current.targetPitch, 15);

    const euler = new THREE.Euler(input.current.pitch, input.current.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  });

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE — Holographic ID terminal slab with scan animation
// ─────────────────────────────────────────────────────────────────────────────
function ProfileStation({ position, rotation, onActivate, isActive }) {
  const root    = useRef(); 
  const glowRef = useRef(); 
  const [hov, setHov] = useState(false);
  const C = '#4A90D9';

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!root.current) return;
    // Slow architectural breathing effect, very grounded
    root.current.position.y = position[1] + Math.sin(t * 0.8) * 0.04;
    
    if (glowRef.current) glowRef.current.material.opacity = (hov || isActive) ? 0.3 + Math.sin(t*3)*0.1 : 0.1;
  });

  const oe = () => { setHov(true);  document.body.style.cursor='pointer'; audio.hover(); if(root.current) gsap.to(root.current.scale,{x:1.06,y:1.06,z:1.06,duration:.3,ease:'power2.out'}); };
  const ol = () => { setHov(false); document.body.style.cursor='auto';   if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3}); };

  return (
    <group ref={root} position={position} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Grounding Shadow Plane */}
      <mesh position={[0,-1.0,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.5, 32]}/><meshBasicMaterial color="#000" transparent opacity={0.5}/></mesh>

      <group scale={1.2}>
        {/* Floor Decking */}
        <mesh position={[0, -0.85, 0]}>
          <boxGeometry args={[4.4, 0.2, 3.0]}/>
          <meshLambertMaterial color="#1e293b"/>
        </mesh>

        {/* Solid Back Wall */}
        <mesh position={[0, 0.6, -1.4]}>
          <boxGeometry args={[4.4, 3.2, 0.2]}/>
          <meshLambertMaterial color="#0b0f19"/>
        </mesh>

        {/* Solid Side Walls */}
        <mesh position={[-2.1, 0.6, 0]}>
          <boxGeometry args={[0.2, 3.2, 3.0]}/>
          <meshLambertMaterial color="#0f172a"/>
        </mesh>
        <mesh position={[2.1, 0.6, 0]}>
          <boxGeometry args={[0.2, 3.2, 3.0]}/>
          <meshLambertMaterial color="#0f172a"/>
        </mesh>

        {/* Sloped Awning / Roof */}
        <mesh position={[0, 2.3, -0.2]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[4.6, 0.2, 3.4]}/>
          <meshLambertMaterial color="#1e293b"/>
        </mesh>

        {/* Front Counter Structure */}
        <mesh position={[0, -0.3, 0.6]}>
          <boxGeometry args={[3.8, 1.0, 0.8]}/>
          <meshLambertMaterial color="#334155"/>
        </mesh>
        <mesh position={[0, 0.25, 0.6]}>
          <boxGeometry args={[4.0, 0.1, 1.0]}/>
          <meshLambertMaterial color="#475569"/>
        </mesh>

        {/* Glowing Counter Accent Strip */}
        <mesh position={[0, 0.1, 1.01]}>
          <boxGeometry args={[4.0, 0.05, 0.05]}/>
          <meshLambertMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1.2:0.4}/>
        </mesh>

        {/* Human Avatar Standing in front of counter */}
        <group position={[-1.0, -0.65, 1.4]} rotation={[0, 0.3, 0]}>
          {/* Torso */}
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.3, 0.4, 0.15]}/><meshLambertMaterial color="#3b82f6"/></mesh>
          {/* Head */}
          <mesh position={[0, 0.95, 0]}><boxGeometry args={[0.2, 0.25, 0.2]}/><meshLambertMaterial color="#fcd34d"/></mesh>
          {/* Legs */}
          <mesh position={[-0.08, 0.2, 0]}><boxGeometry args={[0.1, 0.4, 0.1]}/><meshLambertMaterial color="#1e293b"/></mesh>
          <mesh position={[0.08, 0.2, 0]}><boxGeometry args={[0.1, 0.4, 0.1]}/><meshLambertMaterial color="#1e293b"/></mesh>
          {/* Arms */}
          <mesh position={[-0.2, 0.6, 0]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.1, 0.35, 0.1]}/><meshLambertMaterial color="#3b82f6"/></mesh>
          <mesh position={[0.2, 0.6, 0]} rotation={[0, 0, -0.2]}><boxGeometry args={[0.1, 0.35, 0.1]}/><meshLambertMaterial color="#3b82f6"/></mesh>
        </group>

        {/* Holographic Datapads Floating above counter */}
        <group position={[0.5, 0.8, 0.5]}>
          <mesh position={[-0.8, 0, 0]} rotation={[0, 0.2, 0]}>
            <planeGeometry args={[1.2, 0.8]}/>
            <meshBasicMaterial color={C} transparent opacity={(hov||isActive)?0.6:0.2} side={THREE.DoubleSide}/>
          </mesh>
          <mesh position={[0.8, 0, 0]} rotation={[0, -0.2, 0]}>
            <planeGeometry args={[1.2, 0.8]}/>
            <meshBasicMaterial color={C} transparent opacity={(hov||isActive)?0.6:0.2} side={THREE.DoubleSide}/>
          </mesh>
        </group>

        {/* Roof Glowing Sign Geometry & Text */}
        <mesh position={[0, 2.5, 1.6]} ref={glowRef}>
          <boxGeometry args={[2.0, 0.6, 0.1]}/>
          <meshBasicMaterial color={C} transparent depthWrite={false} opacity={0.2}/>
        </mesh>
        <Html zIndexRange={[100, 0]} position={[0, 2.5, 1.7]} center transform style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:20,fontWeight:900,letterSpacing:'.3em',color:'#fff',textShadow:`0 0 16px ${C}`}}>PROFILE</Html>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS — Tech Van / Mobile Workstation
// ─────────────────────────────────────────────────────────────────────────────
function ProjectsStation({ position, rotation, onActivate, isActive }) {
  const root=useRef(); const diskRef=useRef(); const screensRef=useRef([]);
  const [hov,setHov]=useState(false);
  const C='#D4A843';

  useFrame((state)=>{
    const t=state.clock.elapsedTime;
    if(!root.current) return;
    root.current.position.y=position[1]+Math.sin(t*.5)*.06;
    if(diskRef.current) diskRef.current.rotation.y = t*0.8;
  });

  const oe=()=>{setHov(true);document.body.style.cursor='pointer';audio.hover();if(root.current) gsap.to(root.current.scale,{x:1.06,y:1.06,z:1.06,duration:.3,ease:'power2.out'});};
  const ol=()=>{setHov(false);document.body.style.cursor='auto';if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3});};

  return (
    <group frustumCulled={false} ref={root} position={position} rotation={rotation} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Grounding Shadow Plane */}
      <mesh position={[0,-0.9,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.8, 32]}/><meshBasicMaterial color="#000" transparent opacity={0.6}/></mesh>

      <group scale={1.25}>
        {/* Main Back Body (Tech Van box) */}
        <mesh position={[-0.2, 0.15, 0]}><boxGeometry args={[2.8, 1.6, 1.6]}/><meshLambertMaterial color="#f8fafc"/></mesh>
        
        {/* Accent Stripes */}
        <mesh position={[-0.2, -0.05, 0.81]}><boxGeometry args={[2.8, 0.2, 0.05]}/><meshLambertMaterial color={C}/></mesh>
        <mesh position={[-0.2, -0.05, -0.81]}><boxGeometry args={[2.8, 0.2, 0.05]}/><meshLambertMaterial color={C}/></mesh>

        {/* Front Cabin */}
        <mesh position={[1.8, -0.15, 0]}><boxGeometry args={[1.2, 1.0, 1.4]}/><meshLambertMaterial color="#f8fafc"/></mesh>
        
        {/* Windshield */}
        <mesh position={[1.5, 0.45, 0]} rotation={[0, 0, 0.4]}><boxGeometry args={[0.5, 0.4, 1.3]}/><meshStandardMaterial color="#0f172a" roughness={0.1}/></mesh>

        {/* Side Windows */}
        <mesh position={[1.8, 0.15, 0.71]}><boxGeometry args={[0.6, 0.4, 0.05]}/><meshLambertMaterial color="#0f172a"/></mesh>
        <mesh position={[1.8, 0.15, -0.71]}><boxGeometry args={[0.6, 0.4, 0.05]}/><meshLambertMaterial color="#0f172a"/></mesh>

        {/* Headlights & Grill */}
        <mesh position={[2.41, -0.25, 0.5]}><boxGeometry args={[0.05, 0.2, 0.3]}/><meshLambertMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8}/></mesh>
        <mesh position={[2.41, -0.25, -0.5]}><boxGeometry args={[0.05, 0.2, 0.3]}/><meshLambertMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8}/></mesh>
        <mesh position={[2.42, -0.25, 0]}><boxGeometry args={[0.05, 0.3, 0.6]}/><meshLambertMaterial color="#111"/></mesh>

        {/* Wheels & Hubcaps */}
        {[-1.0, 1.6].map((x) => (
          <group key={x}>
            <mesh position={[x, -0.55, -0.75]} rotation={[-Math.PI/2, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 0.3, 12]}/><meshLambertMaterial color="#050505"/></mesh>
            <mesh position={[x, -0.55, 0.75]} rotation={[-Math.PI/2, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 0.3, 12]}/><meshLambertMaterial color="#050505"/></mesh>
            <mesh position={[x, -0.55, -0.91]} rotation={[-Math.PI/2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 0.05, 8]}/><meshLambertMaterial color="#94a3b8"/></mesh>
            <mesh position={[x, -0.55, 0.91]} rotation={[-Math.PI/2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 0.05, 8]}/><meshLambertMaterial color="#94a3b8"/></mesh>
          </group>
        ))}

        {/* Antenna base */}
        <mesh position={[-1.0, 1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.4]}/><meshLambertMaterial color="#333"/></mesh>
        <group position={[-1.0, 1.35, 0]} ref={diskRef} rotation={[-0.3, 0, 0]}>
          <mesh><cylinderGeometry args={[0.6, 0.6, 0.05, 8]}/><meshLambertMaterial color="#555"/></mesh>
          <mesh position={[0,0.1,0]}><sphereGeometry args={[0.1]}/><meshBasicMaterial color={C} /></mesh>
        </group>
      </group>

      {/* Hovering Screens */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.45 + (i%2)*0.4, 1.0]} rotation={[-0.1, i*0.2, 0]}>
          <planeGeometry args={[0.8, 0.5]}/>
          <meshBasicMaterial color={C} transparent opacity={(hov||isActive)?0.7:0.3} side={THREE.DoubleSide}/>
        </mesh>
      ))}

      {/* Universal 3D Branding Sign */}
<mesh position={[0, 2.5, 0]} rotation={[0, 0.78, 0]}> {/* <--- Changed: Added rotation */}
        <boxGeometry args={[3.2, 0.8, 0.1]}/>
        <meshBasicMaterial color={C} transparent depthWrite={false} opacity={0.15}/>
      </mesh>
      
      <Html 
        zIndexRange={[100, 0]} 
        position={[0, 2.5, 0.1]} 
        rotation={[0, 0.78, 0]} 
        center 
        transform 
        style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:28,fontWeight:900,letterSpacing:'.3em',color:'#fff',textShadow:`0 0 16px ${C}`}}
      >
        PROJECTS
      </Html>
      <mesh position={[0,-1.98,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.5,32]}/><meshBasicMaterial color={C} transparent opacity={(hov||isActive) ? 0.2 : 0.05}/></mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS — Circular Glowing Lab / Bench
// ─────────────────────────────────────────────────────────────────────────────
function SkillsStation({ position, rotation, onActivate, isActive }) {
  const root=useRef(); 
  const signalLightRefs = useRef([]);
  const [hov,setHov]=useState(false);
  const C='#eab308'; // Traffic Yellow
  
  // Traffic Light cycle state: 0=Red, 1=Green, 2=Yellow
  const [lightState, setLightState] = useState(0);

  useEffect(() => {
    let timer;
    const cycle = () => {
      setLightState((prev) => {
        let next = (prev + 1) % 3;
        // Red lasts 4s, Green lasts 4s, Yellow lasts 1.5s
        let duration = next === 2 ? 1500 : 4000;
        timer = setTimeout(cycle, duration);
        return next;
      });
    };
    timer = setTimeout(cycle, 4000);
    return () => clearTimeout(timer);
  }, []);

  useFrame((state)=>{
    const t=state.clock.elapsedTime;
    if(!root.current) return;
    root.current.position.y=position[1]+Math.sin(t*.5)*.06;

    signalLightRefs.current.forEach((light, idx) => {
      if (!light) return;
      const pulse = 1 + Math.sin(t * 5 + idx) * ENV_PRESET.motion.signalPulse;
      const active = idx === lightState;
      light.intensity = active ? 1.4 * pulse : 0.08;
    });
  });

  const oe=()=>{setHov(true);document.body.style.cursor='pointer';audio.hover();if(root.current) gsap.to(root.current.scale,{x:1.06,y:1.06,z:1.06,duration:.3,ease:'power2.out'});};
  const ol=()=>{setHov(false);document.body.style.cursor='auto';if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3});};

  return (
    <group frustumCulled={false} ref={root} position={position} rotation={rotation} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Target/Click Hotspot Base */}
      <mesh position={[0,-1.0,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[3.0, 32]}/><meshBasicMaterial color="#000" transparent opacity={0.6}/></mesh>
      <mesh position={[0,-0.8,0]}><cylinderGeometry args={[1.4, 1.6, 0.4, 8]}/><meshLambertMaterial color="#1e293b"/></mesh>
      
      {/* Main Vertical Signal Pole */}
      <mesh position={[1.0, 1.5, 0]}><cylinderGeometry args={[0.2, 0.25, 5.0, 12]}/><meshLambertMaterial color="#475569"/></mesh>
      {/* Pole Base Flange */}
      <mesh position={[1.0, -0.9, 0]}><cylinderGeometry args={[0.4, 0.5, 0.3, 12]}/><meshLambertMaterial color="#334155"/></mesh>
      
      {/* Traffic Control Sidewalk Cabinet (Grey electrical box) */}
      <group position={[2.5, -0.4, -0.8]}>
        <mesh><boxGeometry args={[1.0, 1.2, 0.8]}/><meshLambertMaterial color="#94a3b8"/></mesh>
        <mesh position={[0, 0, 0.41]}><boxGeometry args={[0.8, 1.0, 0.05]}/><meshLambertMaterial color="#cbd5e1"/></mesh>
      </group>

      {/* Tall horizontal Boom Arm reaching over intersection */}
      <mesh position={[-2.5, 3.8, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.15, 0.15, 7.0, 8]}/><meshLambertMaterial color="#475569"/></mesh>
      {/* Diagonal Support Truss */}
      <mesh position={[-1.0, 2.8, 0]} rotation={[0, 0, -Math.PI/4]}><cylinderGeometry args={[0.08, 0.08, 3.0, 8]}/><meshLambertMaterial color="#475569"/></mesh>

      {/* Hanging Traffic Signals (Yellow housing) */}
      {[-0.5, -2.5, -4.5].map((x, idx) => (
        <group key={idx} position={[x, 2.8, 0]}>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.6, 1.6, 0.6]}/><meshLambertMaterial color="#eab308"/></mesh>
          <mesh position={[0, 0, 0.1]}><boxGeometry args={[0.5, 1.5, 0.55]}/><meshLambertMaterial color="#111"/></mesh>
          
          {/* Lenses */}
          <mesh position={[0, 0.45, 0.4]}>
            <circleGeometry args={[0.18, 16]}/>
            <meshLambertMaterial color={lightState===0 ? "#ef4444" : "#451a1a"} emissive="#ef4444" emissiveIntensity={lightState===0 ? ((hov||isActive)?1.8:1.2) : 0.0}/>
          </mesh>
          <mesh position={[0, 0.0, 0.4]}>
            <circleGeometry args={[0.18, 16]}/>
            <meshLambertMaterial color={lightState===2 ? "#f59e0b" : "#4a2d04"} emissive="#f59e0b" emissiveIntensity={lightState===2 ? ((hov||isActive)?1.8:1.2) : 0.0}/>
          </mesh>
          <mesh position={[0, -0.45, 0.4]}>
            <circleGeometry args={[0.18, 16]}/>
            <meshLambertMaterial color={lightState===1 ? "#22c55e" : "#093816"} emissive="#22c55e" emissiveIntensity={lightState===1 ? ((hov||isActive)?1.8:1.2) : 0.0}/>
          </mesh>
        </group>
      ))}

      <pointLight ref={(el) => { signalLightRefs.current[0] = el; }} position={[-2.5, 3.25, 0.9]} color="#ef4444" distance={6} intensity={0.1} />
      <pointLight ref={(el) => { signalLightRefs.current[1] = el; }} position={[-2.5, 2.8, 0.9]} color="#22c55e" distance={6} intensity={0.1} />
      <pointLight ref={(el) => { signalLightRefs.current[2] = el; }} position={[-2.5, 3.02, 0.9]} color="#f59e0b" distance={5} intensity={0.1} />

      <mesh position={[0,-1.98,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.0,32]}/><meshBasicMaterial color={C} transparent opacity={(hov||isActive) ? 0.2 : 0.05}/></mesh>

      {/* Universal 3D Branding Sign attached to the pole */}
      <mesh position={[1.5, 4.6, 0]} rotation={[0, 0.26, 0]}>
        <boxGeometry args={[2.8, 0.8, 0.1]}/>
        <meshBasicMaterial color={C} transparent opacity={0.15}/>
      </mesh>
      <Html zIndexRange={[100, 0]} position={[1.5, 4.6, 0.1]} rotation={[0, -1, 0]} center transform style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:28,fontWeight:900,letterSpacing:'.3em',color:'#fff',textShadow:`0 0 16px ${C}`}}>SKILLS</Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT — Cinematic Telephone Booth
// ─────────────────────────────────────────────────────────────────────────────
function ContactStation({ position, rotation, onActivate, isActive }) {
  const root=useRef();
  const [hov,setHov]=useState(false);
  const C='#D46A6A';

  useFrame((state)=>{
    if(!root.current) return;
    root.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*.5+3)*.08;
  });

  const oe=()=>{setHov(true);document.body.style.cursor='pointer';audio.hover();if(root.current) gsap.to(root.current.scale,{x:1.06,y:1.06,z:1.06,duration:.3,ease:'power2.out'});};
  const ol=()=>{setHov(false);document.body.style.cursor='auto';if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3});};

  return (
    <group frustumCulled={false} ref={root} position={position} rotation={rotation} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Grounding Shadow Plane */}
      <mesh frustumCulled={false} position={[0,-1.3,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[1.8, 32]}/><meshBasicMaterial color="#000" transparent opacity={0.6}/></mesh>

      <group scale={0.95}>
        {/* Concrete platform base */}
        <mesh frustumCulled={false} position={[0,-1.05,0]}><boxGeometry args={[1.8, 0.1, 1.8]}/><meshLambertMaterial color="#2d3748"/></mesh>

        {/* Booth Base Floor */}
        <mesh frustumCulled={false} position={[0,-0.9,0]}><boxGeometry args={[1.4, 0.2, 1.4]}/><meshLambertMaterial color="#b91c1c"/></mesh>
        
        {/* 4 Corner Pillars (Red) */}
        {[-0.6, 0.6].map((x) => 
          [-0.6, 0.6].map((z) => (
            <mesh frustumCulled={false} key={`${x}-${z}`} position={[x, 0.3, z]}>
              <boxGeometry args={[0.15, 2.2, 0.15]}/>
              <meshLambertMaterial color="#b91c1c"/>
            </mesh>
          ))
        )}

        {/* Translucent Glass Panes */}
        <mesh frustumCulled={false} position={[0, 0.3, 0]}>
          <boxGeometry args={[1.25, 2.1, 1.25]}/>
          <meshBasicMaterial color="#38bdf8" transparent depthWrite={false} opacity={(hov||isActive)?0.3:0.15} side={THREE.DoubleSide}/>
        </mesh>

        {/* Booth Roof */}
        <mesh frustumCulled={false} position={[0, 1.5, 0]}><boxGeometry args={[1.45, 0.2, 1.45]}/><meshLambertMaterial color="#b91c1c"/></mesh>
        <mesh frustumCulled={false} position={[0, 1.7, 0]}><boxGeometry args={[1.0, 0.2, 1.0]}/><meshStandardMaterial color="#b91c1c" roughness={0.7}/></mesh>
        <mesh frustumCulled={false} position={[0, 1.85, 0]}><sphereGeometry args={[0.15]}/><meshLambertMaterial color="#f87171"/></mesh>

        {/* Telephone inside */}
        <mesh frustumCulled={false} position={[0, 0.4, -0.4]}><boxGeometry args={[0.4, 0.6, 0.15]}/><meshLambertMaterial color="#111"/></mesh>
        {/* Glowing Screen/Buttons inside */}
        <mesh frustumCulled={false} position={[0, 0.5, -0.32]}><boxGeometry args={[0.2, 0.3, 0.05]}/><meshLambertMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1.1:0.4}/></mesh>

        {/* Universal 3D Branding Sign (Contact) placed atop the Booth */}
        <mesh frustumCulled={false} position={[0, 2.8, 0]}>
          <boxGeometry args={[3.2, 0.8, 0.1]}/>
          <meshBasicMaterial color={C} transparent depthWrite={false} opacity={0.15} side={THREE.DoubleSide}/>
        </mesh>
        <Html zIndexRange={[100, 0]} position={[0, 2.8, 0.1]} center transform style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:28,fontWeight:900,letterSpacing:'.3em',color:'#fff',textShadow:`0 0 16px ${C}`}}>CONTACT</Html>
      </group>

      <mesh frustumCulled={false} position={[0,-1.98,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[1.4,32]}/><meshBasicMaterial color={C} transparent opacity={(hov||isActive) ? 0.2 : 0.08}/></mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATIONS — Solid Trophy Wall Diorama
// ─────────────────────────────────────────────────────────────────────────────
function CertificationsStation({ position, rotation, onActivate, isActive }) {
  const root = useRef();
  const [hov, setHov] = useState(false);
  const C = '#B388FF';

  useFrame((state) => {
    if (!root.current) return;
    root.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.4 + 2) * 0.05;
  });

  const oe = () => { setHov(true); document.body.style.cursor='pointer'; audio.hover(); if(root.current) gsap.to(root.current.scale,{x:1.05,y:1.05,z:1.05,duration:.3,ease:'power2.out'}); };
  const ol = () => { setHov(false); document.body.style.cursor='auto'; if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3}); };

  return (
    <group frustumCulled={false} ref={root} position={position} rotation={rotation} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Grounding Shadow Plane */}
      <mesh frustumCulled={false} position={[0,-1.0,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[3.5, 32]}/><meshBasicMaterial color="#000" transparent opacity={0.6}/></mesh>

      <group scale={3.6}>
        {/* Huge Pillar Supports */}
        {[-1.6, 1.6].map((x) => (
          <group key={x}>
            {/* Concrete Footer */}
            <mesh frustumCulled={false} position={[x, -0.6, 0]}><cylinderGeometry args={[0.4, 0.5, 0.6, 8]}/><meshLambertMaterial color="#1e293b"/></mesh>
            {/* Metal Pole */}
            <mesh frustumCulled={false} position={[x, 0.4, 0]}><cylinderGeometry args={[0.15, 0.15, 1.8, 8]}/><meshLambertMaterial color="#334155"/></mesh>
          </group>
        ))}

        {/* Billboard Frame */}
        <mesh frustumCulled={false} position={[0, 1.6, 0]}><boxGeometry args={[4.8, 2.6, 0.4]}/><meshLambertMaterial color="#0f172a"/></mesh>

        {/* Billboard Glowing Screen Surface */}
        <mesh frustumCulled={false} position={[0, 1.6, 0.21]}>
          <boxGeometry args={[4.4, 2.2, 0.05]}/>
          <meshLambertMaterial color="#0b0f19" emissive={C} emissiveIntensity={(hov||isActive)?0.4:0.1} side={THREE.DoubleSide}/>
        </mesh>
        
        {/* Main Text on Billboard */}
        <Html zIndexRange={[100, 0]} position={[0, 1.6, 0.25]} center transform style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:26,fontWeight:900,letterSpacing:'.2em',color:'#fff',textShadow:`0 0 24px ${C}`}}>CERTIFICATIONS</Html>
      </group>

      <mesh frustumCulled={false} position={[0,-1.98,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.0,32]}/><meshBasicMaterial color={C} transparent opacity={(hov||isActive) ? 0.2 : 0.05}/></mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT: Road, City Buildings, Trees, Atmospherics
// ─────────────────────────────────────────────────────────────────────────────
function SunsetSky({ palette }) {
  const shader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      colorTop: { value: new THREE.Color(palette.skyTop) },
      colorMid: { value: new THREE.Color(palette.skyMid) },
      colorBtm: { value: new THREE.Color(palette.skyBottom) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 colorTop;
      uniform vec3 colorMid;
      uniform vec3 colorBtm;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 col = mix(colorBtm, colorMid, smoothstep(-0.1, 0.25, h));
        col = mix(col, colorTop, smoothstep(0.25, 0.6, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false
  }), [palette.skyBottom, palette.skyMid, palette.skyTop]);

  return <mesh renderOrder={-1000}><sphereGeometry args={[150, 32, 32]}/><primitive object={shader} attach="material"/></mesh>;
}

function WindyTrees({ data, motion }) {
  const swayRefs = useRef([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < data.length; i++) {
      const swayRoot = swayRefs.current[i];
      if (!swayRoot) continue;
      const sway = Math.sin(t * motion.treeSpeed + data[i].phase) * motion.treeSway;
      swayRoot.rotation.z = sway;
      swayRoot.rotation.x = sway * 0.12;
      swayRoot.position.y = Math.sin(t * 0.7 + data[i].phase) * 0.04;

      const foliage = swayRoot.children[1];
      if (foliage) {
        foliage.rotation.z = sway * 0.7;
        foliage.rotation.y = Math.sin(t * 0.35 + data[i].phase) * 0.12;
      }
    }
  });

  return <>{data.map((t, i) => (
    <group key={i} position={[t.x, 0, t.z]} scale={t.scale} rotation={[0, t.rot, 0]}>
      <group ref={(el) => { swayRefs.current[i] = el; }}>
        <mesh position={[0, t.h/2, 0]}>
          <cylinderGeometry args={[0.15, 0.25, t.h, 4]}/>
          <meshLambertMaterial color="#1f110a"/>
        </mesh>
        <group position={[0, t.h, 0]}>
          <mesh position={[0, 1.5, 0]}>
            <coneGeometry args={[1.6, 3.5, 4]}/>
            <meshLambertMaterial color="#0b2413"/>
          </mesh>
          <mesh position={[0, 2.8, 0]}>
            <coneGeometry args={[1.0, 2.0, 4]}/>
            <meshLambertMaterial color="#16381d"/>
          </mesh>
        </group>
      </group>
    </group>
  ))}</>;
}

function StreetProps({ data, motion, palette }) {
  const glowRefs = useRef([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < glowRefs.current.length; i++) {
      const glow = glowRefs.current[i];
      if (!glow) continue;
      const pulse = 0.52 + Math.sin(t * 1.4 + data[i].phase) * motion.lampFlicker;
      glow.material.opacity = Math.max(0.18, Math.min(0.72, pulse));
    }
  });

  return <>{data.map((l, i) => (
    <group key={`prop-${i}`} position={[l.x, 0, l.z]}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 5, 4]}/>
        <meshLambertMaterial color="#111"/>
      </mesh>
      <mesh position={[0, 4.8, (l.z<0?0.6:-0.6)]}>
        <cylinderGeometry args={[0.02, 0.03, 1.4, 4]} rotation={[Math.PI/2, 0, 0]}/>
        <meshLambertMaterial color="#111"/>
      </mesh>
      <mesh position={[0, 4.8, (l.z<0?1.2:-1.2)]}>
        <boxGeometry args={[0.3, 0.08, 0.5]}/>
        <meshLambertMaterial color="#050505"/>
      </mesh>
      <mesh ref={(el) => { glowRefs.current[i] = el; }} position={[0, 4.75, (l.z<0?1.2:-1.2)]} rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[0.2, 0.4]}/>
        <meshBasicMaterial color={palette.streetLamp} transparent opacity={0.5}/>
      </mesh>
      <mesh position={[0.4, 0.4, (l.z<0?-0.6:0.6)]}>
        <boxGeometry args={[0.4, 0.8, 0.4]}/>
        <meshLambertMaterial color="#1c1f24"/>
      </mesh>
    </group>
  ))}</>;
}

function TrafficCar({ car, route, motion, palette }) {
  const root = useRef();

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    const routeLength = Math.abs(route.to - route.from);
    const travel = (t * car.speed + car.offset * routeLength) % routeLength;
    const axisValue = route.from < route.to ? route.from + travel : route.from - travel;

    if (route.axis === 'x') {
      root.current.position.set(axisValue, 0.12 + Math.sin(t * 4 + car.phase) * motion.trafficBob, route.coord + car.laneOffset);
    } else {
      root.current.position.set(route.coord + car.laneOffset, 0.12 + Math.sin(t * 4 + car.phase) * motion.trafficBob, axisValue);
    }
    root.current.rotation.y = route.rotation;
  });

  return (
    <group ref={root} frustumCulled={false} scale={car.scale}>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[1.9, 0.42, 0.96]}/>
        <meshStandardMaterial color={car.color} roughness={0.72}/>
      </mesh>
      <mesh position={[0.18, 0.5, 0]}>
        <boxGeometry args={[0.98, 0.3, 0.78]}/>
        <meshStandardMaterial color="#d9e2ec" roughness={0.35}/>
      </mesh>
      {[-0.5, 0.5].map((z) => (
        <group key={z}>
          <mesh position={[-0.58, 0.03, z]} rotation={[-Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.16, 10]}/>
            <meshStandardMaterial color="#09090b" roughness={0.95}/>
          </mesh>
          <mesh position={[0.58, 0.03, z]} rotation={[-Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.16, 10]}/>
            <meshStandardMaterial color="#09090b" roughness={0.95}/>
          </mesh>
        </group>
      ))}
      <mesh position={[0.99, 0.24, 0.24]}>
        <boxGeometry args={[0.08, 0.1, 0.14]}/>
        <meshLambertMaterial color={palette.carHead} emissive={palette.carHead} emissiveIntensity={0.65}/>
      </mesh>
      <mesh position={[0.99, 0.24, -0.24]}>
        <boxGeometry args={[0.08, 0.1, 0.14]}/>
        <meshLambertMaterial color={palette.carHead} emissive={palette.carHead} emissiveIntensity={0.65}/>
      </mesh>
      <mesh position={[-0.99, 0.24, 0.24]}>
        <boxGeometry args={[0.07, 0.1, 0.14]}/>
        <meshLambertMaterial color={palette.carTail} emissive={palette.carTail} emissiveIntensity={0.45}/>
      </mesh>
      <mesh position={[-0.99, 0.24, -0.24]}>
        <boxGeometry args={[0.07, 0.1, 0.14]}/>
        <meshLambertMaterial color={palette.carTail} emissive={palette.carTail} emissiveIntensity={0.45}/>
      </mesh>
    </group>
  );
}

function TrafficFlow({ profile, palette, motion }) {
  const routes = useMemo(() => ([
    { axis: 'x', from: -92, to: 92, coord: -2.4, rotation: 0 },
    { axis: 'x', from: 92, to: -92, coord: 2.4, rotation: Math.PI },
    { axis: 'z', from: -50, to: 50, coord: 27.8, rotation: -Math.PI/2 }
  ]), []);

  const cars = useMemo(() => {
    const counts = routes.map((_, routeIndex) => Math.floor(profile.trafficCount / routes.length) + (routeIndex < (profile.trafficCount % routes.length) ? 1 : 0));
    const items = [];

    routes.forEach((_, routeIndex) => {
      const laneCount = counts[routeIndex];
      for (let j = 0; j < laneCount; j++) {
        items.push({
          id: `car-${routeIndex}-${j}`,
          routeIndex,
          offset: laneCount === 1 ? 0.17 * (routeIndex + 1) : j / laneCount,
          speed: 8.5 + routeIndex * 1.1 + j * 0.45,
          scale: 1.28 + ((routeIndex + j) % 3) * 0.1,
          laneOffset: ((j % 2) - 0.5) * 0.18,
          phase: routeIndex * 1.7 + j * 0.9,
          color: palette.carColors[(routeIndex * 2 + j) % palette.carColors.length]
        });
      }
    });

    return items;
  }, [palette.carColors, profile.trafficCount, routes]);

  return <>{cars.map((car) => (
    <TrafficCar key={car.id} car={car} route={routes[car.routeIndex]} motion={motion} palette={palette}/>
  ))}</>;
}

function PedestrianWalker({ walker, motion, palette }) {
  const root = useRef();
  const torso = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    const routeLength = Math.abs(walker.to - walker.from);
    const travel = (t * walker.speed + walker.offset * routeLength) % routeLength;
    const x = walker.from < walker.to ? walker.from + travel : walker.from - travel;
    const stride = Math.sin(t * motion.pedestrianStride + walker.phase);

    root.current.position.set(x, 0.02, walker.z);
    root.current.rotation.y = walker.from < walker.to ? -Math.PI / 2 : Math.PI / 2;

    if (torso.current) torso.current.position.y = 0.82 + Math.abs(stride) * motion.pedestrianBob;
    if (leftLeg.current) leftLeg.current.rotation.x = stride * 0.55;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride * 0.55;
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.45;
    if (rightArm.current) rightArm.current.rotation.x = stride * 0.45;
  });

  return (
    <group ref={root} frustumCulled={false} scale={walker.scale}>
      <mesh ref={torso} position={[0, 0.82, 0]}>
        <capsuleGeometry args={[0.11, 0.52, 4, 8]}/>
        <meshStandardMaterial color="#14171f" emissive={palette.pedestrianRim} emissiveIntensity={0.08} roughness={0.92}/>
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.13, 10, 10]}/>
        <meshStandardMaterial color="#171923" roughness={0.95}/>
      </mesh>
      <mesh ref={leftLeg} position={[-0.08, 0.34, 0]}>
        <boxGeometry args={[0.09, 0.62, 0.1]}/>
        <meshStandardMaterial color="#0b0d12" roughness={0.95}/>
      </mesh>
      <mesh ref={rightLeg} position={[0.08, 0.34, 0]}>
        <boxGeometry args={[0.09, 0.62, 0.1]}/>
        <meshStandardMaterial color="#0b0d12" roughness={0.95}/>
      </mesh>
      <mesh ref={leftArm} position={[-0.2, 0.88, 0]}>
        <boxGeometry args={[0.08, 0.48, 0.08]}/>
        <meshStandardMaterial color="#121722" roughness={0.95}/>
      </mesh>
      <mesh ref={rightArm} position={[0.2, 0.88, 0]}>
        <boxGeometry args={[0.08, 0.48, 0.08]}/>
        <meshStandardMaterial color="#121722" roughness={0.95}/>
      </mesh>
    </group>
  );
}

function PedestrianHints({ profile, palette, motion }) {
  const routes = useMemo(() => ([
    { from: -84, to: -46, z: 8.85, phase: 0.2 },
    { from: -42, to: -82, z: -8.85, phase: 1.1 },
    { from: 38, to: 82, z: 8.85, phase: 2.2 },
    { from: 80, to: 40, z: -8.85, phase: 3.3 }
  ]), []);

  const routeIndexes = profile.pedestrianCount <= 2 ? [0, 2] : [0, 1, 2, 3];
  const walkers = useMemo(() => routeIndexes.map((routeIndex, i) => ({
    id: `walker-${routeIndex}`,
    ...routes[routeIndex],
    offset: 0.18 + i * 0.23,
    speed: 3.1 + i * 0.18,
    scale: 0.95 + i * 0.04
  })), [routeIndexes, routes]);

  return <>{walkers.map((walker) => (
    <PedestrianWalker key={walker.id} walker={walker} motion={motion} palette={palette}/>
  ))}</>;
}

function SuspendedStreetDetails({ count, motion, palette }) {
  const refs = useRef([]);
  const details = useMemo(() => ([
    { x: 25, y: 8.4, z: -7.4, length: 14.5, phase: 0.4, banner: true },
    { x: 25, y: 8.7, z: -2.0, length: 14.0, phase: 1.1, banner: false },
    { x: 25, y: 8.2, z: 3.4, length: 13.2, phase: 2.1, banner: true },
    { x: 25, y: 8.5, z: 8.3, length: 14.8, phase: 3.2, banner: false }
  ]).slice(0, count), [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < details.length; i++) {
      const item = refs.current[i];
      if (!item) continue;
      item.rotation.z = Math.sin(t * motion.wireSpeed + details[i].phase) * motion.wireSway;
      item.position.y = details[i].y + Math.sin(t * motion.wireSpeed * 0.5 + details[i].phase) * 0.08;
    }
  });

  return <>{details.map((detail, i) => (
    <group key={`wire-${i}`} ref={(el) => { refs.current[i] = el; }} position={[detail.x, detail.y, detail.z]}>
      <mesh>
        <boxGeometry args={[detail.length, 0.04, 0.04]}/>
        <meshBasicMaterial color="#6b7280"/>
      </mesh>
      {detail.banner && (
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[0.9, 0.34, 0.02]}/>
          <meshBasicMaterial color={palette.haze} transparent opacity={0.28}/>
        </mesh>
      )}
    </group>
  ))}</>;
}

function AtmosphericFX({ profile, palette, motion }) {
  const hazeRef = useRef();
  const pointsRef = useRef();
  const tickRef = useRef(0);

  const particles = useMemo(() => Array.from({ length: profile.particleCount }).map((_, i) => ({
    x: -104 + (i % 18) * 12 + (i % 3) * 1.3,
    y: 0.8 + (i % 7) * 0.52,
    z: -8.5 + (i % 11) * 1.6,
    drift: 0.65 + (i % 5) * 0.09,
    phase: i * 0.73
  })), [profile.particleCount]);

  const positionArray = useMemo(() => {
    const arr = new Float32Array(profile.particleCount * 3);
    particles.forEach((particle, i) => {
      arr[i * 3] = particle.x;
      arr[i * 3 + 1] = particle.y;
      arr[i * 3 + 2] = particle.z;
    });
    return arr;
  }, [particles, profile.particleCount]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (hazeRef.current) {
      hazeRef.current.material.opacity = 0.055 + Math.sin(t * 0.35) * motion.hazePulse;
      hazeRef.current.position.z = Math.sin(t * 0.22) * 0.45;
    }

    if (!pointsRef.current) return;
    tickRef.current = (tickRef.current + 1) % profile.updateDivisor;
    if (tickRef.current !== 0) return;

    const attr = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      attr.array[i * 3] = ((((particle.x + t * motion.dustDrift * particle.drift) + 110) % 220) - 110);
      attr.array[i * 3 + 1] = particle.y + Math.sin(t * 0.8 + particle.phase) * 0.12;
      attr.array[i * 3 + 2] = particle.z + Math.sin(t * 0.45 + particle.phase) * 0.35;
    }
    attr.needsUpdate = true;
  });

  return (
    <>
      {profile.haze && (
        <mesh ref={hazeRef} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.09, 0]}>
          <planeGeometry args={[188, 16]}/>
          <meshBasicMaterial color={palette.haze} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false}/>
        </mesh>
      )}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positionArray} count={positionArray.length / 3} itemSize={3}/>
        </bufferGeometry>
        <pointsMaterial color={palette.dust} size={0.22} transparent opacity={0.38} depthWrite={false}/>
      </points>
    </>
  );
}

function GameEnvironment({ palette, profile, motion }) {
  const rs = Math.random;
  const buildingMaterialRefs = useRef([]);

  const windowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#030408';
    ctx.fillRect(0,0,512,512);
    
    const cols = 6; const rows = 12;
    const wWidth = 50; const wHeight = 24;
    const padX = (512 - (cols * wWidth)) / (cols + 1);
    const padY = (512 - (rows * wHeight)) / (rows + 1);
    
    const colors = ['#030408', '#030408', '#030408', '#ffcca8', '#ffffff', '#ff9966'];
    for(let row=0; row<rows; row++) {
      for(let col=0; col<cols; col++) {
        // Vertical stripes for modern skyscraper look
        if (col % 2 === 0 && rs() > 0.2) continue; 
        const x = padX + col*(wWidth + padX);
        const y = padY + row*(wHeight + padY);
        ctx.fillStyle = colors[Math.floor(rs() * colors.length)];
        ctx.fillRect(x, y, wWidth, wHeight);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);


  // INCREASED DENSITY for more city feel
  const buildings = useMemo(() => Array.from({length: 45}).map(() => {
    const x = (rs() * 260) - 130; 
    const side = rs() > 0.5 ? 1 : -1;
    // Pushed bounds further out to prevent overlapping with user's custom station placements
    const z = side === 1 ? (45 + rs() * 25) : (-35 - rs() * 20); 
    const width = 8 + rs() * 14;
    const depth = 8 + rs() * 14;
    const height = 20 + rs() * 60; 
    const hue = (210 + rs()*30)/360; 
    const col = new THREE.Color().setHSL(hue, 0.25, 0.65); 
    const hasTier = rs() > 0.4;
    
    // Add organic asymmetry to the upper tier
    const tierOffsetX = (rs() - 0.5) * width * 0.35;
    const tierOffsetZ = (rs() - 0.5) * depth * 0.35;
    
    return {
      x,
      z,
      width,
      height,
      depth,
      col,
      hasTier,
      tierHeight: height + 10 + rs()*15,
      tierWidth: width*0.6,
      tierDepth: depth*0.6,
      tierOffsetX,
      tierOffsetZ,
      windowPhase: rs() * Math.PI * 2,
      windowSpeed: 0.35 + rs() * 0.9,
      windowBase: 0.08 + rs() * 0.08
    };
  }), []);

  const trees = useMemo(() => Array.from({length: 45}).map(() => {
    const x = (rs() * 260) - 130;
    const side = rs() > 0.5 ? 1 : -1;
    // Pushed trees back symmetrically
    const z = side === 1 ? (30 + rs() * 12) : (-22 - rs() * 10);
    return { x, z, h: 2 + rs()*1.5, scale: 0.7 + rs()*0.6, rot: rs()*Math.PI*2, phase: rs() * Math.PI * 2 };
  }), []);

  const bgBuildings = useMemo(() => Array.from({length: 60}).map(() => {
    const x = (rs() * 400) - 200; 
    const side = rs() > 0.5 ? 1 : -1;
    const z = side === 1 ? (80 + rs() * 80) : (-70 - rs() * 80); 
    const width = 15 + rs() * 25;
    const depth = 15 + rs() * 25;
    const height = 60 + rs() * 120; 
    return { x, z, width, height, depth };
  }), []);

  const props = useMemo(() => {
    const arr = [];
    for(let x=-48; x<=48; x+=24) { 
      if(x !== 0 && x !== 24) { // Don't block the new x=25 intersection!
        arr.push({ x: x+rs()*2, z: -5.5, phase: rs() * Math.PI * 2 });
        arr.push({ x: x+6+rs()*2, z: 5.5, phase: rs() * Math.PI * 2 });
      }
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < buildings.length; i++) {
      const flicker = buildings[i].windowBase
        + Math.max(0, Math.sin(t * buildings[i].windowSpeed + buildings[i].windowPhase)) * motion.windowFlickerSwing
        + (Math.sin(t * 0.45 + buildings[i].windowPhase * 2) > 0.985 ? 0.18 : 0);

      const materialA = buildingMaterialRefs.current[i * 2];
      const materialB = buildingMaterialRefs.current[i * 2 + 1];
      if (materialA) materialA.emissiveIntensity = flicker;
      if (materialB) materialB.emissiveIntensity = flicker * 0.92;
    }
  });

  return (
    <group position={[0,-2.0,0]}>
      <SunsetSky palette={palette} />

      {/* Far Background Skyline */}
      <group>
        {bgBuildings.map((b, i) => (
          <mesh key={`bg-${i}`} position={[b.x, b.height/2 - 2, b.z]}>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshBasicMaterial color="#8ba3c7" />
          </mesh>
        ))}
      </group>

      {/* City Ground */}
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <planeGeometry args={[280, 280]}/>
        <meshStandardMaterial color="#2d3748" roughness={1} metalness={0}/>
      </mesh>

      {/* Main Road */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]} receiveShadow>
        <planeGeometry args={[260, 14]}/>
        <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.1}/>
      </mesh>

      {/* Perpendicular Intersection Junction (strictly for Skills Station) */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[25,0.012,0]} receiveShadow>
        <planeGeometry args={[14, 120]}/>
        <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.1}/>
      </mesh>

      <AtmosphericFX profile={profile} palette={palette} motion={motion}/>
      <SuspendedStreetDetails count={profile.wireCount} motion={motion} palette={palette}/>
      <TrafficFlow profile={profile} palette={palette} motion={motion}/>
      <PedestrianHints profile={profile} palette={palette} motion={motion}/>

      {/* Intersection Zebra Crossing / Markings */}
      <group position={[25, 0.015, 0]}>
        {/* Intersection center Box (Blank) */}
        <mesh rotation={[-Math.PI/2,0,0]}>
          <planeGeometry args={[14, 14]}/>
          <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.1}/>
        </mesh>
        
        {/* Zebra Stripes (North/South crossings) */}
        {[-5.5, -3.5, -1.5, 0.5, 2.5, 4.5, 6.5].map((ox) => (
          <mesh key={`ns-${ox}`} rotation={[-Math.PI/2,0,0]} position={[ox, 0.005, 7.5]}>
            <planeGeometry args={[0.5, 2.0]}/>
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/>
          </mesh>
        ))}
        {[-5.5, -3.5, -1.5, 0.5, 2.5, 4.5, 6.5].map((ox) => (
          <mesh key={`ns2-${ox}`} rotation={[-Math.PI/2,0,0]} position={[ox, 0.005, -7.5]}>
            <planeGeometry args={[0.5, 2.0]}/>
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/>
          </mesh>
        ))}

        {/* Zebra Stripes (East/West crossings) */}
        {[-5.5, -3.5, -1.5, 0.5, 2.5, 4.5, 6.5].map((oz) => (
          <mesh key={`ew-${oz}`} rotation={[-Math.PI/2,0,Math.PI/2]} position={[-7.5, 0.005, oz]}>
            <planeGeometry args={[0.5, 2.0]}/>
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/>
          </mesh>
        ))}
        {[-5.5, -3.5, -1.5, 0.5, 2.5, 4.5, 6.5].map((oz) => (
          <mesh key={`ew2-${oz}`} rotation={[-Math.PI/2,0,Math.PI/2]} position={[7.5, 0.005, oz]}>
            <planeGeometry args={[0.5, 2.0]}/>
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/>
          </mesh>
        ))}

        {/* Solid Stop Lines */}
        <mesh rotation={[-Math.PI/2,0,0]} position={[0, 0.005, 9.5]}><planeGeometry args={[14, 0.4]}/><meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0, 0.005, -9.5]}><planeGeometry args={[14, 0.4]}/><meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[9.5, 0.005, 0]}><planeGeometry args={[0.4, 14]}/><meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[-9.5, 0.005, 0]}><planeGeometry args={[0.4, 14]}/><meshBasicMaterial color="#cbd5e1" transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
      </group>

      {/* Faint tire marks / oil stains */}
      {[-2.5, 2.5].map((z,i) => (
        <mesh key={`tire-${i}`} rotation={[-Math.PI/2,0,0]} position={[0, 0.02, z]}>
          <planeGeometry args={[180, 2]}/>
          <meshBasicMaterial color="#050608" transparent opacity={0.15} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/>
        </mesh>
      ))}

      {/* Sidewalks with depth (Curbs) - Split to accommodate the Junction at x=25 */}
      {[-7.5, 7.5].map((z,i) => (
        <group key={`sw-${i}`} position={[0, 0.15, z]}>
          
          {/* LEFT SIDEWALK (x=-90 to x=18) Width 108, Center -36 */}
          <group position={[-36, 0, 0]}>
            <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[108, 2]}/><meshStandardMaterial color="#2d3748" roughness={0.9}/></mesh>
            <mesh position={[0, -0.075, z>0 ? -1 : 1]}><boxGeometry args={[108, 0.15, 0.05]}/><meshStandardMaterial color="#1a202c" roughness={0.8}/></mesh>
            <mesh position={[0, 0.8, z>0 ? 0.9 : -0.9]}><boxGeometry args={[108, 0.1, 0.05]} /><meshBasicMaterial color="#64748b" /></mesh>
            <mesh position={[0, 0.4, z>0 ? 0.9 : -0.9]}><boxGeometry args={[108, 0.05, 0.05]} /><meshBasicMaterial color="#64748b" /></mesh>
          </group>

          {/* RIGHT SIDEWALK (x=32 to x=90) Width 58, Center 61 */}
          <group position={[61, 0, 0]}>
            <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[58, 2]}/><meshStandardMaterial color="#2d3748" roughness={0.9}/></mesh>
            <mesh position={[0, -0.075, z>0 ? -1 : 1]}><boxGeometry args={[58, 0.15, 0.05]}/><meshStandardMaterial color="#1a202c" roughness={0.8}/></mesh>
            <mesh position={[0, 0.8, z>0 ? 0.9 : -0.9]}><boxGeometry args={[58, 0.1, 0.05]} /><meshBasicMaterial color="#64748b" /></mesh>
            <mesh position={[0, 0.4, z>0 ? 0.9 : -0.9]}><boxGeometry args={[58, 0.05, 0.05]} /><meshBasicMaterial color="#64748b" /></mesh>
          </group>

          {/* Fence Posts - Skipping the intersection */}
          {Array.from({length: 36}).map((_, j) => {
            const px = -85 + j*5;
            if (px > 17 && px < 33) return null; // Hole for intersection
            return (
              <mesh key={`post-${j}`} position={[px, 0.4, z>0 ? 0.9 : -0.9]}>
                <boxGeometry args={[0.08, 0.8, 0.08]} />
                <meshBasicMaterial color="#475569" />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Solid outer white lines */}
      {[-5.8, 5.8].map((z,i) => (
        <group key={`solid-${i}`} position={[0, 0.03, z]}>
          <mesh rotation={[-Math.PI/2,0,0]} position={[-36, 0, 0]}><planeGeometry args={[108, 0.1]}/><meshBasicMaterial color="#94a3b8" transparent opacity={0.6} polygonOffset polygonOffsetFactor={-1.5} polygonOffsetUnits={-2}/></mesh>
          <mesh rotation={[-Math.PI/2,0,0]} position={[61, 0, 0]}><planeGeometry args={[58, 0.1]}/><meshBasicMaterial color="#94a3b8" transparent opacity={0.6} polygonOffset polygonOffsetFactor={-1.5} polygonOffsetUnits={-2}/></mesh>
        </group>
      ))}

      {/* Thick center dashes, skipping the intersection at x=25 */}
      {Array.from({length: 30}).map((_, i) => {
        const xPos = -42 + i*3;
        if (xPos > 18 && xPos < 32) return null; // Skip intersection center
        return (
          <mesh key={`dash-${i}`} rotation={[-Math.PI/2,0,0]} position={[xPos, 0.03, 0]}>
            <planeGeometry args={[0.8, 0.15]}/>
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.5} polygonOffset polygonOffsetFactor={-1.5} polygonOffsetUnits={-2}/>
          </mesh>
        );
      })}

      <WindyTrees data={trees} motion={motion} />
      <StreetProps data={props} motion={motion} palette={palette} />

      {/* Multi-layered Skyscrapers - Standard basic colors to remove lighting overhead */}
      {buildings.map((b, i) => (
        <group frustumCulled={false} key={`bldg-${i}`} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.height/2, 0]}>
            <boxGeometry args={[b.width, b.height, b.depth]}/>
            <meshLambertMaterial ref={(el) => { buildingMaterialRefs.current[i * 2] = el; }} color={b.col} map={windowTex} emissive={palette.windowGlow} emissiveMap={windowTex} emissiveIntensity={b.windowBase} />
          </mesh>
          {b.hasTier && (
            <mesh position={[b.tierOffsetX, b.tierHeight/2 + b.height/4, b.tierOffsetZ]}>
              <boxGeometry args={[b.tierWidth, b.tierHeight/2, b.tierDepth]}/>
              <meshLambertMaterial ref={(el) => { buildingMaterialRefs.current[i * 2 + 1] = el; }} color={b.col} map={windowTex} emissive={palette.windowGlow} emissiveMap={windowTex} emissiveIntensity={b.windowBase * 0.92} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND HUD OVERLAY — corner frames, terminal text, horizontal scan
// ─────────────────────────────────────────────────────────────────────────────
function BackgroundHUD() {
  const term = useRef(null);
  const scanRef = useRef(null);

  useEffect(() => {
    if (!term.current) return;
    // Clear any existing children (StrictMode may fire twice in dev)
    term.current.innerHTML = '';
    const lines = ['> INITIALIZING SYSTEM...', '> LOADING MODULES', '> CALIBRATING SENSORS', '> READY'];
    let i = 0;
    const show = () => {
      if (!term.current || i >= lines.length) return;
      const el = document.createElement('div');
      el.textContent = lines[i++];
      el.style.opacity = '0';
      term.current.appendChild(el);
      gsap.to(el, { opacity: 1, duration: 0.35, delay: 0.05 });
      if (i < lines.length) setTimeout(show, 900);
    };
    setTimeout(show, 800);

    // Periodic scan sweep
    const scanLoop = () => {
      if (!scanRef.current) return;
      gsap.fromTo(scanRef.current,
        { top: '0%', opacity: 0.12 },
        { top: '100%', opacity: 0, duration: 4.5, ease: 'none', onComplete: () => setTimeout(scanLoop, 6000) }
      );
    };
    setTimeout(scanLoop, 2000);
  }, []);

  const corner = (style) => (
    <div style={{
      position: 'absolute', width: 22, height: 22,
      borderStyle: 'solid', borderColor: 'rgba(212,168,67,0.22)',
      borderWidth: 0, ...style,
    }} />
  );

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {/* Corner brackets */}
      {corner({ top: 16, left: 16, borderTopWidth: 1, borderLeftWidth: 1 })}
      {corner({ top: 16, right: 16, borderTopWidth: 1, borderRightWidth: 1 })}
      {corner({ bottom: 16, left: 16, borderBottomWidth: 1, borderLeftWidth: 1 })}
      {corner({ bottom: 16, right: 16, borderBottomWidth: 1, borderRightWidth: 1 })}

      {/* Terminal text — bottom left */}
      <div ref={term} style={{
        position: 'absolute', bottom: 68, left: 28,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 9, lineHeight: 2.0,
        color: 'rgba(212,168,67,0.22)',
        letterSpacing: '0.08em',
      }} />

      {/* Slow horizontal scan sweep */}
      <div ref={scanRef} style={{
        position: 'absolute', left: 0, right: 0,
        height: 1,
        background: 'linear-gradient(to right, transparent, rgba(212,168,67,0.08), transparent)',
        top: '0%',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE JOYSTICK
// ─────────────────────────────────────────────────────────────────────────────
function MobileControls({ onJoystick, hidden }) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const active = useRef(false);

  const MAX_RADIUS = 35;

  const handlePointer = (e) => {
    if (!active.current || hidden) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    let moveX = dx;
    let moveY = dy;
    
    if (dist > MAX_RADIUS) {
      moveX = (dx / dist) * MAX_RADIUS;
      moveY = (dy / dist) * MAX_RADIUS;
    }
    
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
    
    // Normalize strictly from -1.0 to 1.0 (vector max length is 1)
    let nx = moveX / MAX_RADIUS;
    let ny = moveY / MAX_RADIUS;
    
    // Subtle physical deadzone to prevent accidental drift
    if (Math.abs(nx) < 0.1) nx = 0;
    if (Math.abs(ny) < 0.1) ny = 0;
    
    // Pass strictly raw analog input up
    onJoystick({ x: nx, y: ny });
  };

  return (
    <div 
      ref={baseRef} 
      style={{
        position: 'fixed', bottom: 40, left: 40, zIndex: 500,
        width: 100, height: 100,
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(212, 168, 67, 0.4)',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        touchAction: 'none',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity 0.3s ease'
      }}
      onPointerDown={(e) => {
        if (hidden) return;
        active.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        handlePointer(e);
      }}
      onPointerMove={(e) => handlePointer(e)}
      onPointerUp={(e) => {
        active.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
        onJoystick({ x: 0, y: 0 });
      }}
      onPointerCancel={(e) => {
        active.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
        onJoystick({ x: 0, y: 0 });
      }}
    >
      <div ref={knobRef} style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 44, height: 44,
        marginTop: -22, marginLeft: -22,
        borderRadius: '50%',
        background: 'rgba(212, 168, 67, 0.7)',
        border: '2px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 0 12px rgba(212, 168, 67, 0.8), inset 0 0 10px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCENE
// ─────────────────────────────────────────────────────────────────────────────
const STATION_POS = {
  skills:  [34, -1.4, 13],   
  profile: [0, -1, -12],    
  projects: [-17, -0.9, 13.0],    
  contact:  [15, -0.5, -10],   
  certifications: [40, -1, -15.0], 
};
const STATION_ROT = {
  skills:  0,
  profile: 0,
  projects: -0.15,
  contact:  0,
  certifications: -0.6,
};
const STATION_CAM = {
  skills: { pos: [-12, 2.0, -2.5], look: [-12, 1, -6.0] },
  profile: { pos: [-4, 1.8, -5.5], look: [-4, 0.8, -9.5] },
  projects: { pos: [5.5, 2.0, -1.0], look: [5, 0.8, -5.0] },
  contact: { pos: [11.5, 2.0, -3.5], look: [11, 0.8, -7.5] },
  certifications: { pos: [19, 2.0, -4.0], look: [18, 0.8, -8.0] }
};

export default function GameScene() {
  const activeSection   = useGameStore((s)=>s.activeSection);
  const setActiveSection= useGameStore((s)=>s.setActiveSection);
  const soundEnabled    = useGameStore((s)=>s.soundEnabled);
  const setSoundEnabled = useGameStore((s)=>s.setSoundEnabled);
  const highSensitivity = useGameStore((s)=>s.highSensitivity);
  const toggleSensitivity = useGameStore((s)=>s.toggleSensitivity);
  const wrapRef = useRef(null);
  
  // Safely hook joystick coordinates instead of keys
  const [mobileJoystick, setMobileJoystick] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const envPalette = ENV_PRESET.palettes[ENV_PRESET.activePalette];
  const envProfile = isMobile ? ENV_PRESET.quality.mobile : ENV_PRESET.quality.desktop;
  const envMotion = ENV_PRESET.motion;

  useEffect(() => { 
    // Strict mobile device detection natively dropping window innerWidth checks for maximum desktop safety
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    setIsMobile(isTouch); 
  },[]);

  useEffect(()=>{
    if(wrapRef.current) gsap.fromTo(wrapRef.current,{opacity:0},{opacity:1,duration:1.4,ease:'power2.out'});
    if(soundEnabled) setTimeout(()=>audio.startAmbient(),700);
    return ()=>audio.stopAmbient();
  },[]);

  useEffect(()=>{audio.setEnabled(soundEnabled);if(soundEnabled) audio.startAmbient();},[soundEnabled]);
  useEffect(()=>{if(activeSection) audio.panelOpen();},[activeSection]);

  const activateStation = useCallback((id)=>{
    if(activeSection===id){
      returnCamera();
      setActiveSection(null); 
      return;
    }
    const statPos = STATION_POS[id]; if(!statPos) return;
    
    // 1. Maintain current viewing direction completely (do NOT rotate)
    const targetYaw = CURRENT_CAM.yaw;
    const targetPitch = CURRENT_CAM.pitch;

    // 2. Calculate direction from camera straight toward the object
    const objPos = new THREE.Vector3(...statPos);
    const dir = objPos.clone().sub(CURRENT_CAM.pos);
    
    // 3. Move camera slightly toward object, stopping 7 units away to keep distance
    const dist = dir.length();
    const stopDist = Math.max(dist - 7, 0); 
    dir.normalize().multiplyScalar(stopDist);
    
    const finalDest = CURRENT_CAM.pos.clone().add(dir);
    
    // Prevent sinking into the floor, establish comfortable standing height
    finalDest.y = Math.max(finalDest.y, 1.2);
    
    // 4. Trigger smooth GSAP forward motion with micro-zoom (FOV 45)
    flyToStation(finalDest.x, finalDest.y, finalDest.z, targetYaw, targetPitch, true, 45);
    setActiveSection(id);
  },[activeSection]);

  const closeSection = useCallback(()=>{
    // Restore the perfectly saved state from memory when user clicks Back/Close
    returnCamera();
    setActiveSection(null);
  },[]);

  const navBtns=[{id:'profile',color:'#4A90D9'},{id:'projects',color:'#D4A843'},{id:'skills',color:'#6AC46A'},{id:'contact',color:'#D46A6A'}];

  return (
    <div ref={wrapRef} style={{position:'fixed',inset:0,background:'#03050a'}}>

      {/* ── 3D Canvas ── */}
      <Canvas camera={{position:[0,2,10],fov:62, near:0.1, far:400}} shadows
        gl={{antialias:!isMobile,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:.95}}
        style={{width:'100%',height:'100%'}}>
        <Suspense fallback={null}>
          <CameraController mobileJoystick={mobileJoystick} highSensitivity={highSensitivity} activeSection={activeSection} />
          {/* Bright Daylight Illumination Setup */}
          <color attach="background" args={[envPalette.background]} />
          <fog attach="fog" args={[envPalette.fog, envPalette.fogNear, envPalette.fogFar]}/>

          <ambientLight intensity={1.45} color={envPalette.ambient}/>
          <directionalLight position={[30, 25, -40]} intensity={3.3} color={envPalette.sun} castShadow={false} />

          {/* Minimal Station Lights - Reduced intensity for performance */}
          {envPalette.stationLights.map((light, idx) => (
            <pointLight key={`station-light-${idx}`} position={light.position} intensity={light.intensity} color={light.color} distance={11} />
          ))}
          
          <GameEnvironment palette={envPalette} profile={envProfile} motion={envMotion}/>

          <ProfileStation  position={STATION_POS.profile}  rotation={[0, STATION_ROT.profile, 0]}  onActivate={()=>activateStation('profile')}  isActive={activeSection==='profile'}/>
          <ProjectsStation position={STATION_POS.projects} rotation={[0, STATION_ROT.projects, 0]} onActivate={()=>activateStation('projects')} isActive={activeSection==='projects'}/>
          <SkillsStation   position={STATION_POS.skills}   rotation={[0, STATION_ROT.skills, 0]}   onActivate={()=>activateStation('skills')}   isActive={activeSection==='skills'}/>
          <ContactStation  position={STATION_POS.contact}  rotation={[0, STATION_ROT.contact, 0]}  onActivate={()=>activateStation('contact')}  isActive={activeSection==='contact'}/>
          <CertificationsStation position={STATION_POS.certifications} rotation={[0, STATION_ROT.certifications, 0]} onActivate={()=>activateStation('certifications')} isActive={activeSection==='certifications'}/>
        </Suspense>
      </Canvas>

      {/* ── Background HUD ── */}
      <BackgroundHUD/>

      {/* ── Title ── */}
      <div style={{position:'absolute',top:24,left:28,pointerEvents:'none',zIndex:10}}>
        <div style={{fontFamily:"'Pricedown Bl', sans-serif",fontSize:32,lineHeight:0.8,color:'rgba(192, 147, 43, 0.8)',textShadow:'2px 2px 0 rgba(0,0,0,0.8)'}}>AHMAD SP</div>
        <div style={{fontFamily:"'Oswald', sans-serif",fontSize:9,letterSpacing:'.45em',color:'rgba(255,255,255,0.22)',textTransform:'uppercase',marginTop:8}}>AIML · FULL STACK · AI ENGINEER</div>
      </div>

      {/* ── Nav Buttons ── */}
      <div style={{position:'absolute',top:24,right:22,display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end',zIndex:10}}>
        {[
          {id:'profile',color:'#4A90D9'},
          {id:'projects',color:'#D4A843'},
          {id:'skills',color:'#6AC46A'},
          {id:'contact',color:'#D46A6A'},
          {id:'certifications',color:'#B388FF'}
        ].map(({id,color})=>{
          const act=activeSection===id;
          return (
            <button key={id}
              onClick={()=>activateStation(id)}
              onMouseEnter={(e)=>{audio.hover();gsap.to(e.currentTarget,{x:-3,duration:.15});}}
              onMouseLeave={(e)=>gsap.to(e.currentTarget,{x:0,duration:.15})}
              style={{background:act?color:'rgba(0,0,0,0.72)',border:`1px solid ${color}${act?'ff':'40'}`,color:act?'#000':'rgba(255,255,255,0.45)',fontFamily:"'Oswald',sans-serif",fontWeight:act?700:400,fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',padding:'5px 16px',cursor:'pointer',borderRadius:1,backdropFilter:'blur(6px)',boxShadow:act?`0 0 14px ${color}50`:'none'}}>
              {act?'■ ':''}{id}
            </button>
          );
        })}
      </div>

      {/* ── Hint ── */}
      <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',fontFamily:"'Oswald',sans-serif",fontSize:9,letterSpacing:'.35em',color:'rgba(255,255,255,0.13)',textTransform:'uppercase',pointerEvents:'none',whiteSpace:'nowrap',zIndex:10}}>
        {isMobile?'Tap arrows · Drag to look · Tap station':'WASD · Move  ·  Mouse · Look  ·  Click station to explore'}
      </div>

      {/* ── Sound & Sensitivity buttons ── */}
      <button style={{position:'fixed',bottom:20,right:20,zIndex:1000,background:'rgba(0,0,0,0.72)',border:`1px solid rgba(212,168,67,${soundEnabled ? 0.5 : 0.2})`,color:soundEnabled?'#D4A843':'rgba(255,255,255,0.2)',fontFamily:"'Oswald',sans-serif",fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',padding:'7px 13px',cursor:'pointer',borderRadius:1,backdropFilter:'blur(4px)'}}
        onClick={()=>setSoundEnabled(!soundEnabled)} onMouseEnter={()=>audio.hover()}>
        {soundEnabled?'♪ ON':'♪ OFF'}
      </button>

      <button style={{position:'fixed',bottom:56,right:20,zIndex:1000,background:'rgba(0,0,0,0.72)',border:`1px solid rgba(212,168,67,${highSensitivity ? 0.5 : 0.2})`,color:highSensitivity?'#D4A843':'rgba(255,255,255,0.2)',fontFamily:"'Oswald',sans-serif",fontSize:10,letterSpacing:'.3em',textTransform:'uppercase',padding:'7px 13px',cursor:'pointer',borderRadius:1,backdropFilter:'blur(4px)'}}
        onClick={()=>{audio.click(); toggleSensitivity();}} onMouseEnter={()=>audio.hover()}>
        {highSensitivity?'SENS MAX':'SENS LOW'}
      </button>

      {/* ── Panels ── */}
      {activeSection==='profile'  && <Profile  onClose={closeSection}/>}
      {activeSection==='projects' && <Projects onClose={closeSection}/>}
      {activeSection==='skills'   && <Skills   onClose={closeSection}/>}
      {activeSection==='contact'  && <Contact  onClose={closeSection}/>}
      {activeSection==='certifications' && <Certifications onClose={closeSection}/>}

      {/* ── Back to Menu ── */}
      <button onClick={()=>{audio.click();gsap.to(wrapRef.current,{opacity:0,duration:.5,ease:'power2.in',onComplete:()=>useGameStore.setState({gameStarted:false,splashDone:true,activeSection:null})});}}
        onMouseEnter={(e)=>{audio.hover();gsap.to(e.currentTarget,{color:'rgba(255,255,255,.8)',borderColor:'rgba(212,168,67,.6)',duration:.15});}}
        onMouseLeave={(e)=>gsap.to(e.currentTarget,{color:'rgba(255,255,255,.3)',borderColor:'rgba(212,168,67,.2)',duration:.15})}
        style={{position:'absolute',bottom:24,left:isMobile?200:28,zIndex:10,background:'transparent',border:'1px solid rgba(212,168,67,.2)',color:'rgba(255,255,255,.3)',fontFamily:"'Oswald',sans-serif",fontSize:10,letterSpacing:'.4em',textTransform:'uppercase',padding:'7px 14px',cursor:'pointer',borderRadius:1,backdropFilter:'blur(4px)'}}>
        ← Menu
      </button>

      {/* ── Mobile arrow controls ── */}
      {isMobile && <MobileControls onJoystick={setMobileJoystick} hidden={activeSection !== null}/>}

    </div>
  );
}
