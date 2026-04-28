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
  { label:"丸ゴシック", value:"bold {sz}px 'Hiragino Maru Gothic Pro','M PLUS Rounded 1c',sans-serif" },
  { label:"ポップ体",   value:"bold {sz}px 'DotGothic16','M PLUS Rounded 1c',cursive" },
  { label:"手書き風",   value:"bold {sz}px 'Klee One','Kaisei Decol',serif" },
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
  { label:"なし",      value:"none"  },
  { label:"丸型",      value:"round" },
  { label:"角丸",      value:"rect"  },
  { label:"雲型",      value:"cloud" },
  { label:"しっぽ付き",value:"tail"  },
];

const LINE_STEPS = [
  { num:1, title:"アカウント作成",     desc:"LINE Creators Marketにアクセスし、LINEアカウントでログイン。初回は「クリエイター情報」を登録します。", link:"https://creator.line.me", note:"個人・法人どちらでも可" },
  { num:2, title:"新規スタンプ登録",   desc:"「マイページ」→「スタンプ」→「新規登録」。タイトル・説明文（日本語・英語）・販売価格を設定します。", note:"タイトルは30文字以内" },
  { num:3, title:"画像アップロード",   desc:"このアプリで生成したZIPを解凍し、stamp_01.png〜を1枚ずつアップロード。メイン画像とトーク画像も別途必要です。", note:"370×320px PNG 最大1MB/枚" },
  { num:4, title:"審査申請",           desc:"全画像の登録後「申請」ボタンを押す。審査は通常1〜7営業日。リジェクト時は修正して再申請できます。", note:"著作権・品質・規約遵守が基準" },
  { num:5, title:"リリース・販売",     desc:"承認後、自分でリリース操作を行います。無料配布または50〜250コインで販売価格を設定可能です。", note:"収益は翌月末にポイント還元" },
];

// チェックリスト項目
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
function drawBubble(ctx, text, bubbleType, colorSet, fontTpl) {
  if (bubbleType === "none" || !text) return;
  const fontSize = text.length <= 4 ? 40 : text.length <= 6 ? 34 : 28;
  const font = fontTpl.replace("{sz}", fontSize);
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  const padX = 28, padY = 16;
  const bw = tw + padX * 2, bh = fontSize + padY * 2;
  const bx = (STAMP_W - bw) / 2, by = STAMP_H - bh - 18;

  ctx.save();
  ctx.fillStyle = colorSet.bubble; ctx.strokeStyle = colorSet.outline; ctx.lineWidth = 3;

  if (bubbleType === "round") {
    ctx.beginPath(); ctx.ellipse(STAMP_W/2, by+bh/2, bw/2+10, bh/2+6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  } else if (bubbleType === "rect") {
    ctx.beginPath(); ctx.roundRect(bx-4, by-4, bw+8, bh+8, 14); ctx.fill(); ctx.stroke();
  } else if (bubbleType === "cloud") {
    const cx=STAMP_W/2, cy=by+bh/2, rx=bw/2+12, ry=bh/2+6;
    ctx.beginPath();
    for (let i=0;i<12;i++) {
      const a=(i/12)*Math.PI*2, r=i%2===0?1.0:0.82;
      const px=cx+rx*r*Math.cos(a), py=cy+ry*r*Math.sin(a);
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (bubbleType === "tail") {
    ctx.beginPath(); ctx.roundRect(bx-4, by-4, bw+8, bh+8, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(STAMP_W/2-10, by+bh+4); ctx.lineTo(STAMP_W/2, by+bh+22); ctx.lineTo(STAMP_W/2+10, by+bh+4);
    ctx.fillStyle=colorSet.bubble; ctx.fill();
    ctx.beginPath(); ctx.moveTo(STAMP_W/2-10, by+bh+4); ctx.lineTo(STAMP_W/2, by+bh+22); ctx.lineTo(STAMP_W/2+10, by+bh+4);
    ctx.strokeStyle=colorSet.outline; ctx.lineWidth=3; ctx.stroke();
  }
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.font=font;
  ctx.fillStyle=colorSet.bubbleText; ctx.lineWidth=0;
  ctx.fillText(text, STAMP_W/2, by+bh/2);
  ctx.restore();
}

function drawStamp(canvas, imageEl, text, colorSet, fontTpl, bgStyle, bubbleType) {
  const ctx = canvas.getContext("2d");
  canvas.width = STAMP_W; canvas.height = STAMP_H;
  ctx.clearRect(0,0,STAMP_W,STAMP_H);
  if (bgStyle==="color") {
    ctx.fillStyle=colorSet.bg; ctx.beginPath(); ctx.roundRect(0,0,STAMP_W,STAMP_H,40); ctx.fill();
  } else if (bgStyle==="gradient") {
    const g=ctx.createLinearGradient(0,0,STAMP_W,STAMP_H);
    g.addColorStop(0,colorSet.bg); g.addColorStop(1,colorSet.outline+"55");
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
  if (bubbleType!=="none"&&text) drawBubble(ctx,text,bubbleType,colorSet,fontTpl);
  else if (text) {
    const sz=text.length<=4?48:text.length<=6?40:32;
    ctx.font=fontTpl.replace("{sz}",sz); ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.lineWidth=7; ctx.strokeStyle=colorSet.outline; ctx.strokeText(text,STAMP_W/2,STAMP_H-44);
    ctx.fillStyle=colorSet.text; ctx.fillText(text,STAMP_W/2,STAMP_H-44);
  }
}

// ---- DrawingEditor component ----
const SHAPE_STAMPS = [
  { label:"♥", key:"heart"  }, { label:"★", key:"star"   }, { label:"●", key:"circle" },
  { label:"✦", key:"spark"  }, { label:"◆", key:"diamond"}, { label:"✓", key:"check"  },
  { label:"!", key:"excl"   }, { label:"〇", key:"ring"   }, { label:"〜", key:"wave"  },
];

function drawShape(ctx, key, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.18;
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const map = { heart:"❤", star:"⭐", circle:"●", spark:"✦", diamond:"◆", check:"✓", excl:"！", ring:"〇", wave:"〜" };
  ctx.fillText(map[key] || "●", x, y);
  ctx.restore();
}

function DrawingEditor({ stamp, onSave, onClose }) {
  const canvasRef = useRef();
  const overlayRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("shape"); // "pen" | "eraser" | "shape"
  const [color, setColor] = useState("#FF3366");
  const [size, setSize] = useState(48);
  const [selectedShape, setSelectedShape] = useState("heart");
  const [history, setHistory] = useState([]);
  const points = useRef([]);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = STAMP_W; canvas.height = STAMP_H;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      setHistory([canvas.toDataURL()]);
    };
    img.src = stamp.dataUrl;
    const ov = overlayRef.current;
    if (ov) { ov.width = STAMP_W; ov.height = STAMP_H; }
  }, [stamp.dataUrl]);

  const getPos = (e) => {
    const canvas = overlayRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = STAMP_W / rect.width, scaleY = STAMP_H / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const saveHistory = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL();
    setHistory(prev => [...prev.slice(-19), url]);
  };

  const undo = () => {
    if (history.length < 2 || !canvasRef.current) return;
    const prev = history[history.length - 2];
    setHistory(h => h.slice(0, -1));
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image(); img.onload = () => { ctx.clearRect(0,0,STAMP_W,STAMP_H); ctx.drawImage(img,0,0); }; img.src = prev;
  };

  // Catmull-Rom smoothing
  const smoothPoints = (pts) => {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      out.push({ x: (pts[i-1].x + pts[i].x * 2 + pts[i+1].x) / 4, y: (pts[i-1].y + pts[i].y * 2 + pts[i+1].y) / 4 });
    }
    out.push(pts[pts.length - 1]);
    return out;
  };

  const startDraw = (e) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const pos = getPos(e);
    if (tool === "shape") {
      saveHistory();
      drawShape(canvasRef.current.getContext("2d"), selectedShape, pos.x, pos.y, size, color);
      return;
    }
    setDrawing(true);
    points.current = [pos];
    lastPos.current = pos;
  };

  const doDraw = (e) => {
    if (!drawing || tool === "shape" || !canvasRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!points.current) return;
    points.current.push(pos);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color; ctx.lineWidth = size * 0.25;
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 0.5;
    }
    // Draw smoothed segment
    const pts = smoothPoints(points.current.slice(-6));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const mid = { x: (pts[i-1].x + pts[i].x) / 2, y: (pts[i-1].y + pts[i].y) / 2 };
      ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, mid.x, mid.y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    points.current = [];
    saveHistory();
  };

  const COLORS = ["#FF3366","#FF9500","#FFCC00","#34C759","#007AFF","#5856D6","#FF2D55","#000000","#FFFFFF"];

  const S = {
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"1rem" },
    modal: { background:"var(--color-background-primary)", borderRadius:16, padding:"1.25rem", width:"100%", maxWidth:540, maxHeight:"92vh", overflowY:"auto" },
    canvasWrap: { position:"relative", width:"100%", maxWidth:STAMP_W, margin:"0 auto", background:"repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 0 0 / 16px 16px", borderRadius:8, overflow:"hidden", cursor: tool==="shape" ? "crosshair" : "cell" },
    btnTool: (active) => ({ padding:"6px 14px", borderRadius:8, border:active?"2px solid var(--color-text-primary)":"0.5px solid var(--color-border-secondary)", background:active?"var(--color-background-secondary)":"transparent", cursor:"pointer", fontSize:13, fontWeight:active?500:400 }),
    btnPrimary: { padding:"8px 20px", borderRadius:8, border:"none", background:"var(--color-text-primary)", color:"var(--color-background-primary)", cursor:"pointer", fontSize:13, fontWeight:500 },
    btn: { padding:"8px 14px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--color-text-primary)" },
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)" }}>手描き編集 — {stamp.text}</div>
            <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginTop:2 }}>図形スタンプをクリックで置くだけ。マウスでもキレイに仕上がります。</div>
          </div>
          <button style={{ ...S.btn, padding:"4px 10px", fontSize:12 }} onClick={undo} disabled={history.length < 2}>↩ 元に戻す</button>
        </div>

        {/* Tool selector */}
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
          <button style={S.btnTool(tool==="shape")}  onClick={() => setTool("shape")}>図形スタンプ（クリックで配置）</button>
          <button style={S.btnTool(tool==="pen")}    onClick={() => { setTool("pen"); setSize(10); }}>フリーハンドペン</button>
          <button style={S.btnTool(tool==="eraser")} onClick={() => { setTool("eraser"); setSize(20); }}>消しゴム</button>
        </div>

        {/* Shape grid */}
        {tool === "shape" && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:6 }}>図形を選択してキャンバスをクリック → 好きな場所に配置</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
              {SHAPE_STAMPS.map(sh => (
                <button key={sh.key} onClick={() => setSelectedShape(sh.key)} style={{ width:40, height:40, fontSize:22, borderRadius:8, border:selectedShape===sh.key?"2.5px solid var(--color-text-primary)":"0.5px solid var(--color-border-secondary)", background:selectedShape===sh.key?"var(--color-background-secondary)":"transparent", cursor:"pointer" }}>
                  {sh.label}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>サイズ</span>
              <input type="range" min={20} max={100} value={size} step={4} onChange={e=>setSize(Number(e.target.value))} style={{ width:100 }} />
              <span style={{ fontSize:12 }}>{size}px</span>
            </div>
          </div>
        )}

        {/* Pen size */}
        {tool === "pen" && (
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>太さ</span>
            <input type="range" min={2} max={30} value={size} onChange={e=>setSize(Number(e.target.value))} style={{ width:100 }} />
            <span style={{ fontSize:12 }}>{size}px</span>
            <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>手ブレ補正あり</span>
          </div>
        )}

        {/* Color picker */}
        {(tool === "pen" || tool === "shape") && (
          <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>色</span>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width:26, height:26, borderRadius:"50%", background:c, border:color===c?"3px solid var(--color-text-primary)":"2px solid transparent", cursor:"pointer", outline:"none", boxShadow:"0 0 0 1px #ccc" }} />
            ))}
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{ width:26, height:26, padding:0, border:"none", borderRadius:"50%", cursor:"pointer" }} />
          </div>
        )}

        {/* Canvas */}
        <div style={S.canvasWrap}>
          <canvas ref={canvasRef} style={{ display:"block", width:"100%", touchAction:"none" }} />
          <canvas ref={overlayRef} style={{ position:"absolute", inset:0, width:"100%", opacity:0, touchAction:"none" }}
            onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={endDraw}
          />
        </div>
        <div style={{ fontSize:12, color:"var(--color-background-primary)", background:"rgba(0,0,0,0.55)", borderRadius:6, marginTop:6, padding:"6px 12px", textAlign:"center" }}>
          {tool==="shape" ? "👆 キャンバス上のお好みの場所をクリックして配置" : "✏️ ドラッグして描画 • 手ブレ補正で滑らかに"}
        </div>

        <div style={{ marginTop:12, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button style={S.btn} onClick={onClose}>キャンセル</button>
          <button style={S.btnPrimary} onClick={() => { if (canvasRef.current) onSave(canvasRef.current.toDataURL("image/png")); }}>この編集を保存</button>
        </div>
      </div>
    </div>
  );
}

// ---- Checklist modal ----
function ChecklistModal({ onConfirm, onClose, stampCount }) {
  const [checks, setChecks] = useState({});
  const toggle = (id) => setChecks(p => ({ ...p, [id]: !p[id] }));
  const mustItems = CHECKLIST_ITEMS.filter(i => i.must);
  const allMustChecked = mustItems.every(i => checks[i.id]);

  const S = {
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:"1rem" },
    modal: { background:"var(--color-background-primary)", borderRadius:16, padding:"1.5rem", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" },
    item: (checked, must) => ({ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:8, marginBottom:6, background: checked ? "var(--color-background-success)" : must ? "var(--color-background-danger)" : "var(--color-background-secondary)", border:`0.5px solid ${checked ? "var(--color-border-success)" : must ? "var(--color-border-danger)" : "var(--color-border-tertiary)"}`, cursor:"pointer" }),
    check: (checked) => ({ width:18, height:18, borderRadius:4, border:`2px solid ${checked?"var(--color-text-success)":"var(--color-border-secondary)"}`, background:checked?"var(--color-background-success)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }),
    btnPrimary: (ok) => ({ padding:"10px 24px", borderRadius:8, border:"none", background: ok ? "var(--color-text-primary)" : "var(--color-border-tertiary)", color:"var(--color-background-primary)", cursor: ok ? "pointer" : "not-allowed", fontSize:14, fontWeight:500 }),
    btn: { padding:"10px 20px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--color-text-primary)" },
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ fontSize:16, fontWeight:500, marginBottom:4, color:"var(--color-text-primary)" }}>申請前チェックリスト</div>
        <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:"1rem" }}>
          {stampCount}枚のスタンプをZIPダウンロードする前に、必須項目をすべて確認してください。
        </div>

        <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-danger)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>必須確認（赤：未チェック / 緑：確認済み）</div>
        {CHECKLIST_ITEMS.filter(i=>i.must).map(item => (
          <div key={item.id} style={S.item(!!checks[item.id], true)} onClick={() => toggle(item.id)}>
            <div style={S.check(!!checks[item.id])}>{checks[item.id] && <span style={{ fontSize:12, color:"var(--color-text-success)", fontWeight:700 }}>✓</span>}</div>
            <span style={{ fontSize:13, color:"var(--color-text-primary)", lineHeight:1.5 }}>{item.label}</span>
          </div>
        ))}

        <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", margin:"12px 0 6px", textTransform:"uppercase", letterSpacing:"0.05em" }}>推奨確認</div>
        {CHECKLIST_ITEMS.filter(i=>!i.must).map(item => (
          <div key={item.id} style={S.item(!!checks[item.id], false)} onClick={() => toggle(item.id)}>
            <div style={S.check(!!checks[item.id])}>{checks[item.id] && <span style={{ fontSize:12, color:"var(--color-text-success)", fontWeight:700 }}>✓</span>}</div>
            <span style={{ fontSize:13, color:"var(--color-text-primary)", lineHeight:1.5 }}>{item.label}</span>
          </div>
        ))}

        {!allMustChecked && (
          <div style={{ padding:"10px 12px", background:"var(--color-background-warning)", border:"0.5px solid var(--color-border-warning)", borderRadius:8, fontSize:13, color:"var(--color-text-warning)", marginTop:12 }}>
            必須項目がすべてチェックされていません。未確認のまま申請するとリジェクトされる可能性があります。
          </div>
        )}

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:"1rem" }}>
          <button style={S.btn} onClick={onClose}>戻る</button>
          <button style={S.btnPrimary(allMustChecked)} onClick={() => allMustChecked && onConfirm()} disabled={!allMustChecked}>
            {allMustChecked ? "チェック完了 — ZIPダウンロード" : `あと${mustItems.filter(i=>!checks[i.id]).length}項目必須`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Announcement generator ----
function AnnouncementPanel({ stampTitle }) {
  const [copied, setCopied] = useState(false);
  const text = `【動作環境・ご注意事項】
━━━━━━━━━━━━━━━━━━
■ 動作環境
・LINE アプリ（iOS / Android）最新版推奨
・LINE STORE（ブラウザ）からも購入可能
・スタンプの使用にはLINEアカウントが必要です

■ 購入前のご確認
・購入後の返金はお受けできません
・本スタンプはLINEトーク内でのみ使用可能です
・スタンプ配信地域により購入できない場合があります

■ 免責事項
・OS・LINEアプリのアップデートにより、表示や動作が変わる場合があります
・本スタンプに使用している素材の著作権はクリエイター本人に帰属します
・第三者の権利を侵害するご利用はお控えください
━━━━━━━━━━━━━━━━━━
${stampTitle ? `スタンプ名：${stampTitle}` : ""}`;

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{ marginTop:"1.25rem", borderTop:"0.5px solid var(--color-border-tertiary)", paddingTop:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>購入者向けアナウンス文</div>
        <button onClick={copy} style={{ padding:"6px 14px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:copied?"var(--color-background-success)":"transparent", cursor:"pointer", fontSize:12, color:copied?"var(--color-text-success)":"var(--color-text-primary)" }}>
          {copied ? "コピーしました ✓" : "テキストをコピー"}
        </button>
      </div>
      <pre style={{ fontSize:12, color:"var(--color-text-secondary)", background:"var(--color-background-secondary)", borderRadius:8, padding:"0.75rem", whiteSpace:"pre-wrap", lineHeight:1.7, margin:0, fontFamily:"var(--font-mono)" }}>{text}</pre>
      <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:6 }}>LINE Creators Marketの商品説明欄やSNSの販売告知にそのままご利用いただけます。</div>
    </div>
  );
}

// ---- Main App ----
export default function App() {
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [bgStyle, setBgStyle] = useState("color");
  const [bubbleType, setBubbleType] = useState("tail");
  const [count, setCount] = useState(16);
  const [customTexts, setCustomTexts] = useState([]);
  const [step, setStep] = useState("upload");
  const [lineGuide, setLineGuide] = useState(false);
  const [announcement, setAnnouncement] = useState(false);
  const [editingStamp, setEditingStamp] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [stampTitle, setStampTitle] = useState("");
  const fileRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files||[]);
    if (!files.length) return;
    const target = Math.min(files.length, 5);
    // loaded をクロージャ内に閉じ込めて複数回呼び出し時の混在を防ぐ
    const loaded = [];
    files.slice(0, target).forEach(file => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        loaded.push({ url, el: img, name: file.name });
        if (loaded.length === target) {
          setImages(prev => [...prev, ...loaded].slice(0, 5));
          setStep("config"); setAnalysis(null); setStamps([]);
        }
      };
      img.onerror = () => {
        loaded.push(null); // カウントを進めてハングを防ぐ
        if (loaded.filter(Boolean).length === target || loaded.length === target) {
          const valid = loaded.filter(Boolean);
          if (valid.length) { setImages(prev => [...prev, ...valid].slice(0, 5)); setStep("config"); }
        }
      };
      img.src = url;
    });
    e.target.value = "";
  };

  const analyzeImages = async () => {
    if (!images.length) return;
    setAnalyzing(true);
    try {
      const imageContents = await Promise.all(images.map(async ({url}) => {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const b64 = await new Promise(res => { const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.readAsDataURL(blob); });
        return { type:"image", source:{ type:"base64", media_type:blob.type||"image/jpeg", data:b64 } };
      }));
      const apiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1200,
          messages:[{ role:"user", content:[
            ...imageContents,
            { type:"text", text:`これらの画像（${images.length}枚）のキャラクター・被写体を分析してください。
画像ごとの表情・ポーズの違いも考慮し、LINEスタンプ向けの日本語テキスト候補を${count}個提案してください（10文字以内推奨）。
JSON形式のみで返してください（マークダウン不要）:
{"subject":"被写体の説明","mood":"雰囲気","imageNotes":["画像1の特徴"],"texts":["テキスト1",...]}` }
          ]}]
        })
      });
      const data = await apiResp.json();
      const raw = data.content?.map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(raw);
      setAnalysis(parsed); setCustomTexts(parsed.texts||[]);
    } catch(err) {
      console.error(err);
      setCustomTexts(STAMP_TEXTS.slice(0,count));
      setAnalysis({ subject:"画像", mood:"かわいい", imageNotes:[], texts:STAMP_TEXTS.slice(0,count) });
    }
    setAnalyzing(false);
  };

  const generateStamps = useCallback(() => {
    if (!images.length) return;
    const texts = (customTexts.length>0?customTexts:STAMP_TEXTS).slice(0,count);
    const colorSet = COLOR_SETS[selectedColor];
    const fontTpl = FONT_OPTIONS[selectedFont].value;
    const newStamps = texts.map((text,i) => {
      const imgEl = images[i%images.length].el;
      const c = document.createElement("canvas");
      drawStamp(c,imgEl,text,colorSet,fontTpl,bgStyle,bubbleType);
      return { text, dataUrl:c.toDataURL("image/png"), imgIdx:i%images.length, edited:false };
    });
    setStamps(newStamps); setStep("preview");
  }, [images,customTexts,count,selectedColor,selectedFont,bgStyle,bubbleType]);

  const handleSaveEdit = (idx, dataUrl) => {
    setStamps(prev => prev.map((s,i) => i===idx ? { ...s, dataUrl, edited:true } : s));
    setEditingStamp(null);
  };

  const doDownload = async () => {
    try {
      const JSZip = (await import("https://esm.sh/jszip@3")).default;
      const zip = new JSZip();
      stamps.forEach((s,i) => { zip.file(`stamp_${String(i+1).padStart(2,"0")}.png`, s.dataUrl.split(",")[1], { base64:true }); });
      const blob = await zip.generateAsync({ type:"blob" });
      const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="line_stamps.zip"; a.click();
    } catch(err) {
      console.error("ZIP生成エラー:", err);
      alert("ZIPのダウンロードに失敗しました。ネットワーク接続を確認して再試行してください。");
    }
  };

  const editedCount = stamps.filter(s=>s.edited).length;

  const S = {
    app: { fontFamily:"var(--font-sans)", maxWidth:780, margin:"0 auto", padding:"1.5rem 1rem" },
    card: { background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:"1rem" },
    label: { fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8, display:"block" },
    btn: { padding:"8px 18px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--color-text-primary)" },
    btnPrimary: { padding:"10px 22px", borderRadius:8, border:"none", background:"var(--color-text-primary)", color:"var(--color-background-primary)", cursor:"pointer", fontSize:14, fontWeight:500 },
    btnOutline: (active) => ({ padding:"6px 14px", borderRadius:8, border:active?"2px solid var(--color-text-primary)":"0.5px solid var(--color-border-secondary)", background:active?"var(--color-background-secondary)":"transparent", cursor:"pointer", fontSize:13, color:"var(--color-text-primary)", fontWeight:active?500:400 }),
    colorDot: (i) => ({ width:26, height:26, borderRadius:"50%", background:COLOR_SETS[i].bg, border:selectedColor===i?"3px solid var(--color-text-primary)":"3px solid transparent", cursor:"pointer", outline:"none", flexShrink:0 }),
    tag: { display:"inline-block", padding:"4px 10px", borderRadius:20, background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", fontSize:12, margin:"2px", cursor:"pointer" },
    stepNum: (done,active) => ({ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:500, flexShrink:0, background:active?"var(--color-text-primary)":done?"var(--color-background-success)":"var(--color-background-secondary)", color:active?"var(--color-background-primary)":done?"var(--color-text-success)":"var(--color-text-tertiary)" }),
  };

  return (
    <div style={S.app}>
      {editingStamp !== null && (
        <DrawingEditor stamp={stamps[editingStamp]} onSave={(d) => handleSaveEdit(editingStamp,d)} onClose={() => setEditingStamp(null)} />
      )}
      {showChecklist && (
        <ChecklistModal stampCount={stamps.length} onConfirm={() => { setShowChecklist(false); doDownload(); }} onClose={() => setShowChecklist(false)} />
      )}

      <h2 style={{ fontSize:22, fontWeight:500, margin:"0 0 4px", color:"var(--color-text-primary)" }}>LINE スタンプ自動生成</h2>
      <p style={{ fontSize:13, color:"var(--color-text-secondary)", margin:"0 0 1.5rem" }}>最大5枚の画像をアップロード → スタンプセット生成 → 手描き加工 → 申請チェック → ZIP出力</p>

      {/* Step indicator */}
      <div style={{ display:"flex", gap:8, marginBottom:"1.5rem", alignItems:"center" }}>
        {["アップロード","カスタマイズ","プレビュー・加工"].map((s,i) => {
          const active=[step==="upload",step==="config",step==="preview"][i];
          const done=(i===0&&step!=="upload")||(i===1&&step==="preview");
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={S.stepNum(done,active)}>{done?"✓":i+1}</div>
              <span style={{ fontSize:12, color:active?"var(--color-text-primary)":"var(--color-text-secondary)", fontWeight:active?500:400 }}>{s}</span>
              {i<2 && <span style={{ color:"var(--color-border-secondary)", fontSize:14, margin:"0 2px" }}>›</span>}
            </div>
          );
        })}
      </div>

      {/* Upload */}
      <div style={S.card}>
        <span style={S.label}>サンプル画像（最大5枚）</span>
        {images.length>0 ? (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {images.map((img,i) => (
              <div key={i} style={{ position:"relative", width:80, height:80 }}>
                <img src={img.url} style={{ width:80, height:80, objectFit:"cover", borderRadius:8, border:"0.5px solid var(--color-border-tertiary)", display:"block" }} />
                <button onClick={() => { setImages(p=>p.filter((_,j)=>j!==i)); if(images.length<=1)setStep("upload"); }} style={{ position:"absolute", top:-7, right:-7, width:20, height:20, borderRadius:"50%", background:"var(--color-background-danger)", color:"var(--color-text-danger)", border:"none", cursor:"pointer", fontSize:13, fontWeight:700, lineHeight:"20px", textAlign:"center", padding:0 }}>×</button>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.45)", borderRadius:"0 0 8px 8px", fontSize:9, color:"#fff", textAlign:"center", padding:"2px 0" }}>画像{i+1}</div>
              </div>
            ))}
            {images.length<5 && (
              <div onClick={() => fileRef.current.click()} style={{ width:80, height:80, border:"1.5px dashed var(--color-border-secondary)", borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--color-text-tertiary)" }}>
                <span style={{ fontSize:22 }}>+</span><span style={{ fontSize:10, marginTop:2 }}>追加</span>
              </div>
            )}
          </div>
        ) : (
          <div onClick={() => fileRef.current.click()} style={{ border:"1.5px dashed var(--color-border-secondary)", borderRadius:12, padding:"2rem", textAlign:"center", cursor:"pointer", marginBottom:10 }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🖼️</div>
            <div style={{ fontSize:14, color:"var(--color-text-secondary)" }}>クリックして画像を選択（最大5枚）</div>
            <div style={{ fontSize:12, color:"var(--color-text-tertiary)", marginTop:4 }}>表情・ポーズ違いの画像を複数枚いれると精度UP</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
        {images.length>0 && <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>{images.length}枚登録済み</div>}
      </div>

      {/* Config */}
      {step!=="upload" && (
        <div style={S.card}>
          <span style={S.label}>スタンプ設定</span>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:"1rem" }}>
            <div style={{ flex:1, minWidth:150 }}>
              <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:6 }}>枚数</div>
              <select value={count} onChange={e=>setCount(Number(e.target.value))} style={{ width:"100%" }}>
                {[8,16,24,32,40].map(n=><option key={n} value={n}>{n}枚セット</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:150 }}>
              <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:6 }}>フォント</div>
              <select value={selectedFont} onChange={e=>setSelectedFont(Number(e.target.value))} style={{ width:"100%" }}>
                {FONT_OPTIONS.map((f,i)=><option key={i} value={i}>{f.label}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:150 }}>
              <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:6 }}>背景</div>
              <select value={bgStyle} onChange={e=>setBgStyle(e.target.value)} style={{ width:"100%" }}>
                <option value="color">カラー</option>
                <option value="gradient">グラデーション</option>
                <option value="transparent">透過</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom:"1rem" }}>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:8 }}>テーマカラー</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {COLOR_SETS.map((c,i)=><button key={i} style={S.colorDot(i)} onClick={()=>setSelectedColor(i)} title={c.name} />)}
              <span style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>{COLOR_SETS[selectedColor].name}</span>
            </div>
          </div>

          <div style={{ marginBottom:"1.25rem" }}>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:8 }}>フキダシスタイル</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {BUBBLE_TYPES.map(bt=>(
                <button key={bt.value} style={S.btnOutline(bubbleType===bt.value)} onClick={()=>setBubbleType(bt.value)}>{bt.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:"1rem" }}>
            <button style={S.btnPrimary} onClick={analyzeImages} disabled={analyzing}>
              {analyzing?"AI分析中...":`✨ ${images.length}枚をAI分析してテキスト提案`}
            </button>
          </div>

          {analysis && (
            <div style={{ padding:"0.75rem", background:"var(--color-background-secondary)", borderRadius:8, marginBottom:"1rem" }}>
              <div style={{ marginBottom:6, display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:11, padding:"3px 8px", borderRadius:4, background:"var(--color-background-info)", color:"var(--color-text-info)" }}>AI分析結果</span>
                <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{analysis.subject} — {analysis.mood}</span>
              </div>
              {analysis.imageNotes?.filter(Boolean).length>0 && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
                  {analysis.imageNotes.map((note,i)=>(
                    <span key={i} style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", color:"var(--color-text-secondary)" }}>画像{i+1}: {note}</span>
                  ))}
                </div>
              )}
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {customTexts.map((t,i)=>(
                  <span key={i} style={S.tag} onClick={()=>{ const n=prompt("テキストを編集:",t); if(n!==null)setCustomTexts(p=>{const a=[...p];a[i]=n;return a;}); }}>{t} ✎</span>
                ))}
              </div>
            </div>
          )}
          {!analysis && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:"1rem" }}>
              {STAMP_TEXTS.slice(0,count).map((t,i)=><span key={i} style={{ ...S.tag, cursor:"default" }}>{t}</span>)}
            </div>
          )}
          <button style={S.btnPrimary} onClick={generateStamps}>スタンプを{count}枚生成 →</button>
        </div>
      )}

      {/* Preview */}
      {step==="preview" && stamps.length>0 && (
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem", flexWrap:"wrap", gap:8 }}>
            <div>
              <span style={S.label}>プレビュー・手描き加工</span>
              <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>{stamps.length}枚 • 手描き編集済み: {editedCount}枚</span>
            </div>
            <button
              style={{ ...S.btnPrimary, opacity: editedCount === stamps.length ? 1 : 0.35, cursor: editedCount === stamps.length ? "pointer" : "not-allowed" }}
              onClick={() => editedCount === stamps.length && setShowChecklist(true)}
              title={editedCount < stamps.length ? `手描き未完了 ${stamps.length - editedCount}枚` : ""}
            >
              {editedCount === stamps.length ? "申請前チェック → ZIP ↓" : `手描き未完了 ${stamps.length - editedCount}枚`}
            </button>
          </div>

          {/* AI加工必須バナー */}
          <div style={{ padding:"12px 14px", background: editedCount === stamps.length ? "var(--color-background-success)" : "var(--color-background-danger)", border:`0.5px solid ${editedCount === stamps.length ? "var(--color-border-success)" : "var(--color-border-danger)"}`, borderRadius:8, marginBottom:"1rem", lineHeight:1.65 }}>
            <div style={{ fontSize:13, fontWeight:500, color: editedCount === stamps.length ? "var(--color-text-success)" : "var(--color-text-danger)", marginBottom:3 }}>
              {editedCount === stamps.length ? `✓ 全${stamps.length}枚の手描き加工が完了しました` : `⚠ 手描き加工が必須です — 未完了 ${stamps.length - editedCount}枚`}
            </div>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>
              LINEはAIのみで生成されたスタンプを審査対象外とする場合があります。各スタンプの「✏️ 手描き」から図形を1つ置くだけでOKです。<span style={{ fontWeight:500 }}>全枚完了するまでZIPダウンロードはできません。</span>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:8 }}>
            {stamps.map((s,i)=>(
              <div key={i} style={{ borderRadius:8, overflow:"hidden", border:s.edited?"2px solid var(--color-border-success)":"0.5px solid var(--color-border-tertiary)" }}>
                <img src={s.dataUrl} style={{ width:"100%", display:"block" }} />
                <div style={{ padding:"4px 6px", borderTop:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)" }}>
                  <div style={{ fontSize:11, color:"var(--color-text-secondary)", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <span>{s.text}</span>
                    {s.edited && <span style={{ fontSize:10, color:"var(--color-text-success)" }}>✓編集済</span>}
                  </div>
                  <button onClick={()=>setEditingStamp(i)} style={{ width:"100%", padding:"5px 0", borderRadius:6, border: s.edited ? "0.5px solid var(--color-border-success)" : "1.5px solid var(--color-border-danger)", background: s.edited ? "transparent" : "var(--color-background-danger)", cursor:"pointer", fontSize:11, color: s.edited ? "var(--color-text-success)" : "var(--color-text-danger)", fontWeight: s.edited ? 400 : 500 }}>
                    {s.edited ? "✓ 編集済み" : "✏️ 手描き必須"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* スタンプタイトル入力 */}
          <div style={{ marginTop:"1rem" }}>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:6 }}>スタンプ名（アナウンス文生成用・任意）</div>
            <input type="text" value={stampTitle} onChange={e=>setStampTitle(e.target.value)} placeholder="例：うちの猫スタンプ vol.1" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", fontSize:13, background:"var(--color-background-primary)", color:"var(--color-text-primary)", boxSizing:"border-box" }} />
          </div>

          <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
            <button style={S.btn} onClick={()=>{ setStep("config"); setStamps([]); }}>← 設定を変更</button>
            <button style={{ ...S.btn, color:"var(--color-text-info)", borderColor:"var(--color-border-info)" }} onClick={()=>setLineGuide(v=>!v)}>
              {lineGuide?"申請ガイドを閉じる":"📋 LINE申請ガイド"}
            </button>
            <button style={{ ...S.btn, color:"var(--color-text-success)", borderColor:"var(--color-border-success)" }} onClick={()=>setAnnouncement(v=>!v)}>
              {announcement?"アナウンス文を閉じる":"📢 購入者向けアナウンス文"}
            </button>
          </div>

          {/* LINE申請ガイド */}
          {lineGuide && (
            <div style={{ marginTop:"1.25rem", borderTop:"0.5px solid var(--color-border-tertiary)", paddingTop:"1.25rem" }}>
              <div style={{ fontSize:15, fontWeight:500, marginBottom:"1rem", color:"var(--color-text-primary)" }}>LINE Creators Market 申請フロー</div>
              <div style={{ display:"flex", flexDirection:"column" }}>
                {LINE_STEPS.map((s,i)=>(
                  <div key={i} style={{ display:"flex", gap:14, paddingBottom:i<LINE_STEPS.length-1?"1.1rem":0, position:"relative" }}>
                    {i<LINE_STEPS.length-1 && <div style={{ position:"absolute", left:11, top:28, bottom:0, width:1, background:"var(--color-border-tertiary)" }} />}
                    <div style={{ width:24, height:24, borderRadius:"50%", background:"var(--color-background-info)", color:"var(--color-text-info)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:500, flexShrink:0, zIndex:1 }}>{s.num}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)", marginBottom:3 }}>{s.title}</div>
                      <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:5, lineHeight:1.65 }}>{s.desc}</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                        <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background:"var(--color-background-secondary)", color:"var(--color-text-tertiary)" }}>{s.note}</span>
                        {s.link && <a href={s.link} style={{ fontSize:12, color:"var(--color-text-info)" }} target="_blank" rel="noreferrer">{s.link} ↗</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:"1rem", padding:"0.75rem", background:"var(--color-background-secondary)", borderRadius:8, fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.7 }}>
                <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>補足: </span>
                メイン画像（240×240px）とトーク画像（96×74px）も別途必要です。審査は無料、販売時はLINEが30%の手数料を取得します。
              </div>
            </div>
          )}

          {/* アナウンス文 */}
          {announcement && <AnnouncementPanel stampTitle={stampTitle} />}
        </div>
      )}
    </div>
  );
}
