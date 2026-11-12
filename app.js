'use strict';
const video=document.getElementById('camera');
const canvas=document.getElementById('view');
const ctx=canvas.getContext('2d',{willReadFrequently:true});
const status=document.getElementById('status');
const start=document.getElementById('start');
const flip=document.getElementById('flip');
const save=document.getElementById('save');
const palette=document.getElementById('palette');
const brightness=document.getElementById('brightness');
const contrast=document.getElementById('contrast');
let stream=null,facing='environment',frame=0;
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
function color(v){
 if(palette.value==='gray')return [v,v,v];
 if(palette.value==='iron')return [clamp(v*1.8-90),clamp(v*1.5-180),clamp(v*1.3-250)];
 const stops=[[0,0,10,60],[64,0,90,220],[128,20,220,125],[192,255,215,0],[255,255,35,10]];
 for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){let a=stops[i-1],b=stops[i],t=(v-a[0])/(b[0]-a[0]);return [1,2,3].map(k=>clamp(a[k]+(b[k]-a[k])*t));}
 return [255,35,10];
}
function render(){
 if(!stream)return;
 if(video.readyState>=2&&video.videoWidth){
  const w=Math.min(640,video.videoWidth),h=Math.max(1,Math.round(w*video.videoHeight/video.videoWidth));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.drawImage(video,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h),d=img.data,b=Number(brightness.value),c=Number(contrast.value)/100;
  for(let i=0;i<d.length;i+=4){const lum=clamp((0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]-128)*c+128+b);const rgb=color(lum);d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];}
  ctx.putImageData(img,0,0);
 }
 frame=requestAnimationFrame(render);
}
async function openCamera(){
 if(!navigator.mediaDevices?.getUserMedia){status.textContent='Camera API unavailable. Use Chrome on localhost.';return;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 cancelAnimationFrame(frame);
 status.textContent='Opening camera…';
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:640}}});
  video.srcObject=stream;await video.play();status.textContent='SIMULATION · no temperature readings';render();
 }catch(e){status.textContent='Camera error: '+e.message;}
}
start.addEventListener('click',openCamera);
flip.addEventListener('click',()=>{facing=facing==='environment'?'user':'environment';openCamera();});
save.addEventListener('click',()=>{if(!stream){status.textContent='Start camera first';return;}canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pythermal-simulation-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');});
window.addEventListener('pagehide',()=>{if(stream)stream.getTracks().forEach(t=>t.stop());cancelAnimationFrame(frame);});
