import { useState, useRef, useCallback, useEffect } from "react";

const STAMP_W = 370;
const STAMP_H = 320;

const STAMP_TEXTS = [
  "おはよう","ありがとう","よろしく","お疲れ様",
  "OK！","やったー！","がんばれ！","気をつけて",
  "ごめんね","大丈夫？","すごい！","笑いすぎ",
  "待ってて","いってきます","ただいま","おやすみ",
  "了解！","ナイス！","マジで？","ウケる",
  "眠い","腹減った","疲れた","最高！",
  "行くよ！","お先に","また今度","任せて",
  "ちょっと待って","そうだね","難しい","考え中",
];

const FONT_OPTIONS = [
  { label:"丸ゴシック",     value:"bold {sz}px 'Hiragino Maru Gothic Pro','M PLUS Rounded 1c',sans-serif" },
  { label:"ポップ体",       value:"bold {sz}px 'DotGothic16','M PLUS Rounded 1c',cursive" },
  { label:"手書き風",       value:"bold {sz}px 'Klee One','Kaisei Decol',serif" },
  { label:"やさしい丸文字", value:"{sz}px 'M PLUS Rounded 1c','Nunito',sans-serif" },
  { label:"ふんわり明朝",   value:"{sz}px 'Noto Serif JP','游明朝',serif" },
  { label:"おしゃれ細字",   value:"300 {sz}px 'Noto Sans JP','ヒラギノ角ゴ',sans-serif" },
  { label:"キュート太字",   value:"900 {sz}px 'M PLUS Rounded 1c','Hiragino Maru Gothic Pro',sans-serif" },
  { label:"えんぴつ風",     value:"{sz}px 'Yomogi','Klee One',cursive" },
  { label:"ガーリー明朝",   value:"bold {sz}px 'Kaisei Decol','Noto Serif JP',serif" },
  { label:"クール細ゴシック",value:"100 {sz}px 'Noto Sans JP','Hiragino Kaku Gothic Pro',sans-serif" },
];

const COLOR_SETS = [
  { bg:"#FF6B8A", text:"#FFF", outline:"#C23B5C", bubble:"#FFF", bubbleText:"#C23B5C", name:"ピンク" },
  { bg:"#4ECDC4", text:"#FFF", outline:"#2A8A83", bubble:"#FFF", bubbleText:"#2A8A83", name:"ミント" },
  { bg:"#FFD93D", text:"#333", outline:"#B89A00", bubble:"#FFF", bubbleText:"#B89A00", name:"イエロー" },
  { bg:"#6C5CE7", text:"#FFF", outline:"#3D2FA8", bubble:"#FFF", bubbleText:"#3D2FA8", name:"パープル" },
  { bg:"#FF9F43", text:"#FFF", outline:"#CC7000", bubble:"#FFF", bubbleText:"#CC7000", name:"オレンジ" },
  { bg:"#FFFFFF", text:"#333", outline:"#AAA",    bubble:"#333", bubbleText:"#FFF",    name:"シンプル" },
];

const BUBBLE_TYPES = [
  { label:"なし",     value:"none"  },
  { label:"楕円",     value:"round" },
  { label:"四角",     value:"rect"  },
  { label:"吹き出し", value:"tail"  },
];

const LINE_STEPS = [
  { num:1, title:"アカウント作成",   desc:"LINE Creators Marketにアクセスし、LINEアカウントでログイン。初回は「クリエイター情報」を登録します。", link:"https://creator.line.me", note:"個人・法人どちらでも可" },
  { num:2, title:"新規スタンプ登録", desc:"「マイページ」→「スタンプ」→「新規登録」。タイトル・説明文（日本語・英語）・販売価格を設定します。", note:"タイトルは30文字以内" },
  { num:3, title:"画像アップロード", desc:"このアプリで生成したZIPを解凍し、stamp_01.png〜を1枚ずつアップロード。メイン画像とトーク画像も自動同梱されています。", note:"370×320px PNG 最大1MB/枚" },
  { num:4, title:"審査申請",         desc:"全画像の登録後「申請」ボタンを押す。審査は通常1〜7営業日。リジェクト時は修正して再申請できます。", note:"著作権・品質・規約遵守が基準" },
  { num:5, title:"リリース・販売",   desc:"承認後、自分でリリース操作を行います。無料配布または50〜250コインで販売価格を設定可能です。", note:"収益は翌月末にポイント還元" },
];

const CHECKLIST_ITEMS = [
  { id:"own",     label:"使用している画像はすべて自分が権利を持つもの（自撮り・自作など）である",          must:true  },
  { id:"noip",    label:"他者のキャラクター・ブランドロゴ・著名人の顔写真を無断使用していない",              must:true  },
  { id:"transp",  label:"キャラクター周辺の背景を透過処理している（または透過背景の画像を使用している）",    must:true  },
  { id:"margin",  label:"画像の外枠とコンテンツの間に約10pxの余白がある",                                    must:true  },
  { id:"handmod", label:"テキスト追加・フキダシ・色変更など、AIだけでなく人の手による加工を加えた",          must:true  },
  { id:"noads",   label:"スタンプ内に宣伝・告知文言・企業ロゴのみの掲載がない",                              must:true  },
  { id:"daily",   label:"日常会話・コミュニケーションで使いやすい内容になっている",                          must:false },
  { id:"visible", label:"小さく表示しても文字・表情がはっきり見える（視認性OK）",                            must:false },
];

// ---- Canvas helpers ----
// 角丸吹き出し本体とツノを1本の輪郭線として描く（接合部の二重線を防ぐ）
function tracePillTailPath(ctx, x, y, w, h, r, cx, tailW, tailH) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(cx - tailW, y);
  ctx.lineTo(cx, y - tailH);
  ctx.lineTo(cx + tailW, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawBubble(ctx, text, bubbleType, colorSet, fontTpl, offsetY) {
  if (offsetY === undefined) offsetY = 0;
  if (bubbleType === "none" || !text) return;
  const fontSize = text.length <= 3 ? 40 : text.length <= 5 ? 34 : text.length <= 7 ? 29 : 24;
  const font = fontTpl.replace("{sz}", fontSize);
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  const minBW = 180;
  const padX = Math.max(60, (minBW - tw) / 2);
  const padY = 10;
  const bw = tw + padX * 2, bh = fontSize + padY * 2;
  const bx = (STAMP_W - bw) / 2;
  const by = STAMP_H - bh - 20 + offsetY;
  const cx = STAMP_W / 2, cy = by + bh / 2;
  ctx.save();
  if (bubbleType === "round") {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(cx+5, cy+5, bw/2+12, bh/2+8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = colorSet.bubble; ctx.strokeStyle = colorSet.outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(cx, cy, bw/2+12, bh/2+8, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  } else if (bubbleType === "rect") {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.roundRect(bx-2+5, by-2+5, bw+4, bh+4, 16); ctx.fill();
    ctx.fillStyle = colorSet.bubble; ctx.strokeStyle = colorSet.outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(bx-2, by-2, bw+4, bh+4, 16); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = colorSet.outline + "55"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx+4, by+4, bw-8, bh-8, 10); ctx.stroke();
  } else if (bubbleType === "tail") {
    const x = bx - 2, y = by - 2, w = bw + 4, h = bh + 4, r = 16, tailW = 16, tailH = 24;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    tracePillTailPath(ctx, x + 5, y + 5, w, h, r, cx + 5, tailW, tailH); ctx.fill();
    ctx.fillStyle = colorSet.bubble; ctx.strokeStyle = colorSet.outline; ctx.lineWidth = 5; ctx.lineJoin = "round";
    tracePillTailPath(ctx, x, y, w, h, r, cx, tailW, tailH); ctx.fill(); ctx.stroke();
  }
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = font;
  ctx.lineWidth = 4; ctx.strokeStyle = colorSet.outline + "88"; ctx.strokeText(text, cx, cy);
  ctx.fillStyle = colorSet.bubbleText; ctx.fillText(text, cx, cy);
  ctx.restore();
}

// 名前・店名などのラベル表示（吹き出しの下に「— 名前 —」形式で表示）
function drawNameLabel(ctx, name, colorSet, fontTpl) {
  if (!name) return;
  const len = name.length;
  const fontSize = len <= 4 ? 18 : len <= 8 ? 15 : len <= 12 ? 13 : 11;
  const font = fontTpl.replace("{sz}", fontSize);
  const display = "— " + name + " —";
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.lineWidth = 4; ctx.strokeStyle = colorSet.outline;
  ctx.strokeText(display, STAMP_W / 2, STAMP_H - 10);
  ctx.fillStyle = colorSet.text;
  ctx.fillText(display, STAMP_W / 2, STAMP_H - 10);
  ctx.restore();
}

function drawStamp(canvas, imageEl, text, colorSet, fontTpl, bgStyle, bubbleType, offsetY, textColorOverride, nameLabel) {
  if (offsetY === undefined) offsetY = 0;
  const ec = textColorOverride ? Object.assign({}, colorSet, { bubbleText: textColorOverride, text: textColorOverride }) : colorSet;
  const ctx = canvas.getContext("2d");
  canvas.width = STAMP_W; canvas.height = STAMP_H;
  ctx.clearRect(0,0,STAMP_W,STAMP_H);
  if (bgStyle==="color") {
    ctx.fillStyle=ec.bg; ctx.beginPath(); ctx.roundRect(0,0,STAMP_W,STAMP_H,40); ctx.fill();
  } else if (bgStyle==="gradient") {
    const g=ctx.createLinearGradient(0,0,STAMP_W,STAMP_H);
    g.addColorStop(0,ec.bg); g.addColorStop(1,ec.outline+"55");
    ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(0,0,STAMP_W,STAMP_H,40); ctx.fill();
  }
  if (imageEl) {
    const hasBubble=bubbleType!=="none"&&text;
    const aspect=imageEl.naturalWidth/imageEl.naturalHeight;
    const maxH=hasBubble?STAMP_H*0.58:text?STAMP_H*0.65:STAMP_H*0.84, maxW=STAMP_W*0.82;
    let dw,dh;
    if (aspect>maxW/maxH){dw=maxW;dh=dw/aspect;}else{dh=maxH;dw=dh*aspect;}
    ctx.drawImage(imageEl,(STAMP_W-dw)/2,hasBubble?8:text?10:(STAMP_H-dh)/2,dw,dh);
  }
  if (bubbleType!=="none"&&text) drawBubble(ctx,text,bubbleType,ec,fontTpl,offsetY);
  else if (text) {
    const sz=text.length<=4?48:text.length<=6?40:32;
    ctx.font=fontTpl.replace("{sz}",sz); ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.lineWidth=7; ctx.strokeStyle=ec.outline; ctx.strokeText(text,STAMP_W/2,STAMP_H-44);
    ctx.fillStyle=ec.text; ctx.fillText(text,STAMP_W/2,STAMP_H-44);
  }
  if (nameLabel) drawNameLabel(ctx, nameLabel, ec, fontTpl);
}

// ② キー画像生成
function generateKeyImages(imageEl, colorSet, bgStyle) {
  return [
    { name:"main.png", w:240, h:240 },
    { name:"tab.png", w:96, h:74 },
  ].map(function(item) {
    const c = document.createElement("canvas");
    c.width = item.w; c.height = item.h;
    const ctx = c.getContext("2d");
    if (bgStyle==="color") {
      ctx.fillStyle=colorSet.bg; ctx.beginPath(); ctx.roundRect(0,0,item.w,item.h,20); ctx.fill();
    } else if (bgStyle==="gradient") {
      const g=ctx.createLinearGradient(0,0,item.w,item.h);
      g.addColorStop(0,colorSet.bg); g.addColorStop(1,colorSet.outline+"55");
      ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(0,0,item.w,item.h,20); ctx.fill();
    }
    if (imageEl) {
      const aspect=imageEl.naturalWidth/imageEl.naturalHeight;
      const maxW=item.w*0.85, maxH=item.h*0.85;
      let dw,dh;
      if (aspect>maxW/maxH){dw=maxW;dh=dw/aspect;}else{dh=maxH;dw=dh*aspect;}
      ctx.drawImage(imageEl,(item.w-dw)/2,(item.h-dh)/2,dw,dh);
    }
    return { name: item.name, dataUrl: c.toDataURL("image/png") };
  });
}

// ① サイズチェック
function getStampSizeKB(dataUrl) {
  const b64 = dataUrl.split(",")[1] || "";
  return Math.round((b64.length * 3) / 4 / 1024);
}

// ---- DrawingEditor ----
const SHAPE_STAMPS = [
  { label:"♥", key:"heart" }, { label:"★", key:"star" }, { label:"●", key:"circle" },
  { label:"✦", key:"spark" }, { label:"◆", key:"diamond" }, { label:"✓", key:"check" },
  { label:"!", key:"excl" }, { label:"〇", key:"ring" }, { label:"〜", key:"wave" },
];

function drawShape(ctx, key, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color; ctx.font = size + "px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const map = { heart:"❤", star:"⭐", circle:"●", spark:"✦", diamond:"◆", check:"✓", excl:"！", ring:"〇", wave:"〜" };
  ctx.fillText(map[key]||"●", x, y);
  ctx.restore();
}

function DrawingEditor({ stamp, onSave, onClose }) {
  const canvasRef = useRef(), overlayRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("shape");
  const [color, setColor] = useState("#FF3366");
  const [size, setSize] = useState(48);
  const [selectedShape, setSelectedShape] = useState("heart");
  const [history, setHistory] = useState([]);
  const points = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = STAMP_W; canvas.height = STAMP_H;
    const img = new Image();
    img.onload = function() { canvas.getContext("2d").drawImage(img,0,0); setHistory([canvas.toDataURL()]); };
    img.src = stamp.dataUrl;
    const ov = overlayRef.current;
    if (ov) { ov.width = STAMP_W; ov.height = STAMP_H; }
  }, [stamp.dataUrl]);

  const getPos = function(e) {
    const r = overlayRef.current.getBoundingClientRect();
    const sx = STAMP_W/r.width, sy = STAMP_H/r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x:(src.clientX-r.left)*sx, y:(src.clientY-r.top)*sy };
  };

  const saveHistory = function() {
    if (canvasRef.current) setHistory(function(p){ return [...p.slice(-19), canvasRef.current.toDataURL()]; });
  };

  const undo = function() {
    if (history.length < 2 || !canvasRef.current) return;
    const prev = history[history.length-2];
    setHistory(function(h){ return h.slice(0,-1); });
    const img = new Image();
    img.onload = function() { const ctx=canvasRef.current.getContext("2d"); ctx.clearRect(0,0,STAMP_W,STAMP_H); ctx.drawImage(img,0,0); };
    img.src = prev;
  };

  const smooth = function(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i=1; i<pts.length-1; i++) out.push({ x:(pts[i-1].x+pts[i].x*2+pts[i+1].x)/4, y:(pts[i-1].y+pts[i].y*2+pts[i+1].y)/4 });
    out.push(pts[pts.length-1]); return out;
  };

  const startDraw = function(e) {
    e.preventDefault();
    const pos = getPos(e);
    if (tool==="shape") { saveHistory(); drawShape(canvasRef.current.getContext("2d"), selectedShape, pos.x, pos.y, size, color); return; }
    setDrawing(true); points.current = [pos];
  };

  const doDraw = function(e) {
    if (!drawing || tool==="shape" || !canvasRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    points.current.push(pos);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineCap="round"; ctx.lineJoin="round";
    if (tool==="pen") { ctx.globalCompositeOperation="source-over"; ctx.strokeStyle=color; ctx.lineWidth=size*0.25; }
    else { ctx.globalCompositeOperation="destination-out"; ctx.lineWidth=size*0.5; }
    const pts = smooth(points.current.slice(-6));
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1; i<pts.length; i++) {
      const m = { x:(pts[i-1].x+pts[i].x)/2, y:(pts[i-1].y+pts[i].y)/2 };
      ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,m.x,m.y);
    }
    ctx.stroke();
  };

  const endDraw = function() {
    if (!drawing) return;
    setDrawing(false); points.current=[]; saveHistory();
  };

  const COLORS = ["#FF3366","#FF9500","#FFCC00","#34C759","#007AFF","#5856D6","#FF2D55","#000000","#FFFFFF"];
  const BG="#1a1a2e",SURFACE="#16213e",ACCENT="#e94560",TEXT="#ffffff",TEXT2="#a8b2d8",BORDER="rgba(255,255,255,0.15)";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"1rem"}}>
      <div style={{background:BG,borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",border:"1.5px solid "+BORDER}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:14,borderBottom:"1px solid "+BORDER}}>
          <div>
            <div style={{fontSize:17,fontWeight:500,color:TEXT}}>✏️ 手描き編集</div>
            <div style={{fontSize:13,color:TEXT2,marginTop:3}}>スタンプ：{stamp.text}</div>
          </div>
          <button style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid "+BORDER,background:"transparent",cursor:"pointer",fontSize:13,color:TEXT2}} onClick={undo} disabled={history.length<2}>↩ 元に戻す</button>
        </div>

        <div style={{marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:500,color:TEXT,display:"block",marginBottom:8}}>ツール選択</span>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["shape","図形スタンプ"],["pen","フリーハンドペン"],["eraser","消しゴム"]].map(function(t) {
              const active = tool===t[0];
              return <button key={t[0]} onClick={function(){setTool(t[0]);if(t[0]==="pen")setSize(10);if(t[0]==="eraser")setSize(20);}} style={{padding:"10px 18px",borderRadius:8,border:"1.5px solid "+(active?ACCENT:BORDER),background:active?ACCENT:"transparent",cursor:"pointer",fontSize:14,fontWeight:500,color:active?TEXT:TEXT2}}>{t[1]}</button>;
            })}
          </div>
        </div>

        {tool==="shape" && (
          <div style={{marginBottom:14,padding:"12px",background:SURFACE,borderRadius:10,border:"1px solid "+BORDER}}>
            <span style={{fontSize:14,fontWeight:500,color:TEXT,display:"block",marginBottom:8}}>① 図形を選ぶ</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {SHAPE_STAMPS.map(function(sh) {
                return <button key={sh.key} onClick={function(){setSelectedShape(sh.key);}} style={{width:44,height:44,fontSize:24,borderRadius:8,border:"2px solid "+(selectedShape===sh.key?ACCENT:BORDER),background:selectedShape===sh.key?"rgba(233,69,96,0.2)":"transparent",cursor:"pointer",color:TEXT}}>{sh.label}</button>;
              })}
            </div>
            <span style={{fontSize:14,fontWeight:500,color:TEXT,display:"block",marginBottom:8}}>② サイズ</span>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input type="range" min={20} max={100} value={size} step={4} onChange={function(e){setSize(Number(e.target.value));}} style={{flex:1}} />
              <span style={{fontSize:14,color:TEXT,minWidth:40}}>{size}px</span>
            </div>
          </div>
        )}

        {tool==="pen" && (
          <div style={{marginBottom:14,padding:"12px",background:SURFACE,borderRadius:10,border:"1px solid "+BORDER}}>
            <span style={{fontSize:14,fontWeight:500,color:TEXT,display:"block",marginBottom:8}}>太さ</span>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input type="range" min={2} max={30} value={size} onChange={function(e){setSize(Number(e.target.value));}} style={{flex:1}} />
              <span style={{fontSize:14,color:TEXT,minWidth:40}}>{size}px</span>
              <span style={{fontSize:12,color:TEXT2}}>手ブレ補正あり</span>
            </div>
          </div>
        )}

        {(tool==="pen"||tool==="shape") && (
          <div style={{marginBottom:14,padding:"12px",background:SURFACE,borderRadius:10,border:"1px solid "+BORDER}}>
            <span style={{fontSize:14,fontWeight:500,color:TEXT,display:"block",marginBottom:8}}>{tool==="shape"?"③ 色を選ぶ":"色を選ぶ"}</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {COLORS.map(function(c) {
                return <button key={c} onClick={function(){setColor(c);}} style={{width:32,height:32,borderRadius:"50%",background:c,border:color===c?"3px solid "+ACCENT:"2px solid rgba(255,255,255,0.3)",cursor:"pointer"}} />;
              })}
              <input type="color" value={color} onChange={function(e){setColor(e.target.value);}} style={{width:32,height:32,padding:0,border:"none",borderRadius:"50%",cursor:"pointer"}} />
            </div>
          </div>
        )}

        <div style={{marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:500,color:TEXT,marginBottom:8}}>{tool==="shape"?"④ キャンバスをクリックして図形を配置":"キャンバスをドラッグして描画"}</div>
          <div style={{position:"relative",width:"100%",maxWidth:STAMP_W,margin:"0 auto",background:"repeating-conic-gradient(#555 0% 25%,#333 0% 50%) 0 0/16px 16px",borderRadius:10,overflow:"hidden",cursor:tool==="shape"?"crosshair":"cell",border:"1.5px solid "+BORDER}}>
            <canvas ref={canvasRef} style={{display:"block",width:"100%",touchAction:"none"}} />
            <canvas ref={overlayRef} style={{position:"absolute",inset:0,width:"100%",opacity:0,touchAction:"none"}}
              onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={endDraw} />
          </div>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16,paddingTop:14,borderTop:"1px solid "+BORDER}}>
          <button style={{padding:"12px 20px",borderRadius:8,border:"1.5px solid "+BORDER,background:"transparent",cursor:"pointer",fontSize:14,color:TEXT2}} onClick={onClose}>キャンセル</button>
          <button style={{padding:"12px 24px",borderRadius:8,border:"none",background:ACCENT,color:TEXT,cursor:"pointer",fontSize:14,fontWeight:500}} onClick={function(){if(canvasRef.current)onSave(canvasRef.current.toDataURL("image/png"));}}>この編集を保存</button>
        </div>
      </div>
    </div>
  );
}

function ChecklistModal({ onConfirm, onClose, stampCount }) {
  const [checks, setChecks] = useState({});
  const toggle = function(id) { setChecks(function(p){ return Object.assign({},p,{[id]:!p[id]}); }); };
  const mustItems = CHECKLIST_ITEMS.filter(function(i){return i.must;});
  const checkedCount = mustItems.filter(function(i){return checks[i.id];}).length;
  const allMustChecked = checkedCount === mustItems.length;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:"1rem"}}>
      <div style={{background:"var(--color-background-primary)",borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:4,color:"var(--color-text-primary)"}}>📋 申請前チェックリスト</div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem"}}>{stampCount}枚のスタンプをZIPダウンロードする前に確認してください。タップでチェックできます。</div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-danger)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>✅ 必須確認（タップしてチェック）</div>
        {CHECKLIST_ITEMS.filter(function(i){return i.must;}).map(function(item) {
          const checked = !!checks[item.id];
          return (
            <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:8,marginBottom:6,background:checked?"var(--color-background-success)":"var(--color-background-danger)",border:"0.5px solid "+(checked?"var(--color-border-success)":"var(--color-border-danger)"),cursor:"pointer"}} onClick={function(){toggle(item.id);}}>
              <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(checked?"var(--color-text-success)":"var(--color-border-secondary)"),background:checked?"var(--color-background-success)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                {checked&&<span style={{fontSize:12,color:"var(--color-text-success)",fontWeight:700}}>✓</span>}
              </div>
              <span style={{fontSize:13,color:"var(--color-text-primary)",lineHeight:1.5}}>{item.label}</span>
            </div>
          );
        })}
        <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",margin:"12px 0 6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>推奨確認</div>
        {CHECKLIST_ITEMS.filter(function(i){return !i.must;}).map(function(item) {
          const checked = !!checks[item.id];
          return (
            <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:8,marginBottom:6,background:checked?"var(--color-background-success)":"var(--color-background-secondary)",border:"0.5px solid "+(checked?"var(--color-border-success)":"var(--color-border-tertiary)"),cursor:"pointer"}} onClick={function(){toggle(item.id);}}>
              <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(checked?"var(--color-text-success)":"var(--color-border-secondary)"),background:checked?"var(--color-background-success)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                {checked&&<span style={{fontSize:12,color:"var(--color-text-success)",fontWeight:700}}>✓</span>}
              </div>
              <span style={{fontSize:13,color:"var(--color-text-primary)",lineHeight:1.5}}>{item.label}</span>
            </div>
          );
        })}
        {!allMustChecked&&<div style={{padding:"10px 14px",background:"#e8f4fd",border:"1.5px solid #90caf9",borderRadius:8,fontSize:13,color:"#1565c0",marginTop:12,textAlign:"center"}}>💡 {checkedCount}/{mustItems.length}項目確認済み — 未確認のままでもダウンロードできます</div>}
        {allMustChecked&&<div style={{padding:"10px 14px",background:"#e8f5e9",border:"1.5px solid #66bb6a",borderRadius:8,fontSize:13,fontWeight:600,color:"#2e7d32",marginTop:12,textAlign:"center"}}>✅ すべての必須項目を確認しました！</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}>
          <button style={{padding:"10px 20px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer",fontSize:13,color:"var(--color-text-primary)"}} onClick={onClose}>戻る</button>
          <button style={{padding:"10px 24px",borderRadius:8,border:"none",background:"#06C755",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,boxShadow:"0 2px 8px rgba(6,199,85,0.4)"}} onClick={onConfirm}>
            📦 ZIPダウンロード
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnouncementPanel({ stampTitle }) {
  const [copied, setCopied] = useState(false);
  const text = "【動作環境・ご注意事項】\n━━━━━━━━━━━━━━━━━━\n■ 動作環境\n・LINE アプリ（iOS / Android）最新版推奨\n・LINE STORE（ブラウザ）からも購入可能\n\n■ 購入前のご確認\n・購入後の返金はお受けできません\n・本スタンプはLINEトーク内でのみ使用可能です\n\n■ 免責事項\n・OS・LINEアプリのアップデートにより表示が変わる場合があります\n・著作権はクリエイター本人に帰属します\n━━━━━━━━━━━━━━━━━━\n" + (stampTitle ? "スタンプ名："+stampTitle : "");
  const copy = function() { navigator.clipboard.writeText(text).then(function(){setCopied(true);setTimeout(function(){setCopied(false);},2000);}); };
  return (
    <div style={{marginTop:"1.25rem",borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:"1.25rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>購入者向けアナウンス文</div>
        <button onClick={copy} style={{padding:"6px 14px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:copied?"var(--color-background-success)":"transparent",cursor:"pointer",fontSize:12,color:copied?"var(--color-text-success)":"var(--color-text-primary)"}}>{copied?"コピーしました ✓":"テキストをコピー"}</button>
      </div>
      <pre style={{fontSize:12,color:"var(--color-text-secondary)",background:"var(--color-background-secondary)",borderRadius:8,padding:"0.75rem",whiteSpace:"pre-wrap",lineHeight:1.7,margin:0}}>{text}</pre>
    </div>
  );
}

export default function App() {
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [removeBgProgress, setRemoveBgProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [bgStyle, setBgStyle] = useState("transparent");
  const [bubbleType, setBubbleType] = useState("tail");
  const [bubbleOffsetY, setBubbleOffsetY] = useState(0);
  const [nameLabelEnabled, setNameLabelEnabled] = useState(false);
  const [nameLabel, setNameLabel] = useState("");
  const [count, setCount] = useState(16);
  const [customTexts, setCustomTexts] = useState([]);
  const [step, setStep] = useState("upload");
  const [lineGuide, setLineGuide] = useState(false);
  const [announcement, setAnnouncement] = useState(false);
  const [editingStamp, setEditingStamp] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [stampTitle, setStampTitle] = useState("");
  const [showTerms, setShowTerms] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [isDemo] = useState(function(){ return new URLSearchParams(window.location.search).get("demo")==="true"; });
  const [aiDesc, setAiDesc] = useState(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const fileRef = useRef();

  // ⑦ localStorage復元
  useEffect(function() {
    try {
      const s = JSON.parse(localStorage.getItem("lsg_settings")||"{}");
      if (s.selectedColor!=null) setSelectedColor(s.selectedColor);
      if (s.selectedFont!=null)  setSelectedFont(s.selectedFont);
      if (s.bgStyle)      setBgStyle(s.bgStyle);
      if (s.bubbleType)   setBubbleType(s.bubbleType);
      if (s.bubbleOffsetY!=null) setBubbleOffsetY(s.bubbleOffsetY);
      if (s.nameLabelEnabled!=null) setNameLabelEnabled(s.nameLabelEnabled);
      if (s.nameLabel!=null) setNameLabel(s.nameLabel);
      if (s.count)        setCount(s.count);
      if (s.stampTitle)   setStampTitle(s.stampTitle);
      if (s.customTexts && s.customTexts.length) setCustomTexts(s.customTexts);
      const sv = JSON.parse(localStorage.getItem("lsg_stamps")||"null");
      if (sv && sv.length) { setStamps(sv); setStep("preview"); }
    } catch(e) {}
  }, []);

  // ⑦ localStorage保存
  useEffect(function() {
    try { localStorage.setItem("lsg_settings", JSON.stringify({ selectedColor, selectedFont, bgStyle, bubbleType, bubbleOffsetY, count, stampTitle, customTexts, nameLabelEnabled, nameLabel })); } catch(e) {}
  }, [selectedColor, selectedFont, bgStyle, bubbleType, bubbleOffsetY, count, stampTitle, customTexts, nameLabelEnabled, nameLabel]);

  useEffect(function() {
    try { if (stamps.length) localStorage.setItem("lsg_stamps", JSON.stringify(stamps)); } catch(e) {}
  }, [stamps]);

  useEffect(function() {
    const p = new URLSearchParams(window.location.search);
    if (p.get("success")==="true") { setIsPaid(true); window.history.replaceState({},"","/"); }
  }, []);

  const handleCheckout = async function() {
    setCheckingOut(true);
    try {
      const r = await fetch("/api/create-checkout-session",{method:"POST"});
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch(e) { alert("決済ページへの移動に失敗しました。"); }
    setCheckingOut(false);
  };

  const removeBackground = async function(file) {
    try {
      const b64 = await new Promise(function(res){const r=new FileReader();r.onload=function(){res(r.result.split(",")[1]);};r.onerror=function(){res(null);};r.readAsDataURL(file);});
      if (!b64) return null;
      const r = await fetch("/api/remove-bg",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:b64,type:file.type||"image/png"})});
      if (!r.ok) return null;
      const data = await r.json();
      if (!data.image) return null;
      const bin = atob(data.image);
      const bytes = new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes],{type:"image/png"}));
    } catch(e) { return null; }
  };

  const handleFiles = async function(e) {
    const files = Array.from(e.target.files||[]);
    if (!files.length) return;
    const target = Math.min(files.length, 5);
    setRemovingBg(true); setRemoveBgProgress(0);
    const loaded = [];
    for (let i=0; i<target; i++) {
      const file = files[i];
      let url = URL.createObjectURL(file);
      let bgRemoved = false;
      const ru = await removeBackground(file);
      if (ru) { url = ru; bgRemoved = true; }
      setRemoveBgProgress(Math.round(((i+1)/target)*100));
      const img = new Image();
      await new Promise(function(res){img.onload=res;img.onerror=res;img.src=url;});
      loaded.push({url,el:img,name:file.name,bgRemoved});
    }
    setRemovingBg(false); setRemoveBgProgress(0);
    setImages(function(prev){ return [...prev,...loaded].slice(0,5); });
    setStep("config"); setAnalysis(null); setStamps([]);
    e.target.value="";
  };

  const analyzeImages = async function() {
    if (!images.length) return;
    setAnalyzing(true);
    try {
      const imageContents = await Promise.all(images.map(async function(item){
        const blob = await (await fetch(item.url)).blob();
        const b64 = await new Promise(function(res){const r=new FileReader();r.onload=function(){res(r.result.split(",")[1]);};r.readAsDataURL(blob);});
        return {type:"image",source:{type:"base64",media_type:blob.type||"image/jpeg",data:b64}};
      }));
      const r = await fetch("/api/claude-proxy",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:[
          ...imageContents,
          {type:"text",text:"これらの画像（"+images.length+"枚）のキャラクター・被写体を分析してください。LINEスタンプ向けの日本語テキスト候補を"+count+"個提案してください（10文字以内推奨）。JSON形式のみで返してください（マークダウン不要）:\n{\"subject\":\"被写体の説明\",\"mood\":\"雰囲気\",\"imageNotes\":[\"画像1の特徴\"],\"texts\":[\"テキスト1\",...]}"}
        ]}]})
      });
      const data = await r.json();
      const parsed = JSON.parse(data.content.map(function(c){return c.text||"";}).join("").replace(/```json|```/g,"").trim());
      setAnalysis(parsed); setCustomTexts(parsed.texts||[]);
    } catch(err) {
      setCustomTexts(STAMP_TEXTS.slice(0,count));
      setAnalysis({subject:"画像",mood:"かわいい",imageNotes:[],texts:STAMP_TEXTS.slice(0,count)});
    }
    setAnalyzing(false);
  };

  const generateAiDesc = async function() {
    setGeneratingDesc(true);
    try {
      const r = await fetch("/api/claude-proxy",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:"LINEスタンプのCreators Market申請用のタイトルと説明文を生成してください。\nスタンプ名: "+(stampTitle||"未設定")+"\n被写体: "+(analysis&&analysis.subject||"キャラクター")+"\n雰囲気: "+(analysis&&analysis.mood||"かわいい")+"\nテキスト例: "+customTexts.slice(0,5).join("、")+"\nJSON形式のみで返してください（マークダウン不要）:\n{\"titleJa\":\"日本語タイトル(30文字以内)\",\"titleEn\":\"English title\",\"descJa\":\"日本語説明文(3文以内)\",\"descEn\":\"English description\"}"}]})
      });
      const data = await r.json();
      setAiDesc(JSON.parse(data.content.map(function(c){return c.text||"";}).join("").replace(/```json|```/g,"").trim()));
    } catch(e) { setAiDesc({titleJa:"スタンプ",titleEn:"Sticker",descJa:"オリジナルLINEスタンプです。",descEn:"Original LINE stickers."}); }
    setGeneratingDesc(false);
  };

  const generateStamps = useCallback(function() {
    if (!images.length) return;
    const texts = (customTexts.length>0?customTexts:STAMP_TEXTS).slice(0,count);
    const colorSet = COLOR_SETS[selectedColor];
    const fontTpl = FONT_OPTIONS[selectedFont].value;
    const label = nameLabelEnabled ? nameLabel.trim() : "";
    const newStamps = texts.map(function(text,i){
      const imgEl = images[i%images.length].el;
      const c = document.createElement("canvas");
      drawStamp(c,imgEl,text,colorSet,fontTpl,bgStyle,bubbleType,bubbleOffsetY,null,label);
      return {text,dataUrl:c.toDataURL("image/png"),imgIdx:i%images.length,edited:false,textColor:null};
    });
    setStamps(newStamps); setStep("preview");
  }, [images,customTexts,count,selectedColor,selectedFont,bgStyle,bubbleType,bubbleOffsetY,nameLabelEnabled,nameLabel]);

  const handleSaveEdit = function(idx, dataUrl) {
    setStamps(function(prev){ return prev.map(function(s,i){ return i===idx?Object.assign({},s,{dataUrl,edited:true}):s; }); });
    setEditingStamp(null);
  };

  // ⑤ 個別テキストカラー
  const handleStampTextColor = function(idx, color) {
    if (!images.length) return;
    const stamp = stamps[idx];
    const imgEl = images[stamp.imgIdx%images.length].el;
    const colorSet = COLOR_SETS[selectedColor];
    const fontTpl = FONT_OPTIONS[selectedFont].value;
    const c = document.createElement("canvas");
    drawStamp(c,imgEl,stamp.text,colorSet,fontTpl,bgStyle,bubbleType,bubbleOffsetY,color||null,nameLabelEnabled?nameLabel.trim():"");
    setStamps(function(prev){ return prev.map(function(s,i){ return i===idx?Object.assign({},s,{dataUrl:c.toDataURL("image/png"),textColor:color||null}):s; }); });
  };

  // ⑥ 並べ替え
  const moveStamp = function(idx, dir) {
    const ni = idx+dir;
    if (ni<0||ni>=stamps.length) return;
    setStamps(function(prev){
      const a=[...prev];
      const tmp=a[idx]; a[idx]=a[ni]; a[ni]=tmp;
      return a;
    });
  };

  const doDownload = async function() {
    try {
      const JSZip = (await import("https://esm.sh/jszip@3")).default;
      const zip = new JSZip();
      // 静止画
      stamps.forEach(function(s,i){ zip.file(String(i+1).padStart(2,"0")+".png", s.dataUrl.split(",")[1], {base64:true}); });
      // キー画像
      if (images.length) {
        generateKeyImages(images[0].el, COLOR_SETS[selectedColor], bgStyle).forEach(function(ki){
          zip.file(ki.name, ki.dataUrl.split(",")[1], {base64:true});
        });
      }
      const blob = await zip.generateAsync({type:"blob"});
      const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="line_stamps.zip"; a.click();
    } catch(err) { console.error(err); alert("ZIPのダウンロードに失敗しました。"); }
  };

  const editedCount = stamps.filter(function(s){return s.edited;}).length;
  const isMobile = typeof window!=="undefined" && window.innerWidth<600;

  const S = {
    app:{fontFamily:"var(--font-sans)",maxWidth:780,margin:"0 auto",padding:isMobile?"1rem 0.75rem":"1.5rem 1rem"},
    card:{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:isMobile?"1rem":"1.25rem",marginBottom:"1rem"},
    btn:{padding:isMobile?"10px 14px":"8px 18px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer",fontSize:isMobile?14:13,color:"var(--color-text-primary)"},
    btnOutline:function(active){ return {padding:isMobile?"10px 14px":"8px 16px",borderRadius:8,border:active?"2.5px solid #06C755":"1.5px solid var(--color-border-secondary)",background:active?"#E8F9EF":"transparent",cursor:"pointer",fontSize:isMobile?14:13,color:active?"#06C755":"var(--color-text-primary)",fontWeight:active?700:400,boxShadow:active?"0 0 0 1px #06C755":"none"}; },
    colorDot:function(i){ return {width:isMobile?36:30,height:isMobile?36:30,borderRadius:"50%",background:COLOR_SETS[i].bg,border:selectedColor===i?"4px solid #06C755":"3px solid #cccccc",cursor:"pointer",outline:selectedColor===i?"2px solid #ffffff":"none",flexShrink:0,boxShadow:selectedColor===i?"0 0 0 2px #06C755":"none"}; },
    tag:{display:"inline-block",padding:isMobile?"6px 12px":"4px 10px",borderRadius:20,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:isMobile?13:12,margin:"2px",cursor:"pointer"},
  };

  return (
    <div style={Object.assign({},S.app,{background:"var(--color-background-secondary)",minHeight:"100vh"})}>
      {editingStamp!==null&&<DrawingEditor stamp={stamps[editingStamp]} onSave={function(d){handleSaveEdit(editingStamp,d);}} onClose={function(){setEditingStamp(null);}} />}
      {showChecklist&&<ChecklistModal stampCount={stamps.length} onConfirm={function(){setShowChecklist(false);doDownload();}} onClose={function(){setShowChecklist(false);}} />}

      {/* Demo Banner */}
      {isDemo&&(
        <div style={{background:"linear-gradient(135deg,#FF9800,#F57C00)",borderRadius:12,padding:"14px 20px",marginBottom:"1rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>🎯</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>デモモードでご覧いただいています</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>スタンプ生成まで無料でお試しいただけます。ZIPダウンロードは月額980円のプランにご登録ください。</div>
            </div>
          </div>
          <button onClick={handleCheckout} disabled={checkingOut} style={{padding:"10px 20px",borderRadius:8,border:"2px solid rgba(255,255,255,0.7)",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,flexShrink:0,backdropFilter:"blur(4px)"}}>
            {checkingOut?"処理中...":"登録して使い始める →"}
          </button>
        </div>
      )}

      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#06C755 0%,#00A040 100%)",borderRadius:16,padding:isMobile?"2rem 1.25rem":"3rem 2.5rem",marginBottom:"1.5rem",color:"#fff",position:"relative",overflow:"hidden",textAlign:"center"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:150,height:150,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}} />
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.15em",opacity:0.85,marginBottom:12,textTransform:"uppercase"}}>🤖 AI-Powered LINE Stamp Generator</div>
        <h1 style={{fontSize:isMobile?26:38,fontWeight:800,margin:"0 0 12px",letterSpacing:"-0.02em",lineHeight:1.2}}>写真1枚から<br/>オリジナルLINEスタンプを<br/>最短3分で作成</h1>
        <p style={{fontSize:isMobile?14:16,opacity:0.9,margin:"0 0 1.5rem",lineHeight:1.7,maxWidth:500,marginLeft:"auto",marginRight:"auto"}}>AIが背景除去・テキスト提案・スタンプ生成まで全自動。難しい操作は一切不要です。</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:"1.5rem"}}>
          {["✂️ AI背景自動除去","✨ テキストAI提案","📦 ZIP即ダウンロード","📋 LINE申請ガイド付き"].map(function(f){ return <span key={f} style={{fontSize:12,background:"rgba(255,255,255,0.2)",padding:"6px 12px",borderRadius:20,fontWeight:500}}>{f}</span>; })}
        </div>
        <button onClick={handleCheckout} disabled={checkingOut} style={{padding:"14px 36px",borderRadius:12,border:"2px solid rgba(255,255,255,0.6)",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:"pointer",fontSize:isMobile?15:17,fontWeight:700,backdropFilter:"blur(4px)"}}>
          {checkingOut?"処理中...":"🚀 7日間無料で試す → 月額980円"}
        </button>
        <div style={{fontSize:12,opacity:0.7,marginTop:8}}>7日間無料 • その後 月額980円 • いつでも解約可能</div>
      </div>

      {/* Features */}
      <div style={Object.assign({},S.card,{marginBottom:"1rem"})}>
        <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
          <div style={{fontSize:isMobile?18:22,fontWeight:700,color:"var(--color-text-primary)",marginBottom:6}}>選ばれる3つの理由</div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>競合サービスと比べてみてください</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:12}}>
          {[{icon:"⚡",title:"最短3分で完成",desc:"写真を選ぶだけ。AIが背景除去からスタンプ生成まで全自動で行います。",color:"#FFF3CD"},{icon:"💰",title:"業界最安値 月額980円",desc:"競合他社は1セット3,000円〜。月額980円なら何セットでも作り放題。",color:"#D4EDDA"},{icon:"📱",title:"PC・スマホ両対応",desc:"ブラウザだけで完結。アプリのインストール不要。スマホからでも簡単。",color:"#D1ECF1"}].map(function(f){
            return <div key={f.title} style={{padding:"1.25rem",borderRadius:12,background:f.color,border:"0.5px solid rgba(0,0,0,0.06)"}}><div style={{fontSize:32,marginBottom:10}}>{f.icon}</div><div style={{fontSize:15,fontWeight:700,color:"var(--color-text-primary)",marginBottom:6}}>{f.title}</div><div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>{f.desc}</div></div>;
          })}
        </div>
      </div>

      {/* How it works */}
      <div style={Object.assign({},S.card,{marginBottom:"1rem"})}>
        <div style={{textAlign:"center",marginBottom:"1.25rem"}}><div style={{fontSize:isMobile?18:22,fontWeight:700,color:"var(--color-text-primary)",marginBottom:6}}>使い方はたった3ステップ</div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:12}}>
          {[{step:"01",icon:"📸",title:"写真をアップロード",desc:"ペット・子供・自分の写真を選択。白背景で撮影するとより綺麗に仕上がります。"},{step:"02",icon:"🤖",title:"AIが自動生成",desc:"背景除去・テキスト提案・スタンプ生成を全自動で処理。待ち時間は約30秒。"},{step:"03",icon:"📦",title:"ZIPでダウンロード",desc:"完成したスタンプをZIPで一括ダウンロード。メイン画像も自動生成されます。"}].map(function(f){
            return <div key={f.step} style={{padding:"1.25rem",borderRadius:12,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",textAlign:"center"}}><div style={{fontSize:11,fontWeight:700,color:"#06C755",letterSpacing:"0.1em",marginBottom:8}}>STEP {f.step}</div><div style={{fontSize:36,marginBottom:10}}>{f.icon}</div><div style={{fontSize:15,fontWeight:700,color:"var(--color-text-primary)",marginBottom:6}}>{f.title}</div><div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>{f.desc}</div></div>;
          })}
        </div>
      </div>

      {/* Pricing */}
      <div style={Object.assign({},S.card,{marginBottom:"1.5rem",textAlign:"center"})}>
        <div style={{fontSize:isMobile?18:22,fontWeight:700,color:"var(--color-text-primary)",marginBottom:6}}>シンプルな料金プラン</div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1.5rem"}}>面倒な従量課金なし。月額固定で使い放題。</div>
        <div style={{maxWidth:360,margin:"0 auto",background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",border:"2px solid #06C755",borderRadius:16,padding:"2rem"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#06C755",letterSpacing:"0.1em",marginBottom:8}}>スタンダードプラン</div>
          <div style={{fontSize:48,fontWeight:800,color:"var(--color-text-primary)",lineHeight:1}}>¥980</div>
          <div style={{fontSize:14,color:"var(--color-text-secondary)",marginBottom:"1.5rem"}}>/月（税込）</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:"1.5rem",textAlign:"left"}}>
            {["✅ スタンプ生成 無制限","✅ AI背景自動除去","✅ AIテキスト提案","✅ ZIP一括ダウンロード","✅ メイン・トークルーム画像自動生成","✅ LINE申請ガイド付き","✅ いつでも解約可能"].map(function(f){ return <div key={f} style={{fontSize:14,color:"var(--color-text-primary)"}}>{f}</div>; })}
          </div>
          <button onClick={handleCheckout} disabled={checkingOut} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#06C755,#00A040)",color:"#fff",cursor:"pointer",fontSize:16,fontWeight:700,boxShadow:"0 4px 12px rgba(6,199,85,0.35)"}}>
            {checkingOut?"処理中...":"7日間無料で試す →"}
          </button>
          <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:8}}>7日間無料 • その後 月額980円 • いつでも解約可能</div>
        </div>
      </div>

      <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
        <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)",marginBottom:4}}>⬇️ サブスク後すぐに使えます</div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>以下からスタンプ作成を開始してください</div>
      </div>

      {isPaid&&<div style={{background:"#E8F9EF",border:"1.5px solid #06C755",borderRadius:12,padding:"0.75rem 1.25rem",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>✅</span><div style={{fontSize:14,fontWeight:600,color:"#00A040"}}>サブスクリプション有効 — フル機能をご利用いただけます</div></div>}
      {isDemo&&<div style={{background:"#FFF8E1",border:"1.5px solid #FFB300",borderRadius:12,padding:"0.75rem 1.25rem",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:20}}>🎯</span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#E65100"}}>デモモードで体験中</div><div style={{fontSize:12,color:"#795548",marginTop:2}}>スタンプの生成・編集まで無料で体験できます。ZIPダウンロードは月額980円のサブスクリプション登録後にご利用いただけます。</div></div></div>}

      {/* Progress */}
      <div style={{display:"flex",gap:4,marginBottom:"1.25rem",alignItems:"center",background:"var(--color-background-primary)",borderRadius:12,padding:"12px 16px",border:"0.5px solid var(--color-border-tertiary)"}}>
        {["📸 アップロード","⚙️ カスタマイズ","🎨 プレビュー・加工"].map(function(s,i){
          const active=[step==="upload",step==="config",step==="preview"][i];
          const done=(i===0&&step!=="upload")||(i===1&&step==="preview");
          return (
            <div key={s} style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
              <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,background:active?"#06C755":done?"#E8F9EF":"var(--color-background-secondary)",color:active?"#fff":done?"#06C755":"var(--color-text-tertiary)",border:done&&!active?"1.5px solid #06C755":"none"}}>{done?"✓":i+1}</div>
              <span style={{fontSize:isMobile?11:12,color:active?"#06C755":done?"#06C755":"var(--color-text-tertiary)",fontWeight:active?600:done?500:400,display:isMobile&&i>0?"none":"block"}}>{s}</span>
              {i<2&&<span style={{color:"var(--color-border-secondary)",fontSize:14,marginLeft:"auto"}}>›</span>}
            </div>
          );
        })}
      </div>

      {/* Upload */}
      <div style={Object.assign({},S.card,{border:"0.5px solid var(--color-border-tertiary)"})}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#E8F9EF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📸</div>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)"}}>サンプル画像をアップロード</div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>最大5枚 • アップロード後に背景を自動除去します</div>
          </div>
        </div>
        {images.length>0?(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {images.map(function(img,i){
              return (
                <div key={i} style={{position:"relative",width:80,height:80}}>
                  <img src={img.url} style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",display:"block"}} />
                  <button onClick={function(){setImages(function(p){return p.filter(function(_,j){return j!==i;});});if(images.length<=1)setStep("upload");}} style={{position:"absolute",top:-7,right:-7,width:20,height:20,borderRadius:"50%",background:"var(--color-background-danger)",color:"var(--color-text-danger)",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,lineHeight:"20px",textAlign:"center",padding:0}}>×</button>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,background:img.bgRemoved?"rgba(6,199,85,0.85)":"rgba(0,0,0,0.45)",borderRadius:"0 0 8px 8px",fontSize:9,color:"#fff",textAlign:"center",padding:"2px 0"}}>{img.bgRemoved?"✓ 背景除去済":"画像"+(i+1)}</div>
                </div>
              );
            })}
            {images.length<5&&<div onClick={function(){fileRef.current.click();}} style={{width:80,height:80,border:"1.5px dashed #06C755",borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#06C755"}}><span style={{fontSize:22}}>+</span><span style={{fontSize:10,marginTop:2}}>追加</span></div>}
          </div>
        ):removingBg?(
          <div style={{border:"1.5px solid #06C755",borderRadius:12,padding:"2rem",textAlign:"center",marginBottom:10,background:"#E8F9EF"}}>
            <div style={{fontSize:24,marginBottom:8}}>✂️</div>
            <div style={{fontSize:14,fontWeight:600,color:"#06C755",marginBottom:12}}>背景を自動除去しています... {removeBgProgress}%</div>
            <div style={{height:8,background:"#C8F0D8",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:removeBgProgress+"%",background:"#06C755",borderRadius:4,transition:"width 0.3s"}} /></div>
          </div>
        ):(
          <div style={{marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:12}}>
              {[{icon:"⬜",title:"白い背景で撮影",desc:"白壁・白紙を背景にすると精度大幅UP"},{icon:"☀️",title:"明るい場所で撮影",desc:"影が少ない昼間の自然光が最適"},{icon:"🎯",title:"被写体を中央に大きく",desc:"画面の60〜70%を占めるくらいが理想"},{icon:"📷",title:"複数の表情・ポーズで",desc:"笑顔・驚き・困り顔など5枚で豊かなセットに"}].map(function(g){
                return <div key={g.title} style={{display:"flex",gap:10,padding:"10px 12px",background:"var(--color-background-secondary)",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)"}}><span style={{fontSize:20,flexShrink:0}}>{g.icon}</span><div><div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",marginBottom:2}}>{g.title}</div><div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.4}}>{g.desc}</div></div></div>;
              })}
            </div>
            <div onClick={function(){fileRef.current.click();}} style={{border:"2px dashed #06C755",borderRadius:16,padding:isMobile?"1.5rem":"2.5rem",textAlign:"center",cursor:"pointer",background:"#F0FDF4"}}>
              <div style={{fontSize:40,marginBottom:10}}>🖼️</div>
              <div style={{fontSize:isMobile?15:17,fontWeight:600,color:"#06C755",marginBottom:4}}>クリックして画像を選択</div>
              <div style={{fontSize:13,color:"#4CAF50"}}>最大5枚 • PNG / JPG / WEBP対応</div>
              <div style={{fontSize:12,color:"#4CAF50",marginTop:6}}>✨ アップロード後、AIが自動で背景を除去します</div>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles} />
        {images.length>0&&<div style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{images.length}枚登録済み</div>}
      </div>

      {/* Config */}
      {step!=="upload"&&(
        <div style={S.card}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,paddingBottom:14,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <div style={{width:32,height:32,borderRadius:8,background:"#E8F9EF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚙️</div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)"}}>スタンプをカスタマイズ</div>
              <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>フォント・カラー・フキダシを設定してAIでテキストを提案</div>
            </div>
          </div>

          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:"1rem"}}>
            <div style={{flex:1,minWidth:isMobile?"100%":150}}>
              <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:6}}>枚数</div>
              <select value={count} onChange={function(e){setCount(Number(e.target.value));}} style={{width:"100%",fontSize:isMobile?15:13,padding:isMobile?"10px 8px":"4px 8px"}}>
                {[8,16,24,32,40].map(function(n){return <option key={n} value={n}>{n}枚セット</option>;})}
              </select>
            </div>
            <div style={{flex:1,minWidth:isMobile?"100%":150}}>
              <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:6}}>フォント</div>
              <select value={selectedFont} onChange={function(e){setSelectedFont(Number(e.target.value));}} style={{width:"100%",fontSize:isMobile?15:13,padding:isMobile?"10px 8px":"4px 8px"}}>
                {FONT_OPTIONS.map(function(f,i){return <option key={i} value={i}>{f.label}</option>;})}
              </select>
            </div>
            <div style={{flex:1,minWidth:isMobile?"100%":150}}>
              <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:6}}>背景</div>
              <select value={bgStyle} onChange={function(e){setBgStyle(e.target.value);}} style={{width:"100%",fontSize:isMobile?15:13,padding:isMobile?"10px 8px":"4px 8px"}}>
                <option value="color">カラー</option>
                <option value="gradient">グラデーション</option>
                <option value="transparent">透過</option>
              </select>
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:8}}>テーマカラー</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {COLOR_SETS.map(function(c,i){return <button key={i} style={S.colorDot(i)} onClick={function(){setSelectedColor(i);}} title={c.name} />;} )}
              <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{COLOR_SETS[selectedColor].name}</span>
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:8}}>フキダシスタイル</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {BUBBLE_TYPES.map(function(bt){return <button key={bt.value} style={S.btnOutline(bubbleType===bt.value)} onClick={function(){setBubbleType(bt.value);}}>{bt.label}</button>;})}
            </div>
          </div>

          {/* ④ フキダシ縦位置 */}
          {bubbleType!=="none"&&(
            <div style={{marginBottom:"1rem",padding:"12px 14px",background:"var(--color-background-secondary)",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)"}}>
              <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:8}}>フキダシの縦位置</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={function(){setBubbleOffsetY(function(v){return Math.max(v-10,-80);});}} style={Object.assign({},S.btn,{padding:"4px 12px",fontSize:18})}>↑</button>
                <div style={{flex:1,textAlign:"center"}}>
                  <input type="range" min={-80} max={40} value={bubbleOffsetY} onChange={function(e){setBubbleOffsetY(Number(e.target.value));}} style={{width:"100%"}} />
                  <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>{bubbleOffsetY===0?"標準位置":bubbleOffsetY<0?"上方向 "+Math.abs(bubbleOffsetY)+"px":"下方向 "+bubbleOffsetY+"px"}</div>
                </div>
                <button onClick={function(){setBubbleOffsetY(function(v){return Math.min(v+10,40);});}} style={Object.assign({},S.btn,{padding:"4px 12px",fontSize:18})}>↓</button>
                <button onClick={function(){setBubbleOffsetY(0);}} style={Object.assign({},S.btn,{padding:"4px 10px",fontSize:11})}>リセット</button>
              </div>
            </div>
          )}

          {/* 名前・店名ラベル */}
          <div style={{marginBottom:"1rem",padding:"12px 14px",background:"var(--color-background-secondary)",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:nameLabelEnabled?8:0,gap:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)"}}>名前・お店の名前を入れる</div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>ペットの名前、ニックネーム、店名・キャラクター名などを全スタンプ共通で表示できます</div>
              </div>
              <button onClick={function(){setNameLabelEnabled(function(v){return !v;});}} style={{padding:"6px 14px",borderRadius:20,border:"none",background:nameLabelEnabled?"#06C755":"rgba(6,199,85,0.12)",color:nameLabelEnabled?"#fff":"#06C755",cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0}}>
                {nameLabelEnabled?"ON ✓":"OFF"}
              </button>
            </div>
            {nameLabelEnabled&&(
              <div>
                <input type="text" value={nameLabel} onChange={function(e){setNameLabel(e.target.value);}} placeholder="例: ポチ / ももちゃん / 〇〇サロン" maxLength={16} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",fontSize:14,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}} />
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:4}}>「— {nameLabel||"名前"} —」の形式で吹き出しの下に表示されます（長い場合は自動で縮小）</div>
              </div>
            )}
          </div>

          <div style={{marginBottom:"1rem"}}>
            <button style={{padding:isMobile?"12px 20px":"10px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#06C755,#00A040)",color:"#fff",cursor:"pointer",fontSize:isMobile?15:14,fontWeight:600,boxShadow:"0 2px 8px rgba(6,199,85,0.3)"}} onClick={analyzeImages} disabled={analyzing}>
              {analyzing?"🤖 AI分析中...":"✨ "+images.length+"枚をAI分析してテキスト提案"}
            </button>
          </div>

          {analysis&&(
            <div style={{padding:"0.75rem",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:"1rem"}}>
              <div style={{marginBottom:6,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:"var(--color-background-info)",color:"var(--color-text-info)"}}>AI分析結果</span>
                <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{analysis.subject} — {analysis.mood}</span>
              </div>
              {analysis.imageNotes&&analysis.imageNotes.filter(Boolean).length>0&&(
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                  {analysis.imageNotes.map(function(note,i){return <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",color:"var(--color-text-secondary)"}}>画像{i+1}: {note}</span>;})}
                </div>
              )}
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {customTexts.map(function(t,i){
                  return <span key={i} style={S.tag} onClick={function(){const n=prompt("テキストを編集:",t);if(n!==null)setCustomTexts(function(p){const a=[...p];a[i]=n;return a;});}}>{t} ✎</span>;
                })}
              </div>
            </div>
          )}
          {!analysis&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:"1rem"}}>{STAMP_TEXTS.slice(0,count).map(function(t,i){return <span key={i} style={Object.assign({},S.tag,{cursor:"default"})}>{t}</span>;})}</div>}

          <button style={{padding:isMobile?"14px 24px":"12px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#06C755,#00A040)",color:"#fff",cursor:"pointer",fontSize:isMobile?16:15,fontWeight:700,boxShadow:"0 2px 12px rgba(6,199,85,0.35)",width:isMobile?"100%":"auto"}} onClick={generateStamps}>
            🎨 スタンプを{count}枚生成する →
          </button>
        </div>
      )}

      {/* Preview */}
      {step==="preview"&&stamps.length>0&&(
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,borderRadius:8,background:"#E8F9EF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎨</div>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)"}}>プレビュー・手描き加工</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{stamps.length}枚生成 • 編集済み: {editedCount}枚</div>
              </div>
            </div>
            {isDemo ? (
              editedCount>=1 ? (
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:13,color:"#795548",marginBottom:8}}>デモモードではZIPダウンロードは利用できません</div>
                  <button onClick={handleCheckout} disabled={checkingOut} style={{padding:isMobile?"12px 20px":"10px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#FF9800,#F57C00)",color:"#fff",cursor:"pointer",fontSize:isMobile?15:14,fontWeight:600,width:isMobile?"100%":"auto"}}>
                    {checkingOut?"処理中...":"🚀 月額980円で登録 → ZIPダウンロード"}
                  </button>
                </div>
              ) : (
                <button style={{padding:isMobile?"12px 20px":"10px 22px",borderRadius:10,border:"none",background:"var(--color-border-tertiary)",color:"#fff",cursor:"not-allowed",fontSize:isMobile?15:14,fontWeight:600,width:isMobile?"100%":"auto"}}>
                  {"✏️ まず1枚手描き加工してください"}
                </button>
              )
            ) : (
              <button
                style={{padding:isMobile?"12px 20px":"10px 22px",borderRadius:10,border:"none",background:editedCount>=1?"linear-gradient(135deg,#06C755,#00A040)":"var(--color-border-tertiary)",color:"#fff",cursor:editedCount>=1?"pointer":"not-allowed",fontSize:isMobile?15:14,fontWeight:600,width:isMobile?"100%":"auto"}}
                onClick={function(){editedCount>=1&&setShowChecklist(true);}}
              >
                {editedCount>=1?"📦 申請前チェック → ZIP ↓":"✏️ まず1枚手描き加工してください"}
              </button>
            )}
          </div>

          <div style={{padding:"12px 14px",background:editedCount>=1?"var(--color-background-success)":"var(--color-background-danger)",border:"0.5px solid "+(editedCount>=1?"var(--color-border-success)":"var(--color-border-danger)"),borderRadius:8,marginBottom:"1rem",lineHeight:1.65}}>
            <div style={{fontSize:13,fontWeight:500,color:editedCount>=1?"var(--color-text-success)":"var(--color-text-danger)",marginBottom:3}}>
              {editedCount>=1?"✓ "+editedCount+"枚手描き加工済み（残り"+(stamps.length-editedCount)+"枚）":"⚠ まず1枚手描き加工してください"}
            </div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>
              LINEはAIのみで生成されたスタンプを審査対象外とする場合があります。各スタンプの「✏️ 手描き」から図形を1つ置くだけでOKです。<span style={{fontWeight:500}}>1枚以上加工するとZIPダウンロードできます。</span>
            </div>
          </div>

          {/* ① サイズ警告 */}
          {stamps.some(function(s){return getStampSizeKB(s.dataUrl)>900;})&&(
            <div style={{padding:"10px 14px",background:"var(--color-background-warning)",border:"0.5px solid var(--color-border-warning)",borderRadius:8,marginBottom:"1rem",fontSize:13,color:"var(--color-text-warning)"}}>
              ⚠️ 一部のスタンプが900KB超です。LINEの審査基準（1MB以内）に注意してください。背景を「透過」に変更すると軽くなります。
            </div>
          )}

          {/* スタンプグリッド */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
            {stamps.map(function(s,i){
              const sizeKB = getStampSizeKB(s.dataUrl);
              return (
                <div key={i} style={{borderRadius:8,overflow:"hidden",border:s.edited?"2px solid var(--color-border-success)":"0.5px solid var(--color-border-tertiary)"}}>
                  <div style={{position:"relative",background:"repeating-conic-gradient(#ccc 0% 25%,#fff 0% 50%) 0 0/12px 12px",minHeight:80}}>
                    <img src={s.dataUrl} style={{width:"100%",display:"block"}} />
                    {/* ① サイズバッジ */}
                    <div style={{position:"absolute",top:4,right:4,padding:"2px 5px",borderRadius:4,fontSize:9,fontWeight:600,background:sizeKB<=900?"rgba(6,199,85,0.85)":"rgba(220,53,69,0.9)",color:"#fff"}}>
                      {sizeKB}KB{sizeKB>900&&" ⚠"}
                    </div>
                    {/* ⑥ 並べ替え */}
                    <div style={{position:"absolute",top:4,left:4,display:"flex",flexDirection:"column",gap:2}}>
                      <button onClick={function(){moveStamp(i,-1);}} disabled={i===0} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(0,0,0,0.5)",color:"#fff",cursor:i===0?"not-allowed":"pointer",fontSize:10,lineHeight:"20px",textAlign:"center",padding:0,opacity:i===0?0.3:1}}>↑</button>
                      <button onClick={function(){moveStamp(i,1);}} disabled={i===stamps.length-1} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(0,0,0,0.5)",color:"#fff",cursor:i===stamps.length-1?"not-allowed":"pointer",fontSize:10,lineHeight:"20px",textAlign:"center",padding:0,opacity:i===stamps.length-1?0.3:1}}>↓</button>
                    </div>
                  </div>
                  <div style={{padding:"6px 8px",borderTop:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>
                    <div style={{fontSize:11,color:"var(--color-text-secondary)",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span>{s.text}</span>
                      {s.edited&&<span style={{fontSize:10,color:"var(--color-text-success)"}}>✓</span>}
                    </div>
                    {/* ⑤ 個別テキストカラー */}
                    <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                      <span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>文字色</span>
                      <input type="color" value={s.textColor||COLOR_SETS[selectedColor].bubbleText} onChange={function(e){handleStampTextColor(i,e.target.value);}} style={{width:20,height:20,padding:0,border:"none",borderRadius:3,cursor:"pointer"}} />
                      {s.textColor&&<button onClick={function(){handleStampTextColor(i,null);}} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"0.5px solid var(--color-border-tertiary)",background:"transparent",cursor:"pointer",color:"var(--color-text-tertiary)"}}>リセット</button>}
                    </div>
                    <button onClick={function(){setEditingStamp(i);}} style={{width:"100%",padding:isMobile?"8px 0":"5px 0",borderRadius:6,border:s.edited?"0.5px solid var(--color-border-success)":"1.5px solid var(--color-border-danger)",background:s.edited?"transparent":"var(--color-background-danger)",cursor:"pointer",fontSize:isMobile?13:11,color:s.edited?"var(--color-text-success)":"var(--color-text-danger)",fontWeight:s.edited?400:500}}>
                      {s.edited?"✓ 編集済み":"✏️ 手描き必須"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* スタンプタイトル */}
          <div style={{marginTop:"1rem"}}>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:6}}>スタンプ名（申請用・任意）</div>
            <input type="text" value={stampTitle} onChange={function(e){setStampTitle(e.target.value);}} placeholder="例：うちの猫スタンプ vol.1" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid var(--color-border-secondary)",fontSize:13,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"}} />
          </div>

          {/* ③ AI申請用説明文 */}
          <div style={{marginTop:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={generateAiDesc} disabled={generatingDesc||!analysis} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6C5CE7,#3D2FA8)",color:"#fff",cursor:generatingDesc||!analysis?"not-allowed":"pointer",fontSize:13,fontWeight:600,opacity:!analysis?0.5:1}}>
              {generatingDesc?"🤖 生成中...":"🤖 AI申請用タイトル・説明文を生成"}
            </button>
            {!analysis&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>先にAI分析を実行してください</span>}
          </div>

          {aiDesc&&(
            <div style={{marginTop:12,padding:"1rem",background:"var(--color-background-secondary)",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)"}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--color-text-secondary)",marginBottom:8}}>📝 AI生成：申請用テキスト</div>
              {[{label:"タイトル（日本語）",val:aiDesc.titleJa},{label:"Title (English)",val:aiDesc.titleEn},{label:"説明文（日本語）",val:aiDesc.descJa},{label:"Description (English)",val:aiDesc.descEn}].map(function(item){
                return (
                  <div key={item.label} style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:2}}>{item.label}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <div style={{flex:1,fontSize:13,color:"var(--color-text-primary)",padding:"6px 10px",background:"var(--color-background-primary)",borderRadius:6,border:"0.5px solid var(--color-border-tertiary)"}}>{item.val}</div>
                      <button onClick={function(){navigator.clipboard.writeText(item.val);}} style={{padding:"4px 10px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer",fontSize:11,color:"var(--color-text-secondary)"}}>コピー</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={S.btn} onClick={function(){setStep("config");setStamps([]);try{localStorage.removeItem("lsg_stamps");}catch(e){}}}>← 設定を変更</button>
            <button style={Object.assign({},S.btn,{color:"var(--color-text-info)",borderColor:"var(--color-border-info)"})} onClick={function(){setLineGuide(function(v){return !v;});}}>
              {lineGuide?"申請ガイドを閉じる":"📋 LINE申請ガイド"}
            </button>
            <button style={Object.assign({},S.btn,{color:"var(--color-text-success)",borderColor:"var(--color-border-success)"})} onClick={function(){setAnnouncement(function(v){return !v;});}}>
              {announcement?"アナウンス文を閉じる":"📢 購入者向けアナウンス文"}
            </button>
          </div>

          {lineGuide&&(
            <div style={{marginTop:"1.25rem",borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:"1.25rem"}}>
              <div style={{fontSize:15,fontWeight:500,marginBottom:"1rem",color:"var(--color-text-primary)"}}>LINE Creators Market 申請フロー</div>
              <div style={{display:"flex",flexDirection:"column"}}>
                {LINE_STEPS.map(function(s,i){
                  return (
                    <div key={i} style={{display:"flex",gap:14,paddingBottom:i<LINE_STEPS.length-1?"1.1rem":0,position:"relative"}}>
                      {i<LINE_STEPS.length-1&&<div style={{position:"absolute",left:11,top:28,bottom:0,width:1,background:"var(--color-border-tertiary)"}} />}
                      <div style={{width:24,height:24,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0,zIndex:1}}>{s.num}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:3}}>{s.title}</div>
                        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:5,lineHeight:1.65}}>{s.desc}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                          <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"var(--color-background-secondary)",color:"var(--color-text-tertiary)"}}>{s.note}</span>
                          {s.link&&<a href={s.link} style={{fontSize:12,color:"var(--color-text-info)"}} target="_blank" rel="noreferrer">{s.link} ↗</a>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:"1rem",padding:"0.75rem",background:"var(--color-background-secondary)",borderRadius:8,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}>
                <span style={{fontWeight:500,color:"var(--color-text-primary)"}}>補足: </span>
                メイン画像（240×240px）とトーク画像（96×74px）はZIPに自動同梱されます。審査は無料、販売時はLINEが30%の手数料を取得します。
              </div>
            </div>
          )}
          {announcement&&<AnnouncementPanel stampTitle={stampTitle} />}
        </div>
      )}

      {/* Footer */}
      <div style={{marginTop:"2rem",paddingTop:"1.5rem",borderTop:"0.5px solid var(--color-border-tertiary)",textAlign:"center"}}>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:8}}>© 2025 LINE スタンプ自動生成 • Powered by Claude AI & remove.bg</div>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={function(){setShowTerms("terms");}} style={{fontSize:12,color:"var(--color-text-secondary)",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>利用規約</button>
          <button onClick={function(){setShowTerms("privacy");}} style={{fontSize:12,color:"var(--color-text-secondary)",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>プライバシーポリシー</button>
          <button onClick={function(){setShowTerms("tokushoho");}} style={{fontSize:12,color:"var(--color-text-secondary)",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>特定商取引法に基づく表記</button>
          <a href="mailto:omakasesound@gmail.com" style={{fontSize:12,color:"var(--color-text-secondary)",textDecoration:"underline"}}>お問い合わせ</a>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000000",zIndex:9999,overflowY:"auto",padding:"1rem"}}>
          <div style={{background:"#ffffff",borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:600,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
              <h2 style={{fontSize:18,fontWeight:600,margin:0,color:"#000000"}}>{showTerms==="terms"?"利用規約":showTerms==="privacy"?"プライバシーポリシー":"特定商取引法に基づく表記"}</h2>
              <button onClick={function(){setShowTerms(null);}} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:"#000000",fontWeight:700}}>×</button>
            </div>
            {showTerms==="tokushoho"?(
              <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.9}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  {[["販売業者","橋本明佳"],["運営責任者","橋本明佳"],["所在地","請求があり次第、遅滞なく開示いたします"],["電話番号","請求があり次第、遅滞なく開示いたします"],["メールアドレス","omakasesound@gmail.com"],["サービス名","LINE スタンプ自動生成"],["販売価格","月額980円（税込）"],["支払方法","クレジットカード決済（Stripe）"],["支払時期","お申し込み時にご請求。以降毎月自動更新"],["サービス提供時期","決済完了後、即時ご利用いただけます"],["返品・キャンセル","サービスの性質上、決済完了後の返金はお受けできません。ただし次回更新日の前日までに解約手続きをされた場合、翌月以降の請求は発生しません"],["動作環境","最新版のChrome・Safari・Edge等のブラウザ。インターネット接続環境が必要です"]].map(function(row){
                    return (
                      <tr key={row[0]} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                        <td style={{padding:"10px 8px",fontWeight:600,color:"var(--color-text-primary)",whiteSpace:"nowrap",verticalAlign:"top",width:"35%"}}>{row[0]}</td>
                        <td style={{padding:"10px 8px",color:"var(--color-text-secondary)"}}>{row[1]}</td>
                      </tr>
                    );
                  })}
                </table>
              </div>
            ):showTerms==="terms"?(
              <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.8}}>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>第1条（適用）</p><p>本規約は「LINE スタンプ自動生成」の利用条件を定めるものです。</p>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>第2条（利用条件）</p><p>・本サービスはLINEスタンプの作成支援を目的とするものです。<br/>・アップロードする画像は、ご自身が権利を有するものに限ります。</p>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>第3条（禁止事項）</p><p>・公序良俗に反するコンテンツの作成<br/>・他者の権利を侵害する行為</p>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>第4条（免責事項）</p><p>本サービスはLINE株式会社とは無関係の独立したサービスです。生成されたスタンプのLINE審査結果については保証できません。</p>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>第5条（規約の変更）</p><p>運営者は必要に応じて本規約を変更できるものとします。</p>
                <p style={{fontSize:11,color:"var(--color-text-tertiary)"}}>制定日：2025年1月1日</p>
              </div>
            ):(
              <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.8}}>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>1. 収集する情報</p><p>アップロードされた画像・サービス利用状況のログ情報</p>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>2. 情報の利用目的</p><p>スタンプ生成サービスの提供・サービスの改善・障害対応</p>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>3. 第三者への提供</p><p>remove.bg（背景除去）・Anthropic Claude API（テキスト提案）に画像データを送信します。</p>
                <p style={{fontWeight:600,color:"var(--color-text-primary)"}}>4. 画像データの保持</p><p>アップロードされた画像は処理完了後にサーバー上には保持しません。</p>
                <p style={{fontSize:11,color:"var(--color-text-tertiary)"}}>制定日：2025年1月1日</p>
              </div>
            )}
            <button onClick={function(){setShowTerms(null);}} style={{marginTop:"1rem",width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#06C755",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
