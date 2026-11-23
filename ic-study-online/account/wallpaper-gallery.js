const IC_WALLPAPER_PRESETS=[
 {id:'mochi',name:'Mochi Hug',description:'Ôm mèo bông · má phồng dễ thương',palette:'mochi'},
 {id:'sunny',name:'Sunny Meadow',description:'Nằm trên cỏ · nắng và cúc nhỏ',palette:'sunny'},
 {id:'ocean',name:'Ocean Journey',description:'Tàu ven biển · phong cảnh xanh mát',palette:'ocean'},
 {id:'starlight',name:'Starry Village',description:'Làng dưới trăng · phong cảnh đêm sao',palette:'starlight'}
].map(p=>({...p,src:'/assets/wallpapers/'+p.id+'.webp',thumb:'/assets/wallpapers/'+p.id+'-thumb.webp',fileName:'ic-study-'+p.id+'.webp'}));
let icPresetGeneration=0;
function icWallpaperGallery(){return `<section class="ic-preset-section"><h3>Nền có sẵn ♡</h3><p class="look-note">Chọn một ảnh để dùng ngay. Nền sẽ được lưu vào tài khoản như ảnh tải lên.</p><label class="ic-preset-match"><input type="checkbox" id="ic-preset-match" checked> Đổi sang theme gợi ý cùng ảnh</label><div class="ic-preset-grid">${IC_WALLPAPER_PRESETS.map(p=>`<button class="ic-preset-card ${look.name===p.fileName?'active':''}" data-ic-preset="${p.id}" aria-pressed="${look.name===p.fileName}"><img src="${p.thumb}" alt="${escapeLook(p.description)}" loading="lazy"><span><strong>${escapeLook(p.name)}</strong><small>${escapeLook(p.description)}</small></span>${look.name===p.fileName?'<b class="ic-preset-check" aria-hidden="true">✓</b>':''}</button>`).join('')}</div></section>`}
async function icSelectWallpaperPreset(id,matchTheme=true){
 const preset=IC_WALLPAPER_PRESETS.find(p=>p.id===id);if(!preset)return;
 const generation=++icPresetGeneration;icSetWallStatus('Đang mở nền '+preset.name+'…');
 try{
  const response=await fetch(preset.src);if(!response.ok)throw Error('Chưa tải được nền này. Hãy thử lại khi có mạng.');
  const blob=await response.blob();if(generation!==icPresetGeneration)return;
  if(matchTheme)look.palette=preset.palette;look.fit='cinematic';
  await useNewWallpaper(new File([blob],preset.fileName,{type:'image/webp'}));
 }catch(error){toast(error.message||'Chưa mở được ảnh nền.');icSetWallStatus('Chưa mở được nền có sẵn. Ảnh hiện tại vẫn được giữ.');}
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-ic-preset]');if(button)void icSelectWallpaperPreset(button.dataset.icPreset,document.getElementById('ic-preset-match')?.checked!==false)});
