/**
 * Heavy effects stay off the published document.
 *
 * Three.js, a raw WebGL tint, and GSAP are optional loaders. The page embeds
 * a short module script only when a layer asks for that effect. The library
 * itself is a dynamic import, so a page that does not use the effect ships
 * neither the loader nor the library, and a page that does stays inside the
 * 80 KB gzip budget.
 */

export const EFFECT_KINDS = ['webgl', 'three', 'gsap'] as const

export type EffectKind = (typeof EFFECT_KINDS)[number]

const EFFECT_ATTR = 'data-kj-effect'

export function effectKindFromProps(props: Record<string, unknown> | undefined): EffectKind | null {
  if (!props) return null
  const attrs = props.htmlAttributes
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return null
  const value = (attrs as Record<string, unknown>)[EFFECT_ATTR]
  return isEffectKind(value) ? value : null
}

export function effectsOnPage(nodes: Record<string, { props?: Record<string, unknown> }>): EffectKind[] {
  const found = new Set<EffectKind>()
  for (const node of Object.values(nodes)) {
    const kind = effectKindFromProps(node.props)
    if (kind) found.add(kind)
  }
  return EFFECT_KINDS.filter((kind) => found.has(kind))
}

export function effectScriptTags(kinds: readonly EffectKind[]): string {
  return kinds.map((kind) => `<script type="module">${LOADERS[kind]}</script>`).join('')
}

export function loaderBytes(kind: EffectKind): number {
  return new TextEncoder().encode(LOADERS[kind]).byteLength
}

function isEffectKind(value: unknown): value is EffectKind {
  return value === 'webgl' || value === 'three' || value === 'gsap'
}

const LOADERS: Record<EffectKind, string> = {
  webgl: `if(!matchMedia('(prefers-reduced-motion: reduce)').matches){for(const node of document.querySelectorAll('[data-kj-effect="webgl"]')){const canvas=document.createElement('canvas');canvas.width=node.clientWidth||320;canvas.height=node.clientHeight||180;node.append(canvas);const gl=canvas.getContext('webgl',{alpha:true});if(!gl)continue;const vert=gl.createShader(gl.VERTEX_SHADER);const frag=gl.createShader(gl.FRAGMENT_SHADER);if(!vert||!frag)continue;gl.shaderSource(vert,'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}');gl.shaderSource(frag,'precision mediump float;uniform float t;void main(){gl_FragColor=vec4(0.04,0.4,0.88,0.35+0.15*sin(t));}');gl.compileShader(vert);gl.compileShader(frag);const program=gl.createProgram();if(!program)continue;gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);const tint=gl.getUniformLocation(program,'t');let frame=0;const draw=()=>{gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(tint,frame/60);gl.drawArrays(gl.TRIANGLES,0,6);frame+=1;requestAnimationFrame(draw)};draw()}}`,
  three: `if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const nodes=document.querySelectorAll('[data-kj-effect="three"]');if(nodes.length){const THREE=await import('https://esm.sh/three@0.170.0');for(const node of nodes){const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});renderer.setSize(node.clientWidth||320,node.clientHeight||180);node.append(renderer.domElement);const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(45,renderer.domElement.width/renderer.domElement.height,0.1,10);camera.position.z=3;const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshNormalMaterial());scene.add(mesh);const draw=()=>{mesh.rotation.y+=0.01;renderer.render(scene,camera);requestAnimationFrame(draw)};draw()}}}`,
  gsap: `if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const nodes=document.querySelectorAll('[data-kj-effect="gsap"]');if(nodes.length){const {gsap}=await import('https://esm.sh/gsap@3.12.5');gsap.from(nodes,{autoAlpha:0,y:12,duration:0.6,stagger:0.08})}}`,
}
