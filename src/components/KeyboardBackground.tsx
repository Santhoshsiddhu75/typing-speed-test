import React, { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface KeyboardModelProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

// Animated keyboard model component
function KeyboardModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: KeyboardModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Animation loop
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Slow continuous Y-axis rotation (full rotation every 20 seconds)
      groupRef.current.rotation.y = time * 0.05
      
      // Gentle floating motion (up and down)
      groupRef.current.position.y = position[1] + Math.sin(time * 0.8) * 0.1
      
      // Subtle breathing scale effect
      const breathScale = 1 + Math.sin(time * 1.2) * 0.02
      const finalScale = typeof scale === 'number' ? scale : 1
      groupRef.current.scale.setScalar(finalScale * breathScale)
    }
  })

  try {
    const { scene } = useGLTF('/models/scene.gltf')
    
    // Debug: Log that model loaded successfully
    console.log('✅ Keyboard GLTF model loaded successfully!', scene);
    
    return (
      <group ref={groupRef} position={position} rotation={rotation}>
        <primitive object={scene} />
      </group>
    )
  } catch (error) {
    // Debug: Log loading error
    console.log('❌ Failed to load GLTF model:', error);
    
    // Fallback: animated simple keyboard-shaped box
    return (
      <group ref={groupRef} position={position} rotation={rotation}>
        <mesh>
          <boxGeometry args={[4, 0.3, 1.5]} />
          <meshStandardMaterial color="#22c55e" emissive="#166534" emissiveIntensity={0.1} />
        </mesh>
      </group>
    )
  }
}

// Animated loading fallback component
function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Slow rotation
      meshRef.current.rotation.y = time * 0.05
      
      // Gentle floating
      meshRef.current.position.y = Math.sin(time * 0.8) * 0.1
      
      // Subtle breathing scale
      const breathScale = 1 + Math.sin(time * 1.2) * 0.02
      meshRef.current.scale.setScalar(breathScale)
    }
  })
  
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[4, 0.3, 1.5]} />
      <meshStandardMaterial color="#22c55e" emissive="#166534" emissiveIntensity={0.1} />
    </mesh>
  )
}

interface KeyboardBackgroundProps {
  id?: string
  className?: string
  style?: React.CSSProperties
  mobileScale?: number
  desktopScale?: number
}

const KeyboardBackground: React.FC<KeyboardBackgroundProps> = ({
  id = 'keyboard-3d',
  className = '',
  style = {},
  mobileScale = 0.744,  // 7% smaller than 0.8 (0.8 * 0.93 = 0.744)
  desktopScale = 0.64   // 20% smaller than original 0.8
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const getCursorClass = () => {
    if (isDragging) return 'cursor-3d-grabbing'
    if (isHovering) return 'cursor-3d-grab'
    return 'cursor-default'
  }

  return (
    <div
      id={id}
      className={`${className} ${getCursorClass()} transition-all duration-150`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setIsDragging(false)
      }}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    >
      <Canvas
        camera={{
          position: [3, 4, 5], // Better angle for interaction
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: 'transparent' // Let parent background show through
        }}
      >
        {/* Ambient light with green tint */}
        <ambientLight intensity={0.3} color="#22c55e" />
        
        {/* Main directional light from top */}
        <directionalLight
          position={[0, 8, 2]}
          intensity={1.2}
          color="#22c55e" // Green-500
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Accent light from side */}
        <directionalLight
          position={[5, 4, 3]}
          intensity={0.4}
          color="#16a34a" // Green-600
        />
        
        {/* Subtle rim light */}
        <directionalLight
          position={[-3, 2, -2]}
          intensity={0.2}
          color="#15803d" // Green-700
        />
        
        {/* Orbit Controls for mouse interaction */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={15}
          target={[0, 0, 0]}
          onStart={() => {
            console.log('🎮 OrbitControls: Started interaction')
            setIsDragging(true)
          }}
          onEnd={() => {
            console.log('🎮 OrbitControls: Ended interaction')
            setIsDragging(false)
          }}
        />
        
        {/* Keyboard model - positioned and scaled appropriately */}
        <Suspense fallback={<LoadingFallback />}>
          <KeyboardModel 
            position={[0, 0, 0]} // Centered
            rotation={[0, 0, 0]} 
            scale={isDesktop ? desktopScale : mobileScale}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Preload the GLTF model
useGLTF.preload('/models/scene.gltf')

export default KeyboardBackground