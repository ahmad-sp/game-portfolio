import { useRef, useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, Html } from '@react-three/drei';
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

export const flyToStation = (x, y, z, yaw, pitch, saveCurrent = false) => {
  if (saveCurrent) {
    camTarget.savedPos.copy(CURRENT_CAM.pos);
    camTarget.savedYaw = CURRENT_CAM.yaw;
    camTarget.savedPitch = CURRENT_CAM.pitch;
    camTarget.hasSaved = true;
  }
  window.dispatchEvent(new CustomEvent('camera-fly', { detail: { x, y, z, yaw, pitch } }));
};

export const returnCamera = () => {
  if (camTarget.hasSaved) {
    window.dispatchEvent(new CustomEvent('camera-fly', { 
      detail: { 
        x: camTarget.savedPos.x, 
        y: camTarget.savedPos.y, 
        z: camTarget.savedPos.z, 
        yaw: camTarget.savedYaw, 
        pitch: camTarget.savedPitch 
      } 
    }));
    camTarget.hasSaved = false;
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
    };

    const handleFly = (e) => {
      const { x, y, z, yaw, pitch } = e.detail;
      killFly();
      // Smooth flight exact physical requirement: ~1.2s power3.out
      gsap.to(curPos.current, { x, y, z, duration: 1.2, ease: "power3.out" });
      gsap.to(input.current, { targetYaw: yaw, targetPitch: pitch, duration: 1.2, ease: "power3.out" });
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
function ProfileStation({ position, onActivate, isActive }) {
  const root    = useRef(); const scanRef = useRef();
  const glowRef = useRef(); const ringRef = useRef();
  const [hov, setHov] = useState(false);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!root.current) return;
    root.current.position.y = position[1] + Math.sin(t * 0.65) * 0.14;
    root.current.rotation.y = Math.sin(t * 0.28) * 0.07;
    // Scan line scrolling
    if (scanRef.current) scanRef.current.position.y = -1.1 + ((t * 0.6) % 2.2);
    if (glowRef.current) glowRef.current.material.opacity = (hov || isActive) ? 0.16 + Math.sin(t*2)*0.06 : 0.04;
    if (ringRef.current) {
      const p = ((t * 0.5) % 1);
      ringRef.current.scale.setScalar(1 + p * 0.8);
      ringRef.current.material.opacity = 0.35 * (1 - p);
    }
  });

  const oe = () => { setHov(true);  document.body.style.cursor='pointer'; audio.hover(); if(root.current) gsap.to(root.current.scale,{x:1.06,y:1.06,z:1.06,duration:.3,ease:'power2.out'}); };
  const ol = () => { setHov(false); document.body.style.cursor='auto';   if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3}); };

  const C = '#4A90D9';
  return (
    <group ref={root} position={position} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Outer glow halo */}
      <mesh ref={glowRef}><planeGeometry args={[2.6,3.8]}/><meshBasicMaterial color={C} transparent opacity={.04} side={THREE.DoubleSide}/></mesh>

      {/* Main slab body */}
      <mesh><boxGeometry args={[2,2.8,.18]}/><meshStandardMaterial color="#060c18" roughness={.92} metalness={.05} emissive="#060c18" emissiveIntensity={1}/></mesh>
      {/* Slab depth rim — top, bottom, sides as thin strips */}
      {/* Top rim */}
      <mesh position={[0,1.39,.0]}><boxGeometry args={[2,.04,.18]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1.6:.5}/></mesh>
      {/* Bottom rim */}
      <mesh position={[0,-1.39,.0]}><boxGeometry args={[2,.04,.18]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive) ? 0.8 : 0.2}/></mesh>
      {/* Left / right edge glow lines */}
      {[-1,1].map((x,i)=>(
        <mesh key={i} position={[x*.99,0,.0]}><boxGeometry args={[.025,2.8,.18]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1.2:.35}/></mesh>
      ))}

      {/* Internal face details */}
      {/* Header label strip */}
      <mesh position={[0,1.07,.1]}><boxGeometry args={[1.85,.22,.02]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={.5}/></mesh>
      {/* Avatar block */}
      <mesh position={[-.6,.35,.1]}><boxGeometry args={[.55,.65,.04]}/><meshStandardMaterial color="#0b1a30" roughness={.9} emissive="#0f2648" emissiveIntensity={.6}/></mesh>
      {/* Avatar A */}
      <Html zIndexRange={[100, 0]} position={[-.6,.37,.18]} center style={{pointerEvents:'none',fontSize:22,fontWeight:700,fontFamily:"'Oswald'",color:C,userSelect:'none',textShadow:`0 0 14px ${C}`}}>A</Html>
      {/* Name lines */}
      {[.1,-.12].map((dy,i)=>(
        <mesh key={i} position={[.22,.38+dy,.1]}><planeGeometry args={[.72-.2*i,.045]}/><meshBasicMaterial color={C} opacity={.55-.1*i} transparent/></mesh>
      ))}
      {/* Data rows */}
      {[0,-.26,-.52,-.78].map((dy,i)=>(
        <mesh key={i} position={[0,-.15+dy,.095]}><planeGeometry args={[1.65-.12*i,.038]}/><meshBasicMaterial color="#24385a" opacity={.45} transparent/></mesh>
      ))}
      {/* Scan line (animated) */}
      <mesh ref={scanRef} position={[0,0,.12]}><planeGeometry args={[1.85,.018]}/><meshBasicMaterial color={C} opacity={.55} transparent/></mesh>
      {/* Clip zone so scan stays inside (visual trick — front blocking planes outside scan area) */}

      {/* Pulse ring under */}
      <mesh ref={ringRef} position={[0,0,-.1]} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[1.2,.02,6,48]}/>
        <meshBasicMaterial color={C} transparent opacity={.35}/>
      </mesh>

      {/* Glow circle on ground */}
      <mesh position={[0,-1.98,0]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[1.6,36]}/>
        <meshBasicMaterial color={C} transparent opacity={(hov||isActive) ? 0.15 : 0.06}/>
      </mesh>

      <Html zIndexRange={[100, 0]} position={[0,-2.25,0]} center distanceFactor={10} style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:24,letterSpacing:'.35em',textTransform:'uppercase',color:hov||isActive?C:`${C}70`,whiteSpace:'nowrap',userSelect:'none',textShadow:'0 2px 10px rgba(0,0,0,0.8)'}}>Profile</Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS — Rotating data core with concentric rings
// ─────────────────────────────────────────────────────────────────────────────
function ProjectsStation({ position, onActivate, isActive }) {
  const root=useRef(); const ring1=useRef(); const ring2=useRef(); const ring3=useRef();
  const coreRef=useRef(); const glowRef=useRef();
  const [hov,setHov]=useState(false);

  useFrame((state)=>{
    const t=state.clock.elapsedTime;
    if(!root.current) return;
    root.current.position.y=position[1]+Math.sin(t*.55+1)*.13;
    if(ring1.current){ring1.current.rotation.z=t*.6; ring1.current.rotation.x=Math.sin(t*.2)*.2;}
    if(ring2.current){ring2.current.rotation.z=-t*.4; ring2.current.rotation.y=t*.3;}
    if(ring3.current){ring3.current.rotation.y=t*.5; ring3.current.rotation.z=Math.sin(t*.35)*.15;}
    if(coreRef.current){coreRef.current.rotation.y=t*.8; const p=.5+Math.sin(t*2)*.5; coreRef.current.material.emissiveIntensity=(hov||isActive)?1.2+p*.8:.4+p*.3;}
    if (glowRef.current) {
      glowRef.current.material.opacity = (hov || isActive)
        ? (0.18 + Math.sin(t * 1.5) * 0.07)
        : 0.04;
    }
  });

  const oe=()=>{setHov(true);document.body.style.cursor='pointer';audio.hover();if(root.current) gsap.to(root.current.scale,{x:1.07,y:1.07,z:1.07,duration:.3,ease:'power2.out'});};
  const ol=()=>{setHov(false);document.body.style.cursor='auto';if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3});};

  const C='#D4A843';
  return (
    <group ref={root} position={position} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Glow sphere */}
      <mesh ref={glowRef}><sphereGeometry args={[1.8,12,12]}/><meshBasicMaterial color={C} transparent opacity={.04} side={THREE.DoubleSide}/></mesh>

      {/* Core dodecahedron */}
      <mesh ref={coreRef}><dodecahedronGeometry args={[.55]}/><meshStandardMaterial color="#1a0f00" roughness={.15} metalness={.9} emissive={C} emissiveIntensity={(hov||isActive)?1.6:.5}/></mesh>

      {/* Ring 1 — main horizontal */}
      <mesh ref={ring1}><torusGeometry args={[.95,.035,10,64]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1.8:.7} roughness={.2}/></mesh>

      {/* Ring 2 — tilted */}
      <mesh ref={ring2} rotation={[Math.PI/2.8,0,0]}><torusGeometry args={[1.25,.025,8,56]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1.2:.4} transparent opacity={.8}/></mesh>

      {/* Ring 3 — polar orbit */}
      <mesh ref={ring3} rotation={[0,0,Math.PI/2]}><torusGeometry args={[1.55,.018,6,48]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={.3} transparent opacity={.45}/></mesh>

      {/* Data layer discs — stacked */}
      {[-0.15,0,.15].map((dz,i)=>(
        <mesh key={i} rotation={[Math.PI/2,0,0]} position={[0,0,dz]}>
          <ringGeometry args={[.25+i*.18,.3+i*.18,32]}/>
          <meshBasicMaterial color={C} transparent opacity={.18-.04*i}/>
        </mesh>
      ))}

      {/* Glow circle on ground */}
      <mesh position={[0,-1.98,0]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[1.5,36]}/>
        <meshBasicMaterial color={C} transparent opacity={(hov||isActive) ? 0.15 : 0.06}/>
      </mesh>

      <Html zIndexRange={[100, 0]} position={[0,-2.25,0]} center distanceFactor={10} style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:24,letterSpacing:'.35em',textTransform:'uppercase',color:hov||isActive?C:`${C}70`,whiteSpace:'nowrap',userSelect:'none',textShadow:'0 2px 10px rgba(0,0,0,0.8)'}}>Projects</Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS — Vertical stacked bar tower with animated levels
// ─────────────────────────────────────────────────────────────────────────────
function SkillsStation({ position, onActivate, isActive }) {
  const root=useRef(); const barsRef=useRef([]); const ringRef=useRef();
  const [hov,setHov]=useState(false);

  const C='#6AC46A';
  const barData=[
    {h:.72,c:'#4A90D9'},{h:.62,c:C},{h:.78,c:'#D4A843'},{h:.55,c:'#D46A6A'},
  ];

  useFrame((state)=>{
    const t=state.clock.elapsedTime;
    if(!root.current) return;
    root.current.position.y=position[1]+Math.sin(t*.6+2)*.12;
    root.current.rotation.y=Math.sin(t*.24+1)*.06;
    barsRef.current.forEach((b,i)=>{
      if(!b) return;
      const pulse=.92+Math.sin(t*1.1+i*.9)*.08;
      b.scale.y=pulse;
    });
    if(ringRef.current){const p=((t*.4+2)%1); ringRef.current.scale.setScalar(1+p*.7); ringRef.current.material.opacity=.3*(1-p);}
  });

  const oe=()=>{setHov(true);document.body.style.cursor='pointer';audio.hover();if(root.current) gsap.to(root.current.scale,{x:1.06,y:1.06,z:1.06,duration:.3,ease:'power2.out'});};
  const ol=()=>{setHov(false);document.body.style.cursor='auto';if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3});};

  return (
    <group ref={root} position={position} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Base platform */}
      <mesh position={[0,-1.1,0]}><boxGeometry args={[1.8,.08,1.2]}/><meshStandardMaterial color="#080f08" roughness={.9} emissive={C} emissiveIntensity={(hov||isActive) ? 0.15 : 0.04}/></mesh>

      {/* Animated vertical bars (each has 3D depth) */}
      {barData.map((d,i)=>(
        <group key={i} position={[-0.67+i*.44,-.55+d.h/2,0]} ref={el=>barsRef.current[i]=el}>
          <mesh>
            <boxGeometry args={[.28,d.h,.28]}/>
            <meshStandardMaterial color="#040a04" roughness={.9} emissive={d.c} emissiveIntensity={(hov||isActive) ? 0.9 : 0.3}/>
          </mesh>
          {/* Top cap glow */}
          <mesh position={[0,d.h/2,0]}>
            <boxGeometry args={[.28,.04,.28]}/>
            <meshStandardMaterial color={d.c} emissive={d.c} emissiveIntensity={(hov||isActive)?2:1}/>
          </mesh>
          {/* Inner light core */}
          <mesh position={[0,0,0]}>
            <boxGeometry args={[.14,d.h*.8,.14]}/>
            <meshBasicMaterial color={d.c} transparent opacity={.12}/>
          </mesh>
        </group>
      ))}

      {/* Frame around bars */}
      {[-0.88, 0.88].map((x,i)=>(
        <mesh key={i} position={[x,-0.55,0]}><boxGeometry args={[.025,2.2,.025]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive) ? 0.8 : 0.2}/></mesh>
      ))}

      {/* Header label */}
      <mesh position={[0,.88,0]}><boxGeometry args={[1.8,.18,.08]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1:.3}/></mesh>
      <Html zIndexRange={[100, 0]} position={[0,.89,.06]} center style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:10,fontWeight:700,letterSpacing:'.3em',textTransform:'uppercase',color:'#000',userSelect:'none'}}>ABILITIES</Html>

      {/* Pulse ring */}
      <mesh ref={ringRef} position={[0,-1.1,0]} rotation={[-Math.PI/2,0,0]}>
        <torusGeometry args={[1.1,.02,6,40]}/><meshBasicMaterial color={C} transparent opacity={.3}/>
      </mesh>

      {/* Ground glow */}
      <mesh position={[0,-1.98,0]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[1.4,36]}/>
        <meshBasicMaterial color={C} transparent opacity={(hov||isActive) ? 0.15 : 0.06}/>
      </mesh>

      <Html zIndexRange={[100, 0]} position={[0,-2.25,0]} center distanceFactor={10} style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:24,letterSpacing:'.35em',textTransform:'uppercase',color:hov||isActive?C:`${C}70`,whiteSpace:'nowrap',userSelect:'none',textShadow:'0 2px 10px rgba(0,0,0,0.8)'}}>Skills</Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT — Sci-Fi Comm Terminal
// ─────────────────────────────────────────────────────────────────────────────
function ContactStation({ position, onActivate, isActive }) {
  const root=useRef(); const p1=useRef(); const p2=useRef(); const p3=useRef();
  const screenRef=useRef();
  const [hov,setHov]=useState(false);

  useFrame((state)=>{
    const t=state.clock.elapsedTime;
    if(!root.current) return;
    root.current.position.y=position[1]+Math.sin(t*.5+3)*.13;
    // Staggered pulse rings
    [[p1,0],[p2,.7],[p3,1.4]].forEach(([r,offset])=>{
      if(!r.current || !r.current.material) return;
      const pg=((t*.7+offset)%2.1)/2.1;
      r.current.scale.setScalar(1+pg*1.4);
      r.current.material.opacity=.4*(1-pg);
    });
    if(screenRef.current && screenRef.current.material) screenRef.current.material.opacity = (hov||isActive) ? 0.8 + Math.sin(t*4)*0.2 : 0.4;
  });

  const oe=()=>{setHov(true);document.body.style.cursor='pointer';audio.hover();if(root.current) gsap.to(root.current.scale,{x:1.06,y:1.06,z:1.06,duration:.3,ease:'power2.out'});};
  const ol=()=>{setHov(false);document.body.style.cursor='auto';if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3});};

  const C='#D46A6A';
  return (
    <group ref={root} position={position} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      {/* Heavy Base block */}
      <mesh position={[0,-.8,0]}>
        <cylinderGeometry args={[.7,.9,.4,8]}/>
        <meshStandardMaterial color="#080303" roughness={.9}/>
      </mesh>
      <mesh position={[0,-.6,0]}>
        <cylinderGeometry args={[.6,.7,.2,8]}/>
        <meshStandardMaterial color="#140505" roughness={.8} emissive={C} emissiveIntensity={(hov||isActive) ? 0.2 : 0.05}/>
      </mesh>

      {/* Main console body - angled */}
      <mesh position={[0, .1, .1]} rotation={[-.2, 0, 0]}>
        <boxGeometry args={[1, 1.4, .6]}/>
        <meshStandardMaterial color="#0d0505" roughness={.9}/>
      </mesh>

      {/* Side panels */}
      {[-.55, .55].map((x,i)=>(
        <mesh key={i} position={[x, .1, .15]} rotation={[-.2, 0, 0]}>
          <boxGeometry args={[.1, 1.5, .7]}/>
          <meshStandardMaterial color="#1a0808" roughness={.8} emissive={C} emissiveIntensity={(hov||isActive) ? 0.3 : 0.1}/>
        </mesh>
      ))}

      {/* Glowing screen */}
      <Html zIndexRange={[100, 0]} position={[0,-2.25,0]} center distanceFactor={10} style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:24,letterSpacing:'.35em',textTransform:'uppercase',color:hov||isActive?C:`${C}70`,whiteSpace:'nowrap',userSelect:'none',textShadow:'0 2px 10px rgba(0,0,0,0.8)'}}>Contact</Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATIONS — Holographic accreditation slab
// ─────────────────────────────────────────────────────────────────────────────
function CertificationsStation({ position, onActivate, isActive }) {
  const root = useRef(); const screenRef = useRef();
  const [hov, setHov] = useState(false);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!root.current) return;
    root.current.position.y = position[1] + Math.sin(t * 0.8 + 2) * 0.12;
    if (screenRef.current) screenRef.current.material.opacity = 0.4 + Math.sin(t * 3)*0.1;
  });

  const oe = () => { setHov(true); document.body.style.cursor='pointer'; audio.hover(); if(root.current) gsap.to(root.current.scale,{x:1.05,y:1.05,z:1.05,duration:.3,ease:'power2.out'}); };
  const ol = () => { setHov(false); document.body.style.cursor='auto'; if(root.current) gsap.to(root.current.scale,{x:1,y:1,z:1,duration:.3}); };

  const C = '#B388FF';
  return (
    <group ref={root} position={position} onPointerEnter={oe} onPointerLeave={ol} onClick={()=>{audio.click();onActivate();}}>
      <mesh><boxGeometry args={[1.5, 2.5, 0.2]}/><meshStandardMaterial color="#060c18" roughness={0.9} metalness={0.1}/></mesh>
      {[-0.76, 0.76].map((x,i)=>(<mesh key={i} position={[x,0,0]}><boxGeometry args={[0.04, 2.5, 0.22]}/><meshStandardMaterial color={C} emissive={C} emissiveIntensity={(hov||isActive)?1:.4}/></mesh>))}
      
      {/* Target screen */}
      <mesh ref={screenRef} position={[0, 0.5, 0.12]}><planeGeometry args={[1.2, 1.0]}/><meshBasicMaterial color={C} transparent opacity={0.5}/></mesh>
      
      <Html zIndexRange={[100, 0]} position={[0, 0.5, 0.14]} center transform style={{pointerEvents:'none',fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'#fff',userSelect:'none',textShadow:`0 0 6px ${C}`}}>
        <div>ACCREDITATION</div>
        <div>VERIFIED</div>
      </Html>

      <Html zIndexRange={[100, 0]} position={[0,-2.25,0]} center distanceFactor={10} style={{pointerEvents:'none',fontFamily:"'Oswald'",fontSize:24,letterSpacing:'.35em',textTransform:'uppercase',color:hov||isActive?C:`${C}70`,whiteSpace:'nowrap',userSelect:'none',textShadow:'0 2px 10px rgba(0,0,0,0.8)'}}>Certifications</Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT: Road, City Buildings, Trees
// ─────────────────────────────────────────────────────────────────────────────
function GameEnvironment() {
  const rs = Math.random;

  const windowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#080808'; // Deep dark black for off windows
    ctx.fillRect(0,0,512,512);
    
    const cols = 8; const rows = 8;
    const wWidth = 44; const wHeight = 44;
    const padXX = (512 - (cols * wWidth)) / (cols + 1);
    const padYY = (512 - (rows * wHeight)) / (rows + 1);
    
    // Some colors: mainly dark, some bright yellow/white
    const colors = ['#080808','#080808','#080808','#080808','#080808','#080808', '#fef08a', '#ffffff', '#FFD166'];
    
    for(let row=0; row<rows; row++) {
      for(let col=0; col<cols; col++) {
        const x = padXX + col*(wWidth + padXX);
        const y = padYY + row*(wHeight + padYY);
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(x, y, wWidth, wHeight);
      }
    }
    
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  const buildings = useMemo(() => {
    return Array.from({length: 40}).map(() => {
      const x = (rs() * 160) - 80; // Spread horizontally
      const side = rs() > 0.5 ? 1 : -1;
      const z = side === 1 ? (30 + rs() * 20) : (-18 - rs() * 15); // Strictly push boundaries away from center interaction zone Z:(0->10)
      const width = 6 + rs() * 10;
      const depth = 6 + rs() * 10;
      const height = 15 + rs() * 45; // Variable tall skyscrapers
      return { x, z, width, height, depth };
    });
  }, []);

  const trees = useMemo(() => {
    return Array.from({length: 24}).map(() => {
      const x = (rs() * 160) - 80;
      const side = rs() > 0.5 ? 1 : -1;
      const z = side === 1 ? (20 + rs() * 10) : (-14 - rs() * 8);
      return { x, z, h: 2 + rs(), scale: 0.8 + rs()*0.6 };
    });
  }, []);

  const lights = useMemo(() => {
    const arr = [];
    for(let x=-24; x<=24; x+=12) {
      arr.push({ x, z: -4.5 });
      arr.push({ x: x+6, z: 4.5 });
    }
    return arr;
  }, []);

  return (
    <group position={[0,-2.0,0]}>
      {/* City Ground */}
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <planeGeometry args={[200, 200]}/>
        <meshStandardMaterial color="#1e293b" roughness={1} metalness={0}/>
      </mesh>

      {/* Main Road */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}>
        <planeGeometry args={[160, 12]}/>
        <meshStandardMaterial color="#0f172a" roughness={1} metalness={0}/>
      </mesh>

      {/* Sidewalks */}
      {[-6.5, 6.5].map((z,i) => (
        <mesh key={`sw-${i}`} rotation={[-Math.PI/2,0,0]} position={[0,0.05,z]}>
          <planeGeometry args={[160, 1]}/>
          <meshStandardMaterial color="#334155" roughness={1}/>
        </mesh>
      ))}

      {/* Solid outer white lines */}
      {[-5, 5].map((z,i) => (
        <mesh key={`solid-${i}`} rotation={[-Math.PI/2,0,0]} position={[0,0.02,z]}>
          <planeGeometry args={[160, 0.1]}/>
          <meshBasicMaterial color="#f8fafc"/>
        </mesh>
      ))}

      {/* Inner thin lines */}
      {[-2, -2.5, 2, 2.5].map((z,i) => (
        <mesh key={`thin-${i}`} rotation={[-Math.PI/2,0,0]} position={[0,0.02,z]}>
          <planeGeometry args={[160, 0.05]}/>
          <meshBasicMaterial color="#94a3b8"/>
        </mesh>
      ))}

      {/* Thick center dashes */}
      {Array.from({length: 40}).map((_, i) => (
        <mesh key={`dash-${i}`} rotation={[-Math.PI/2,0,0]} position={[-38 + i*2, 0.02, 0]}>
          <planeGeometry args={[0.8, 0.2]}/>
          <meshBasicMaterial color="#f8fafc"/>
        </mesh>
      ))}

      {/* Boxy Trees */}
      {trees.map((t, i) => (
        <group key={`tree-${i}`} position={[t.x, 0, t.z]} scale={t.scale}>
          {/* Trunk */}
          <mesh position={[0, t.h/2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, t.h, 4]}/>
            <meshStandardMaterial color="#78350f" roughness={1}/>
          </mesh>
          {/* Leaves */}
          <mesh position={[0, t.h + 1, 0]} rotation={[0, Math.PI/4, 0]} castShadow>
            <coneGeometry args={[1.6, 3, 4]}/>
            <meshStandardMaterial color="#15803d" roughness={1}/>
          </mesh>
        </group>
      ))}

      {/* Background Block Buildings */}
      {buildings.map((b, i) => (
        <mesh key={`bldg-${i}`} position={[b.x, b.height/2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.width, b.height, b.depth]}/>
          <meshStandardMaterial map={windowTex} roughness={0.9} emissiveMap={windowTex} emissive={"#ffffff"} emissiveIntensity={0.85} />
        </mesh>
      ))}

      {/* Street Lights */}
      {lights.map((l, i) => (
        <group key={`light-${i}`} position={[l.x, 0, l.z]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 4, 6]}/>
            <meshStandardMaterial color="#0a0a0a" roughness={0.7}/>
          </mesh>
          {/* Arm */}
          <mesh position={[0, 3.9, (l.z<0?0.5:-0.5)]}>
            <cylinderGeometry args={[0.02, 0.02, 1.2, 5]} rotation={[Math.PI/2, 0, 0]}/>
            <meshStandardMaterial color="#0a0a0a"/>
          </mesh>
          {/* Head */}
          <mesh position={[0, 3.9, (l.z<0?1:-1)]}>
            <boxGeometry args={[0.3, 0.08, 0.4]}/>
            <meshStandardMaterial color="#050505"/>
          </mesh>
          {/* Light bulb surface only (Removed heavy pointLight to save WebGL max limit) */}
          <mesh position={[0, 3.85, (l.z<0?1:-1)]} rotation={[Math.PI/2, 0, 0]}>
            <planeGeometry args={[0.25, 0.35]}/>
            <meshBasicMaterial color="#FFD166"/>
          </mesh>
        </group>
      ))}

      {/* Background depth wall (distant horizon) */}
      <mesh position={[0,10,-35]}>
        <planeGeometry args={[180,60]}/>
        <meshBasicMaterial color="#020305"/>
      </mesh>
    </group>
  );
}

function Beams() {
  const refs=useRef([]);
  const data=[{p:[-9,6,-7],c:'#4A90D9'},{p:[9,6,-7],c:'#6AC46A'},{p:[-13,6,-1],c:'#D4A843'},{p:[13,6,-1],c:'#D46A6A'},{p:[0,6,-18],c:'#9B6AD4'}];
  useFrame((state)=>{refs.current.forEach((m,i)=>{if(!m)return;m.material.opacity=.05+Math.sin(state.clock.elapsedTime*.7+i)*.025;});});
  return <>{data.map((b,i)=><mesh key={i} ref={el=>refs.current[i]=el} position={b.p}><cylinderGeometry args={[.04,.6,20,8,1,true]}/><meshBasicMaterial color={b.c} transparent opacity={.055} side={THREE.DoubleSide}/></mesh>)}</>;
}

function Particles({ isMobile }) {
  const gr=useRef();
  const cnt=isMobile?50:110;
  const data=useRef(Array.from({length:cnt},(_,i)=>({
    pos:[(Math.random()-.5)*50, Math.random()*12-1,(Math.random()-.5)*50],
    spd:.25+Math.random()*.6, ph:Math.random()*Math.PI*2,
    sz:.012+Math.random()*.038,
    col:i%6===0?'#D4A843':i%4===0?'#4A90D9':'#ffffff',
  })));
  useFrame((state)=>{
    if(!gr.current) return;
    const t=state.clock.elapsedTime;
    gr.current.children.forEach((c,i)=>{
      const d=data.current[i];
      c.position.y=d.pos[1]+Math.sin(t*d.spd+d.ph)*.7;
      c.material.opacity=.13+Math.sin(t*d.spd*1.5+d.ph)*.1;
    });
  });
  return <group ref={gr}>{data.current.map((d,i)=><mesh key={i} position={d.pos}><sphereGeometry args={[d.sz,4,4]}/><meshBasicMaterial color={d.col} transparent opacity={.18}/></mesh>)}</group>;
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
  skills:  [-9, 0, 1],
  profile: [-3, 0, 1],
  projects:   [3,  0, 1],
  contact:  [9,  0, 1],
  certifications: [15, 0, 1],
};
const STATION_CAM = Object.fromEntries(
  Object.entries(STATION_POS).map(([k, p]) => [
    k, { pos: [p[0], 2, p[2] + 3], look: [p[0], p[1], p[2]] }
  ])
);

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
    const c=STATION_CAM[id]; if(!c) return;
    
    // Dynamically calculate the precise yaw and pitch required to look at the station from the fly-to position
    const dx = c.look[0] - c.pos[0];
    const dy = c.look[1] - c.pos[1];
    const dz = c.look[2] - c.pos[2];
    
    const targetYaw = Math.atan2(dx, dz); 
    const targetPitch = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz));
    
    // Trigger smooth GSAP camera flight and PASS TRUE to save state memory
    flyToStation(c.pos[0], c.pos[1], c.pos[2], targetYaw, targetPitch, true);
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
      <Canvas camera={{position:[0,2,10],fov:62}} shadows
        gl={{antialias:!isMobile,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:.95}}
        style={{width:'100%',height:'100%'}}>
        <Suspense fallback={null}>
          <CameraController mobileJoystick={mobileJoystick} highSensitivity={highSensitivity} activeSection={activeSection} />
          <color attach="background" args={['#0b162c']} />
          <fog attach="fog" args={['#0b162c', 30, 200]}/>

          {/* Layered Lighting - Highly bright for full blocky visibility */}
          <ambientLight intensity={1.8} color="#e2e8f0"/>
          <directionalLight position={[15, 30, 15]} intensity={1.5} color="#ffffff" castShadow={!isMobile} shadow-mapSize={[1024,1024]}/>

          {/* Per-station colored spotlights */}
          <spotLight position={[-9, 6, -1]} angle={0.4} penumbra={0.5} intensity={5.5} color="#4A90D9" />
          <spotLight position={[-3, 6, 2]}  angle={0.4} penumbra={0.5} intensity={5.5} color="#D4A843" />
          <spotLight position={[3,  6, 2]}  angle={0.4} penumbra={0.5} intensity={5.5} color="#6AC46A" />
          <spotLight position={[9,  6, -1]} angle={0.4} penumbra={0.5} intensity={5.5} color="#D46A6A" />
          <spotLight position={[15, 6, 2]}  angle={0.4} penumbra={0.5} intensity={5.5} color="#B388FF" />
          

          <Environment preset="night"/>
          <GameEnvironment/>
          <Beams/>
          <Particles isMobile={isMobile}/>

          <ProfileStation  position={STATION_POS.profile}  onActivate={()=>activateStation('profile')}  isActive={activeSection==='profile'}/>
          <ProjectsStation position={STATION_POS.projects} onActivate={()=>activateStation('projects')} isActive={activeSection==='projects'}/>
          <SkillsStation   position={STATION_POS.skills}   onActivate={()=>activateStation('skills')}   isActive={activeSection==='skills'}/>
          <ContactStation  position={STATION_POS.contact}  onActivate={()=>activateStation('contact')}  isActive={activeSection==='contact'}/>
          <CertificationsStation position={STATION_POS.certifications} onActivate={()=>activateStation('certifications')} isActive={activeSection==='certifications'}/>
        </Suspense>
      </Canvas>

      {/* ── Background HUD ── */}
      <BackgroundHUD/>

      {/* ── Title ── */}
      <div style={{position:'absolute',top:24,left:28,pointerEvents:'none',zIndex:10}}>
        <div style={{fontFamily:"'Oswald', sans-serif",fontSize:32,lineHeight:0.8,color:'rgba(192, 147, 43, 0.8)',textShadow:'2px 2px 0 rgba(0,0,0,0.8)'}}>AHMAD SP</div>
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
