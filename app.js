'use strict';
const $=id=>document.getElementById(id);
const video=$('camera'),canvas=$('view'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const status=$('status'),mode=$('mode'),palette=$('palette'),brightness=$('brightness'),contrast=$('contrast'),smooth=$('smooth'),auto=$('auto');
let stream=null,facing='environment',frame=0,previous=null,previousGray=null,frameNo=0;
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
function thermal(v){
 if(palette.value==='gray')return [v,v,v];
 if(palette.value==='iron')return [clamp(v*1.8-90),clamp(v*1.5-180),clamp(v*1.3-250)];
 const stops=[[0,0,10,60],[64,0,90,220],[128,20,220,125],[192,255,215,0],[255,255,35,10]];
 for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){
  const a=stops[i-1],b=stops[i],t=(v-a[0])/(b[0]-a[0]);
  return [1,2,3].map(k=>clamp(a[k]+(b[k]-a[k])*t));
 }
 return [255,35,10];
}
function render(){
 if(!stream)return;
 if(video.readyState>=2&&video.videoWidth>0){
  const w=Math.min(480,video.videoWidth),h=Math.max(1,Math.round(w*video.videoHeight/video.videoWidth));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;previous=null;previousGray=null;}
  ctx.drawImage(video,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h),d=img.data,gray=new Uint8Array(w*h);
  let total=0;
  for(let p=0,i=0;i<d.length;i+=4,p++){gray[p]=clamp(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);total+=gray[p];}
  const mean=total/gray.length,low=mean<42;
  const boost=auto.checked?Math.min(4.5,Math.max(1,95/Math.max(20,mean))):1;
  const b=Number(brightness.value),c=Number(contrast.value)/100;
  const alpha=Number(smooth.value)/100;
  let diff=0, samples=0;
  const output=new Uint8ClampedArray(d.length);
  for(let p=0,i=0;i<d.length;i+=4,p++){
   const lum=clamp(((gray[p]-128)*c+128)*boost+b);
   let rgb;
   if(mode.value==='thermal')rgb=thermal(lum);
   else if(mode.value==='night')rgb=[clamp(lum*.25),lum,clamp(lum*.3)];
   else if(mode.value==='edges'){
    const x=p%w,y=Math.floor(p/w);
    const edge=x>0&&y>0?Math.min(255,Math.abs(gray[p]-gray[p-1])*2+Math.abs(gray[p]-gray[p-w])*2):0;
    rgb=[edge,clamp(edge*.9),clamp(edge*.6)];
   }else rgb=[clamp(d[i]*boost+b),clamp(d[i+1]*boost+b),clamp(d[i+2]*boost+b)];
   for(let k=0;k<3;k++)output[i+k]=previous?clamp(rgb[k]*(1-alpha)+previous[i+k]*alpha):rgb[k];
   output[i+3]=255;
   if(previousGray&&p%16===0){diff+=Math.abs(gray[p]-previousGray[p]);samples++;}
  }
  d.set(output);ctx.putImageData(img,0,0);
  previous=output;previousGray=gray;
  if(frameNo++%8===0){
   $('light').textContent='Light: '+(low?'Very low':mean<95?'Low':'OK')+' ('+Math.round(mean)+'/255)';
   $('motion').textContent='Pixel motion: '+(!samples?'—':diff/samples>16?'High':diff/samples>6?'Some':'Low');
   status.textContent=low?'LOW LIGHT: detail may be lost · NOT heat sensing':'SIMULATION · no temperature readings';
  }
 }
 frame=requestAnimationFrame(render);
}
async function openCamera(){
 if(!navigator.mediaDevices?.getUserMedia){status.textContent='Camera unavailable: use Chrome on localhost';return;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 cancelAnimationFrame(frame);previous=null;previousGray=null;frameNo=0;
 status.textContent='Opening camera…';
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:480}}});
  video.srcObject=stream;await video.play();render();
 }catch(e){status.textContent='Camera error: '+e.message;}
}
$('start').addEventListener('click',openCamera);
$('flip').addEventListener('click',()=>{facing=facing==='environment'?'user':'environment';openCamera();});
$('save').addEventListener('click',()=>{if(!stream){status.textContent='Start camera first';return;}canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pythermal-v2-simulation-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');});
window.addEventListener('pagehide',()=>{if(stream)stream.getTracks().forEach(t=>t.stop());cancelAnimationFrame(frame);});
