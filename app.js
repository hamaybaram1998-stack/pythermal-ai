'use strict';
const $=id=>document.getElementById(id),video=$('camera'),canvas=$('view'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const status=$('status'),mode=$('mode'),palette=$('palette'),brightness=$('brightness'),contrast=$('contrast'),smooth=$('smooth'),auto=$('auto');
let stream=null,facing='environment',frame=0,previous=null,previousGray=null,frameNo=0,model=null,aiEnabled=false,detectBusy=false,lastDetect=0,detections=[],cameraGeneration=0,lastRender=0;
const aiCanvas=document.createElement('canvas');aiCanvas.width=224;aiCanvas.height=224;const aiCtx=aiCanvas.getContext('2d',{willReadFrequently:true});
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
function thermal(v){
 if(palette.value==='gray')return [v,v,v];
 if(palette.value==='iron')return [clamp(v*1.8-90),clamp(v*1.5-180),clamp(v*1.3-250)];
 const stops=[[0,0,10,60],[64,0,90,220],[128,20,220,125],[192,255,215,0],[255,255,35,10]];
 for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){const a=stops[i-1],b=stops[i],t=(v-a[0])/(b[0]-a[0]);return [1,2,3].map(k=>clamp(a[k]+(b[k]-a[k])*t));}
 return [255,35,10];
}
function loadScript(url){
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('Could not download AI library'));document.head.appendChild(s);});
}
$('ai').addEventListener('click',async()=>{
 if(aiEnabled)return;
 $('ai').disabled=true;$('aiStatus').textContent='AI: loading (requires internet)...';
 try{
  if(!window.tf)await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
  if(!window.cocoSsd)await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
  if(!model)model=await cocoSsd.load({base:'lite_mobilenet_v2'});
  aiEnabled=true;$('aiStatus').textContent='AI: ready (visible objects only)';
 }catch(e){$('aiStatus').textContent='AI unavailable: '+e.message;}
 finally{$('ai').disabled=false;}
});
$('aiOff').addEventListener('click',()=>{aiEnabled=false;detections=[];$('aiStatus').textContent='AI: off';});
async function detect(gen){
 if(!model||!aiEnabled||!stream||detectBusy||video.readyState<2)return;
 detectBusy=true;
 try{
  aiCtx.drawImage(video,0,0,aiCanvas.width,aiCanvas.height);
  const found=await model.detect(aiCanvas,5,0.55);
  const sx=video.videoWidth/aiCanvas.width,sy=video.videoHeight/aiCanvas.height;
  for(const item of found){item.bbox=[item.bbox[0]*sx,item.bbox[1]*sy,item.bbox[2]*sx,item.bbox[3]*sy];}
  if(gen===cameraGeneration&&aiEnabled&&stream){
   detections=found;$('aiStatus').textContent='AI: '+(found.length?found.map(x=>x.class+' '+Math.round(x.score*100)+'%').join(', '):'no objects found');
  }
 }catch(e){$('aiStatus').textContent='AI error: '+e.message;aiEnabled=false;detections=[];}
 finally{detectBusy=false;}
}
function drawBoxes(w,h){
 if(!aiEnabled||!detections.length||!video.videoWidth)return;
 const sx=w/video.videoWidth,sy=h/video.videoHeight;
 ctx.lineWidth=Math.max(2,w/220);ctx.font=Math.max(12,Math.round(w/38))+'px sans-serif';
 for(const obj of detections){
  const [x,y,bw,bh]=obj.bbox,xx=x*sx,yy=y*sy;
  ctx.strokeStyle='#00ffad';ctx.strokeRect(xx,yy,bw*sx,bh*sy);
  const label=obj.class+' '+Math.round(obj.score*100)+'%';
  const tw=ctx.measureText(label).width+10,ly=Math.max(0,yy-20);
  ctx.fillStyle='#003c31';ctx.fillRect(xx,ly,tw,20);ctx.fillStyle='#ffffff';ctx.fillText(label,xx+5,ly+15);
 }
}
function render(now){
 if(!stream)return;
 if(video.readyState>=2&&video.videoWidth>0&&now-lastRender>=85){
  lastRender=now;
  const w=Math.min(256,video.videoWidth),h=Math.max(1,Math.round(w*video.videoHeight/video.videoWidth));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;previous=null;previousGray=null;}
  ctx.drawImage(video,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h),d=img.data,gray=new Uint8Array(w*h);
  let total=0;
  for(let p=0,i=0;i<d.length;i+=4,p++){gray[p]=clamp(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);total+=gray[p];}
  const mean=total/gray.length,low=mean<42,boost=auto.checked?Math.min(4.5,Math.max(1,95/Math.max(20,mean))):1;
  const b=Number(brightness.value),c=Number(contrast.value)/100,alpha=Number(smooth.value)/100;
  let diff=0,samples=0;
  const output=new Uint8ClampedArray(d.length);
  for(let p=0,i=0;i<d.length;i+=4,p++){
   const lum=clamp(((gray[p]-128)*c+128)*boost+b);
   let rgb;
   if(mode.value==='thermal')rgb=thermal(lum);
   else if(mode.value==='night')rgb=[clamp(lum*.25),lum,clamp(lum*.3)];
   else if(mode.value==='edges'){const x=p%w,y=Math.floor(p/w),edge=x>0&&y>0?Math.min(255,Math.abs(gray[p]-gray[p-1])*2+Math.abs(gray[p]-gray[p-w])*2):0;rgb=[edge,clamp(edge*.9),clamp(edge*.6)];}
   else rgb=[clamp(d[i]*boost+b),clamp(d[i+1]*boost+b),clamp(d[i+2]*boost+b)];
   for(let k=0;k<3;k++)output[i+k]=previous?clamp(rgb[k]*(1-alpha)+previous[i+k]*alpha):rgb[k];
   output[i+3]=255;
   if(previousGray&&p%16===0){diff+=Math.abs(gray[p]-previousGray[p]);samples++;}
  }
  d.set(output);ctx.putImageData(img,0,0);previous=output;previousGray=gray;
  drawBoxes(w,h);
  if(frameNo++%8===0){
   $('light').textContent='Light: '+(low?'Very low':mean<95?'Low':'OK')+' ('+Math.round(mean)+'/255)';
   $('motion').textContent='Pixel motion: '+(!samples?'—':diff/samples>16?'High':diff/samples>6?'Some':'Low');
   status.textContent=low?'LOW LIGHT: detail may be lost · NOT heat sensing':'SIMULATION · no temperature readings';
  }
  if(aiEnabled&&model&&!detectBusy&&now-lastDetect>2200){lastDetect=now;void detect(cameraGeneration);}
 }
 frame=requestAnimationFrame(render);
}
async function openCamera(){
 cameraGeneration++;
 if(!navigator.mediaDevices?.getUserMedia){status.textContent='Camera unavailable: use Chrome on localhost';return;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 cancelAnimationFrame(frame);previous=null;previousGray=null;frameNo=0;detections=[];lastRender=0;
 status.textContent='Opening camera…';
 try{
  const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:480}}});
  stream=next;video.srcObject=stream;await video.play();frame=requestAnimationFrame(render);
 }catch(e){status.textContent='Camera error: '+e.message;}
}
$('start').addEventListener('click',openCamera);
$('flip').addEventListener('click',()=>{facing=facing==='environment'?'user':'environment';void openCamera();});
$('save').addEventListener('click',()=>{if(!stream){status.textContent='Start camera first';return;}canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pythermal-v3-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');});
window.addEventListener('pagehide',()=>{cameraGeneration++;if(stream)stream.getTracks().forEach(t=>t.stop());cancelAnimationFrame(frame);});
