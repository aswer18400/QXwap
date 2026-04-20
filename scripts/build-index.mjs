import fs from 'fs';
import path from 'path';

const SRC = 'attached_assets/qxwap-mvp-v40-profile-tabs-safe_1776694682776.html';
const DST = 'artifacts/web-app/index.html';

let html = fs.readFileSync(SRC, 'utf8');

const SUPA_URL = 'https://cpradtvneftyeflwjvmx.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcmFkdHZuZWZ0eWVmbHdqdm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzY4OTcsImV4cCI6MjA5MjI1Mjg5N30.RATKQm94K3gqW3ZuiYdYa-iWAoyCeX-jkxGol8mfmUg';

// ============ HEAD INJECT ============
const headInject = `
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script>
    window.SB = window.supabase.createClient('${SUPA_URL}', '${SUPA_KEY}');
  </script>
  <style>
    #qx-auth-overlay{position:fixed;inset:0;z-index:9999;background:#f7f5f1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    #qx-auth-overlay.hidden{display:none}
    #qx-auth-overlay .qx-auth-card{width:100%;max-width:380px;background:#fff;border-radius:28px;padding:32px 24px;box-shadow:0 20px 50px rgba(19,16,13,.08)}
    #qx-auth-overlay .qx-brand{font-size:36px;font-weight:900;letter-spacing:-.05em;text-align:center;color:#171614}
    #qx-auth-overlay .qx-brand span{color:#ff6a3d}
    #qx-auth-overlay .qx-sub{margin-top:6px;text-align:center;font-size:13px;color:#756d63}
    #qx-auth-overlay .qx-tabs{display:flex;gap:6px;margin-top:24px;background:#f0ece6;padding:4px;border-radius:999px}
    #qx-auth-overlay .qx-tab{flex:1;height:42px;border:none;border-radius:999px;background:transparent;font-weight:900;font-size:13px;color:#4a433c;cursor:pointer}
    #qx-auth-overlay .qx-tab.active{background:#ff6a3d;color:#fff;box-shadow:0 8px 18px rgba(255,106,61,.22)}
    #qx-auth-overlay .qx-field{margin-top:14px}
    #qx-auth-overlay .qx-field input{width:100%;height:50px;border:none;outline:none;background:#f0ece6;border-radius:16px;padding:0 16px;font-size:14px;color:#171614}
    #qx-auth-overlay .qx-field input::placeholder{color:#aaa095}
    #qx-auth-overlay .qx-submit{width:100%;height:52px;margin-top:18px;border:none;border-radius:18px;background:linear-gradient(180deg,#ff7b51,#ff6a3d);color:#341811;font-weight:900;font-size:15px;letter-spacing:.03em;text-transform:uppercase;box-shadow:0 12px 22px rgba(255,106,61,.18);cursor:pointer}
    #qx-auth-overlay .qx-submit:disabled{opacity:.6;cursor:not-allowed}
    #qx-auth-overlay .qx-msg{margin-top:12px;text-align:center;font-size:13px;color:#b13205;min-height:18px}
    #qx-auth-overlay .qx-msg.ok{color:#1f8c58}

    #qx-loading{position:fixed;inset:0;z-index:9998;background:#f7f5f1;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:Inter,sans-serif;color:#756d63;font-size:13px}
    #qx-loading.show{display:flex}
    #qx-loading .qx-spin{width:36px;height:36px;border:3px solid #e7e1d8;border-top-color:#ff6a3d;border-radius:50%;animation:qxs 1s linear infinite}
    @keyframes qxs{to{transform:rotate(360deg)}}

    /* Create Listing Sheet */
    #qxCreateBackdrop{position:fixed;inset:0;background:rgba(19,16,13,.35);z-index:9000;display:none}
    #qxCreateBackdrop.open{display:block}
    #qxCreateSheet{position:fixed;left:50%;bottom:0;transform:translate(-50%,100%);width:100%;max-width:480px;background:#fff;border-radius:28px 28px 0 0;z-index:9001;max-height:92vh;overflow-y:auto;transition:transform .28s ease;font-family:Inter,sans-serif}
    #qxCreateSheet.open{transform:translate(-50%,0)}
    #qxCreateSheet .qcs-handle{width:44px;height:5px;background:#e7e1d8;border-radius:999px;margin:10px auto 0}
    #qxCreateSheet .qcs-head{padding:18px 24px 6px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    #qxCreateSheet .qcs-head h2{margin:0;font-size:20px;font-weight:900;color:#171614}
    #qxCreateSheet .qcs-head p{margin:2px 0 0;font-size:13px;color:#756d63}
    #qxCreateSheet .qcs-close{border:none;background:#f0ece6;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;color:#4a433c;flex-shrink:0}
    #qxCreateSheet .qcs-body{padding:8px 24px 24px;display:flex;flex-direction:column;gap:16px}
    #qxCreateSheet .qcs-section-title{font-size:12px;font-weight:900;color:#ff6a3d;letter-spacing:.08em;text-transform:uppercase;margin-top:6px}
    #qxCreateSheet .qcs-field{display:flex;flex-direction:column;gap:6px}
    #qxCreateSheet .qcs-field label{font-size:13px;font-weight:700;color:#171614}
    #qxCreateSheet .qcs-field input,#qxCreateSheet .qcs-field textarea,#qxCreateSheet .qcs-field select{width:100%;border:none;background:#f7f5f1;border-radius:14px;padding:13px 14px;font-size:14px;color:#171614;outline:none;font-family:inherit;box-sizing:border-box}
    #qxCreateSheet .qcs-field textarea{min-height:78px;resize:vertical}
    #qxCreateSheet .qcs-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    #qxCreateSheet .qcs-pillrow{display:flex;flex-wrap:wrap;gap:8px}
    #qxCreateSheet .qcs-pill{border:1px solid #e7e1d8;background:#fff;border-radius:999px;padding:8px 14px;font-size:13px;color:#4a433c;cursor:pointer;font-weight:700}
    #qxCreateSheet .qcs-pill.active{background:#ff6a3d;color:#fff;border-color:#ff6a3d}
    #qxCreateSheet .qcs-img-drop{border:1.5px dashed #e7e1d8;border-radius:18px;padding:18px;text-align:center;cursor:pointer;background:#f7f5f1;color:#756d63;font-size:13px;font-weight:600}
    #qxCreateSheet .qcs-img-preview{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    #qxCreateSheet .qcs-img-preview img{width:72px;height:72px;border-radius:12px;object-fit:cover}
    #qxCreateSheet .qcs-submit{width:100%;height:54px;border:none;border-radius:18px;background:linear-gradient(180deg,#ff7b51,#ff6a3d);color:#fff;font-weight:900;font-size:15px;cursor:pointer;margin-top:8px;box-shadow:0 12px 22px rgba(255,106,61,.22);text-transform:uppercase;letter-spacing:.03em}
    #qxCreateSheet .qcs-submit:disabled{opacity:.6;cursor:not-allowed}
    #qxCreateSheet .qcs-msg{font-size:13px;text-align:center;min-height:18px;color:#b13205}
    #qxCreateSheet .qcs-msg.ok{color:#1f8c58}
  </style>
`;

// ============ BODY TOP INJECT (auth + create-listing markup) ============
const bodyTopInject = `
  <div id="qx-loading"><div class="qx-spin"></div><div id="qx-loading-msg">กำลังโหลด...</div></div>
  <div id="qx-auth-overlay">
    <div class="qx-auth-card">
      <div class="qx-brand">Q<span>X</span>wap</div>
      <div class="qx-sub">แพลตฟอร์มแลกเปลี่ยนสินค้า</div>
      <div class="qx-tabs">
        <button class="qx-tab active" id="qx-tab-login" onclick="qxSetTab('login')">เข้าสู่ระบบ</button>
        <button class="qx-tab" id="qx-tab-signup" onclick="qxSetTab('signup')">สมัครสมาชิก</button>
      </div>
      <div class="qx-field"><input id="qx-email" type="email" placeholder="อีเมล" autocomplete="email" /></div>
      <div class="qx-field"><input id="qx-password" type="password" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" autocomplete="current-password" /></div>
      <button id="qx-submit" class="qx-submit" onclick="qxSubmit()">เข้าสู่ระบบ</button>
      <div id="qx-msg" class="qx-msg"></div>
    </div>
  </div>

  <!-- Create Listing Sheet (injected; not in original prototype) -->
  <div id="qxCreateBackdrop" onclick="qxCloseCreate()"></div>
  <div id="qxCreateSheet" role="dialog" aria-label="สร้างโพสต์สินค้า">
    <div class="qcs-handle"></div>
    <div class="qcs-head">
      <div>
        <h2>โพสต์สินค้าใหม่</h2>
        <p>บอกเล่าสินค้าที่อยากแลก หรือขาย</p>
      </div>
      <button class="qcs-close" onclick="qxCloseCreate()" aria-label="ปิด">×</button>
    </div>
    <form class="qcs-body" id="qxCreateForm" onsubmit="event.preventDefault(); qxSubmitCreateListing()">
      <div class="qcs-section-title">สินค้าที่คุณมี</div>
      <div class="qcs-field"><label>ชื่อสินค้า *</label><input id="qcs-have-title" required maxlength="120" placeholder="เช่น iPhone 14 Pro 256GB"></div>
      <div class="qcs-field"><label>รายละเอียด</label><textarea id="qcs-have-desc" placeholder="สภาพ การใช้งาน อุปกรณ์ที่ให้ ฯลฯ"></textarea></div>
      <div class="qcs-field"><label>หมวดหมู่</label>
        <select id="qcs-category">
          <option value="electronics">Electronics</option>
          <option value="fashion">Fashion</option>
          <option value="home">Home</option>
          <option value="sports">Sports</option>
          <option value="books">Books</option>
          <option value="toys">Toys</option>
          <option value="beauty">Beauty</option>
          <option value="other">อื่นๆ</option>
        </select>
      </div>
      <div class="qcs-field"><label>รูปสินค้า (เลือกได้หลายรูป)</label>
        <label for="qcs-images" class="qcs-img-drop" id="qcs-img-drop-label">📷 แตะเพื่อเลือกรูป</label>
        <input id="qcs-images" type="file" accept="image/*" multiple style="display:none" onchange="qxPreviewImages(this)">
        <div class="qcs-img-preview" id="qcs-img-preview"></div>
      </div>

      <div class="qcs-section-title">สิ่งที่อยากได้</div>
      <div class="qcs-field"><label>ของที่อยากแลก</label><input id="qcs-want-title" maxlength="120" placeholder="เช่น AirPods Max หรือกล้องฟิล์ม"></div>
      <div class="qcs-field"><label>เพิ่มเติม</label><textarea id="qcs-want-desc" placeholder="สภาพที่รับได้ ฯลฯ"></textarea></div>

      <div class="qcs-section-title">โหมดและราคา</div>
      <div class="qcs-field"><label>โหมด</label>
        <div class="qcs-pillrow" id="qcs-mode-row">
          <button type="button" class="qcs-pill active" data-mode="swap" onclick="qxPickMode(this)">แลกอย่างเดียว</button>
          <button type="button" class="qcs-pill" data-mode="sell" onclick="qxPickMode(this)">ขายอย่างเดียว</button>
          <button type="button" class="qcs-pill" data-mode="both" onclick="qxPickMode(this)">แลก/ขาย</button>
        </div>
      </div>
      <div class="qcs-row">
        <div class="qcs-field"><label>ราคา (บาท)</label><input id="qcs-price" type="number" min="0" placeholder="0"></div>
        <div class="qcs-field"><label>สถานที่</label><input id="qcs-location" maxlength="60" placeholder="เช่น Bangkok"></div>
      </div>
      <div class="qcs-field"><label>สภาพ</label>
        <div class="qcs-pillrow" id="qcs-cond-row">
          <button type="button" class="qcs-pill" data-cond="new" onclick="qxPickCond(this)">ของใหม่</button>
          <button type="button" class="qcs-pill active" data-cond="used_good" onclick="qxPickCond(this)">สภาพดี</button>
          <button type="button" class="qcs-pill" data-cond="used_fair" onclick="qxPickCond(this)">พอใช้</button>
          <button type="button" class="qcs-pill" data-cond="used_poor" onclick="qxPickCond(this)">ใช้งานหนัก</button>
        </div>
      </div>

      <button type="submit" class="qcs-submit" id="qcs-submit-btn">โพสต์เลย</button>
      <div class="qcs-msg" id="qcs-msg"></div>
    </form>
  </div>

  <script>
    let qxMode = 'login';
    function qxSetTab(mode){
      qxMode = mode;
      document.getElementById('qx-tab-login').classList.toggle('active', mode==='login');
      document.getElementById('qx-tab-signup').classList.toggle('active', mode==='signup');
      document.getElementById('qx-submit').textContent = mode==='login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
      document.getElementById('qx-msg').textContent = '';
    }
    function qxMsg(text, ok){ const el=document.getElementById('qx-msg'); el.textContent=text; el.classList.toggle('ok',!!ok); }
    function qxLoading(show, msg){
      const el = document.getElementById('qx-loading');
      if(msg) document.getElementById('qx-loading-msg').textContent = msg;
      el.classList.toggle('show', !!show);
    }
    async function qxSubmit(){
      const email = document.getElementById('qx-email').value.trim();
      const password = document.getElementById('qx-password').value;
      if(!email || !password){ qxMsg('กรุณากรอกอีเมลและรหัสผ่าน'); return; }
      const btn = document.getElementById('qx-submit'); btn.disabled = true;
      try{
        if(qxMode === 'signup'){
          const { error } = await window.SB.auth.signUp({ email, password });
          if(error) throw error;
          qxMsg('สมัครสำเร็จ! กำลังเข้าสู่ระบบ...', true);
          const { error: e2 } = await window.SB.auth.signInWithPassword({ email, password });
          if(e2) throw e2;
        } else {
          const { error } = await window.SB.auth.signInWithPassword({ email, password });
          if(error) throw error;
        }
      } catch(e){ qxMsg(e.message || 'เกิดข้อผิดพลาด'); }
      finally { btn.disabled = false; }
    }
    function qxShowOverlay(){ document.getElementById('qx-auth-overlay').classList.remove('hidden'); }
    function qxHideOverlay(){ document.getElementById('qx-auth-overlay').classList.add('hidden'); }
    async function qxLogout(){ await window.SB.auth.signOut(); location.reload(); }
    window.qxLogout = qxLogout;

    window.qxNeedsHydrate = false;
    async function qxRunHydrate(){
      if(window.qxHydrate){ await window.qxHydrate(); }
      else { window.qxNeedsHydrate = true; }
    }
    (async () => {
      const { data } = await window.SB.auth.getSession();
      window.QX_SESSION = data.session;
      if(!data.session){ qxShowOverlay(); }
      else { qxHideOverlay(); await qxRunHydrate(); }
      window.SB.auth.onAuthStateChange(async (_e, sess) => {
        const wasLoggedIn = !!window.QX_SESSION;
        window.QX_SESSION = sess;
        if(!sess){ qxShowOverlay(); }
        else if(!wasLoggedIn){ qxHideOverlay(); await qxRunHydrate(); }
      });
    })();
  </script>
`;

// ============ STUB MISSING ELEMENTS ============
const stubMissingEls = `
  <div id="searchOverlay" style="display:none"><input id="searchOverlayInput" /></div>
`;

// ============ BODY BOTTOM INJECT (hydration + write overrides) ============
const bodyBottomInject = `
<script>
(function(){
  const SB = window.SB;
  const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80';
  const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80';
  const CATEGORY_LABEL = {electronics:'Electronics',fashion:'Fashion',home:'Home',sports:'Sports',books:'Books',toys:'Toys',beauty:'Beauty',other:'อื่นๆ'};
  const CONDITION_LABEL = {new:'ของใหม่',used_good:'สภาพดี',used_fair:'พอใช้',used_poor:'ใช้งานหนัก'};

  window.QX_PROFILES_BY_NAME = {};
  window.QX_PROFILES_BY_ID = {};
  window.QX_REALTIME_CHANNEL = null;

  function fmtTime(iso){
    if(!iso) return '';
    const d=new Date(iso),now=new Date(),diff=(now-d)/1000;
    if(diff<60) return 'เมื่อกี้'; if(diff<3600) return Math.floor(diff/60)+' นาที';
    if(diff<86400) return Math.floor(diff/3600)+' ชม.'; if(diff<172800) return 'เมื่อวาน';
    return Math.floor(diff/86400)+' วัน';
  }
  function priceLabel(l){
    if(l.price && l.price>0) return '฿'+new Intl.NumberFormat('th-TH').format(l.price);
    if(l.mode==='swap') return 'แลกเปลี่ยน';
    return 'เปิดรับข้อเสนอ';
  }

  const SEED_LISTINGS = [
    {have_title:'MacBook Pro 14" M2 ครบกล่อง',have_desc:'ใช้งานปกติ ไม่มีรอย แบตเฮลธ์ 96%',have_category:'electronics',have_images:['https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80'],want_title:'AirPods Max สี Silver พร้อมกล่อง',want_desc:'อยากได้สี Silver สภาพดี',price:39900,mode:'both',condition:'used_good',location:'Bangkok'},
    {have_title:'iPhone 14 Blue 128GB',have_desc:'แบตเดิม ครบกล่อง ใบเสร็จมี',have_category:'electronics',have_images:['https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?auto=format&fit=crop&w=1200&q=80'],want_title:'Sony A6400 + Lens kit',want_desc:'มือสองสภาพดี',price:22000,mode:'both',condition:'used_good',location:'ลาดพร้าว'},
    {have_title:'Nike Dunk Low Panda ไซซ์ 42',have_desc:'ใส่ไม่กี่ครั้ง สภาพ 95%',have_category:'fashion',have_images:['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'],want_title:'Stussy Jacket สีดำ ไซซ์ M',want_desc:'แลกตรงได้',price:null,mode:'swap',condition:'used_good',location:'ใกล้ฉัน'},
    {have_title:'โต๊ะไม้เล็กมินิมอล 120 ซม.',have_desc:'ไม้โอ๊คแท้ มีรอยใช้งานเล็กน้อย',have_category:'home',have_images:['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],want_title:'โคมไฟตั้งโต๊ะโทนครีม',want_desc:'แบบมินิมอล',price:1500,mode:'both',condition:'used_good',location:'Bangkok'},
    {have_title:'Apple Watch Series 8 GPS',have_desc:'ครบกล่อง พร้อมสาย sport band',have_category:'electronics',have_images:['https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=1200&q=80'],want_title:'Garmin Forerunner หรือ AirPods Pro',want_desc:'',price:9500,mode:'both',condition:'used_good',location:'พระราม 9'},
    {have_title:'Brompton จักรยานพับ มือสอง',have_desc:'M3L สีดำ ใช้งาน 1 ปี',have_category:'sports',have_images:['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80'],want_title:'Mac mini M2 หรือเครดิต',want_desc:'',price:38000,mode:'both',condition:'used_good',location:'Bangkok'}
  ];

  async function seedIfEmpty(userId){
    const { count } = await SB.from('listings').select('id', {count:'exact', head:true});
    if(count && count>0) return;
    const rows = SEED_LISTINGS.map(s => ({...s, owner_id: userId}));
    const { error } = await SB.from('listings').insert(rows);
    if(error) console.warn('Seed error:', error.message);
  }

  async function ensureProfile(user){
    const { data } = await SB.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if(data) return data;
    const username = (user.email || 'user').split('@')[0] + '_' + user.id.slice(0,4);
    const { data: created } = await SB.from('profiles').insert({id:user.id,username,display_name:username,avatar_url:null}).select().single();
    return created;
  }

  function transformListing(l, profilesById, offersByListing){
    const owner = profilesById[l.owner_id] || {};
    const offers = offersByListing[l.id] || [];
    return {
      title: l.have_title,
      owner: owner.display_name || owner.username || 'QXwap User',
      ownerImg: owner.avatar_url || FALLBACK_AVATAR,
      ownerId: l.owner_id,
      haveTitle: l.have_title,
      wantTitle: l.want_title || 'เปิดรับข้อเสนอ',
      haveImg: (l.have_images && l.have_images[0]) || PLACEHOLDER_IMG,
      wantImg: PLACEHOLDER_IMG,
      price: priceLabel(l),
      meta: l.location || CATEGORY_LABEL[l.have_category] || '-',
      category: l.have_category || 'other',
      seg: ['all'],
      tag: CONDITION_LABEL[l.condition] || 'พร้อมแลก',
      mode: l.mode || 'swap',
      buyPrice: l.price ? '฿'+new Intl.NumberFormat('th-TH').format(l.price) : null,
      requestCount: offers.length,
      requests: offers.map(o => {
        const sender = profilesById[o.sender_id] || {};
        return {
          name: sender.display_name || sender.username || 'ผู้ใช้',
          img: sender.avatar_url || FALLBACK_AVATAR,
          time: fmtTime(o.created_at),
          items: Array.isArray(o.offer_items) ? o.offer_items : [],
          credit: o.credit_amount>0 ? Number(o.credit_amount) : undefined,
          cash: o.cash_amount>0 ? Number(o.cash_amount) : undefined,
          status: o.status,
          offerId: o.id,
          senderId: o.sender_id
        };
      }),
      listingId: l.id
    };
  }

  async function loadFeed(currentUserId){
    const { data: listings, error } = await SB.from('listings').select('*').eq('status','active').order('created_at', {ascending:false});
    if(error){ console.warn('listings:', error.message); return; }
    const ownerIds = [...new Set(listings.map(l=>l.owner_id))];
    let offers = [];
    if(listings.length){
      const ids = listings.map(l=>l.id);
      const { data: o } = await SB.from('offers').select('*').in('listing_id', ids);
      offers = o || [];
    }
    const senderIds = [...new Set(offers.map(o=>o.sender_id))];
    const allProfileIds = [...new Set([...ownerIds, ...senderIds, currentUserId])];
    let profiles = [];
    if(allProfileIds.length){
      const { data } = await SB.from('profiles').select('*').in('id', allProfileIds);
      profiles = data || [];
    }
    const profilesById = Object.fromEntries(profiles.map(p=>[p.id,p]));
    window.QX_PROFILES_BY_ID = profilesById;
    window.QX_PROFILES_BY_NAME = Object.fromEntries(profiles.map(p=>[p.display_name||p.username, p]));
    const offersByListing = {};
    offers.forEach(o=>{(offersByListing[o.listing_id]=offersByListing[o.listing_id]||[]).push(o)});
    const transformed = listings.map(l => transformListing(l, profilesById, offersByListing));
    feedItems.length=0; feedItems.push(...transformed);

    const seenOwners = new Set(); const newStories = [];
    listings.forEach(l => {
      if(l.owner_id===currentUserId || seenOwners.has(l.owner_id)) return;
      seenOwners.add(l.owner_id);
      const p = profilesById[l.owner_id];
      if(p) newStories.push({name:p.display_name||p.username, img:p.avatar_url||FALLBACK_AVATAR});
    });
    if(newStories.length===0){
      const self = profilesById[currentUserId];
      if(self) newStories.push({name:self.display_name||'You', img:self.avatar_url||FALLBACK_AVATAR});
    }
    stories.length=0; stories.push(...newStories);
    return { profilesById, offers, listings };
  }

  async function loadInbox(currentUserId, profilesById){
    const { data: convos } = await SB.from('conversations').select('*')
      .or(\`participant_a.eq.\${currentUserId},participant_b.eq.\${currentUserId}\`)
      .order('last_at', {ascending:false});
    const list = (convos||[]).map(c => {
      const otherId = c.participant_a===currentUserId ? c.participant_b : c.participant_a;
      const p = profilesById[otherId] || {};
      const name = p.display_name || p.username || 'ผู้ใช้';
      // populate chatThreads with real conversation metadata
      if(typeof chatThreads === 'object'){
        const existing = chatThreads[name];
        chatThreads[name] = {
          ...(existing || chatThreads.Mild || {}),
          name,
          img: p.avatar_url || FALLBACK_AVATAR,
          conversationId: c.id,
          partnerId: otherId,
          messages: [], // loaded on chat open
          quickReplies: (existing && existing.quickReplies) || ['สวัสดีครับ','สนใจครับ','นัดเจอที่ไหนดี'],
          targetTitle: c.last_message ? c.last_message.slice(0,40) : (existing?.targetTitle || ''),
          dealStatus: existing?.dealStatus || 'pending'
        };
      }
      return {name,img:p.avatar_url||FALLBACK_AVATAR,online:false,msg:c.last_message||'เริ่มต้นการสนทนา',time:fmtTime(c.last_at),unread:0,conversationId:c.id,partnerId:otherId};
    });
    inbox.length=0; inbox.push(...list);
  }

  async function loadNotifications(currentUserId, offersAll, profilesById){
    const myListingIds = feedItems.filter(f=>f.ownerId===currentUserId).map(f=>f.listingId);
    const incoming = offersAll.filter(o=>myListingIds.includes(o.listing_id) && o.sender_id!==currentUserId);
    const recent = incoming.slice(0,3).map(o => {
      const sender = profilesById[o.sender_id]||{};
      const listing = feedItems.find(f=>f.listingId===o.listing_id);
      return {icon:'user', title:(sender.display_name||'ผู้ใช้')+' ส่งข้อเสนอใหม่', sub:'สำหรับ '+(listing?listing.title:'สินค้าของคุณ'), time:fmtTime(o.created_at), unread:o.status==='pending', targetIndex:feedItems.findIndex(f=>f.listingId===o.listing_id)};
    });
    const earlier = incoming.slice(3,8).map(o => {
      const sender = profilesById[o.sender_id]||{};
      const listing = feedItems.find(f=>f.listingId===o.listing_id);
      return {icon:'feed', title:(sender.display_name||'ผู้ใช้')+' ขอแลก', sub:listing?listing.title:'สินค้า', time:fmtTime(o.created_at), unread:false, targetIndex:feedItems.findIndex(f=>f.listingId===o.listing_id)};
    });
    notiNew.length=0; notiNew.push(...recent);
    notiEarlier.length=0; notiEarlier.push(...earlier);

    offersActivity.length=0;
    incoming.slice(0,8).forEach(o => {
      const sender = profilesById[o.sender_id]||{};
      const listing = feedItems.find(f=>f.listingId===o.listing_id);
      offersActivity.push({img:sender.avatar_url||FALLBACK_AVATAR, title:(sender.display_name||'ผู้ใช้')+' ขอแลก '+(listing?listing.title:''), sub:o.note||'ดูข้อเสนอ', time:fmtTime(o.created_at), unread:o.status==='pending', targetIndex:feedItems.findIndex(f=>f.listingId===o.listing_id)});
    });
  }

  function loadProfile(profile){
    if(!profile) return;
    const self = profileDirectory.self;
    self.name = profile.display_name||profile.username||'You';
    self.handle = '@'+(profile.username||'me');
    self.img = profile.avatar_url || FALLBACK_AVATAR;
    self.subtitle = profile.verified ? 'Trusted swapper' : 'New trader';
    self.rating = profile.rating!=null ? String(profile.rating) : '5.0';
    self.deals = String(profile.total_swaps||0);
    if(profile.bio) self.trust = profile.bio;
  }

  function rerenderAll(){
    try{ if(typeof renderStories==='function') renderStories(); }catch(e){console.warn(e);}
    try{ if(typeof renderFeed==='function') renderFeed(); }catch(e){console.warn(e);}
    try{ if(typeof renderInbox==='function') renderInbox(); }catch(e){console.warn(e);}
    try{ if(typeof renderInboxHub==='function') renderInboxHub(true); }catch(e){console.warn(e);}
    try{ if(typeof renderNotis==='function') renderNotis(); }catch(e){console.warn(e);}
    try{ if(typeof renderHomeNotifications==='function') renderHomeNotifications(); }catch(e){console.warn(e);}
    try{ if(typeof renderOffers==='function') renderOffers(); }catch(e){console.warn(e);}
    try{ if(typeof renderProducts==='function') renderProducts(); }catch(e){console.warn(e);}
    try{ if(typeof renderProfileScreen==='function') renderProfileScreen(profileDirectory.self, true); }catch(e){console.warn(e);}
  }

  window.qxHydrate = async function(){
    try{
      qxLoading(true,'กำลังโหลดข้อมูล...');
      const session = window.QX_SESSION; if(!session) return;
      const user = session.user;
      const profile = await ensureProfile(user); loadProfile(profile);
      qxLoading(true,'กำลังเตรียมสินค้า...'); await seedIfEmpty(user.id);
      qxLoading(true,'กำลังโหลดฟีด...'); const result = await loadFeed(user.id);
      if(result){
        await loadInbox(user.id, result.profilesById);
        await loadNotifications(user.id, result.offers, result.profilesById);
      }
      rerenderAll();
    } catch(e){ console.error('Hydrate failed:', e); }
    finally { qxLoading(false); }
  };

  // ============ WRITE OPERATIONS ============

  // 1. Image upload helper
  window.qxUploadImage = async function(file){
    const session = window.QX_SESSION;
    if(!session) throw new Error('not logged in');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,40);
    const path = \`\${session.user.id}/\${Date.now()}-\${Math.random().toString(36).slice(2,8)}-\${safeName}\`;
    const { error } = await SB.storage.from('listing-images').upload(path, file, {cacheControl:'3600', upsert:false, contentType:file.type});
    if(error) throw error;
    const { data } = SB.storage.from('listing-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // 2. Create Listing UI
  let qxCreateImageFiles = [];
  let qxCreateMode = 'swap';
  let qxCreateCond = 'used_good';

  window.qxOpenCreate = function(){
    qxCreateImageFiles = [];
    document.getElementById('qxCreateForm').reset();
    document.getElementById('qcs-img-preview').innerHTML = '';
    document.getElementById('qcs-msg').textContent = '';
    qxCreateMode = 'swap'; qxCreateCond = 'used_good';
    document.querySelectorAll('#qcs-mode-row .qcs-pill').forEach(b => b.classList.toggle('active', b.dataset.mode==='swap'));
    document.querySelectorAll('#qcs-cond-row .qcs-pill').forEach(b => b.classList.toggle('active', b.dataset.cond==='used_good'));
    document.getElementById('qxCreateBackdrop').classList.add('open');
    document.getElementById('qxCreateSheet').classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.qxCloseCreate = function(){
    document.getElementById('qxCreateBackdrop').classList.remove('open');
    document.getElementById('qxCreateSheet').classList.remove('open');
    document.body.style.overflow = '';
  };
  window.qxPickMode = function(btn){
    qxCreateMode = btn.dataset.mode;
    document.querySelectorAll('#qcs-mode-row .qcs-pill').forEach(b => b.classList.toggle('active', b===btn));
  };
  window.qxPickCond = function(btn){
    qxCreateCond = btn.dataset.cond;
    document.querySelectorAll('#qcs-cond-row .qcs-pill').forEach(b => b.classList.toggle('active', b===btn));
  };
  window.qxPreviewImages = function(input){
    qxCreateImageFiles = Array.from(input.files || []).slice(0,5);
    const host = document.getElementById('qcs-img-preview');
    host.innerHTML = '';
    qxCreateImageFiles.forEach(f => {
      const url = URL.createObjectURL(f);
      const img = document.createElement('img');
      img.src = url;
      host.appendChild(img);
    });
  };
  window.qxSubmitCreateListing = async function(){
    const haveTitle = document.getElementById('qcs-have-title').value.trim();
    if(!haveTitle){ document.getElementById('qcs-msg').textContent='กรุณากรอกชื่อสินค้า'; return; }
    const btn = document.getElementById('qcs-submit-btn'); btn.disabled = true; btn.textContent = 'กำลังโพสต์...';
    const msg = document.getElementById('qcs-msg'); msg.classList.remove('ok'); msg.textContent = '';
    try{
      const session = window.QX_SESSION; if(!session) throw new Error('โปรดเข้าสู่ระบบ');
      const imgUrls = [];
      for(const f of qxCreateImageFiles){
        msg.textContent = 'กำลังอัปโหลดรูป...';
        const url = await window.qxUploadImage(f);
        imgUrls.push(url);
      }
      const row = {
        owner_id: session.user.id,
        have_title: haveTitle,
        have_desc: document.getElementById('qcs-have-desc').value.trim() || null,
        have_category: document.getElementById('qcs-category').value,
        have_images: imgUrls,
        want_title: document.getElementById('qcs-want-title').value.trim() || null,
        want_desc: document.getElementById('qcs-want-desc').value.trim() || null,
        price: Number(document.getElementById('qcs-price').value) || null,
        mode: qxCreateMode,
        condition: qxCreateCond,
        location: document.getElementById('qcs-location').value.trim() || null
      };
      const { error } = await SB.from('listings').insert(row);
      if(error) throw error;
      msg.classList.add('ok'); msg.textContent='โพสต์สำเร็จ!';
      window.qxCloseCreate();
      if(typeof showToast==='function') showToast('โพสต์สินค้าใหม่สำเร็จ');
      await window.qxHydrate();
      if(typeof go==='function') go('feed');
    } catch(e){
      console.error(e); msg.textContent = e.message || 'เกิดข้อผิดพลาด';
    } finally {
      btn.disabled=false; btn.textContent='โพสต์เลย';
    }
  };

  // Override go() to intercept 'add' navigation and open create sheet
  if(typeof window.go === 'function'){
    const _origGo = window.go;
    window.go = function(target, skipHistory){
      if(target === 'add'){ window.qxOpenCreate(); return; }
      return _origGo.call(this, target, skipHistory);
    };
  } else {
    // go is defined later as a hoisted function, wait
    setTimeout(() => {
      if(typeof window.go === 'function'){
        const _origGo = window.go;
        window.go = function(target, skipHistory){
          if(target==='add'){ window.qxOpenCreate(); return; }
          return _origGo.call(this, target, skipHistory);
        };
      }
    }, 0);
  }

  // 3. Send Chat Message — override
  async function findOrCreateConversation(currentUserId, partnerId, offerId){
    const a = currentUserId < partnerId ? currentUserId : partnerId;
    const b = currentUserId < partnerId ? partnerId : currentUserId;
    const { data: existing } = await SB.from('conversations').select('*')
      .eq('participant_a', a).eq('participant_b', b).maybeSingle();
    if(existing) return existing;
    const { data: created, error } = await SB.from('conversations')
      .insert({participant_a:a, participant_b:b, offer_id:offerId||null, last_message:'', last_at:new Date().toISOString()})
      .select().single();
    if(error){ console.warn('create convo:', error.message); return null; }
    return created;
  }

  async function loadConversationMessages(convoId){
    const { data } = await SB.from('messages').select('*').eq('conversation_id', convoId).order('created_at', {ascending:true});
    return data || [];
  }

  function subscribeToConversation(convoId, currentUserId, threadName){
    if(window.QX_REALTIME_CHANNEL){ try{ SB.removeChannel(window.QX_REALTIME_CHANNEL); }catch{} }
    const channel = SB.channel('conv:'+convoId)
      .on('postgres_changes', {event:'INSERT', schema:'public', table:'messages', filter:'conversation_id=eq.'+convoId}, payload => {
        const m = payload.new;
        if(m.sender_id === currentUserId) return; // already shown locally
        const thread = chatThreads[threadName];
        if(!thread) return;
        thread.messages.push({side:'them', text:m.text, time:fmtTime(m.created_at)});
        if(typeof renderChatScreen==='function' && appState.activeChatName === threadName){
          renderChatScreen(thread);
        }
      }).subscribe();
    window.QX_REALTIME_CHANNEL = channel;
  }

  // Resolve partnerId for a chat thread by name (lazy lookup if missing)
  function resolvePartnerId(name, thread){
    if(thread && thread.partnerId) return thread.partnerId;
    const p = window.QX_PROFILES_BY_NAME[name];
    if(p){ if(thread) thread.partnerId = p.id; return p.id; }
    // Try matching across feedItems/requests for offer-derived threads
    for(const item of (window.feedItems||[])){
      for(const r of (item.requests||[])){
        if(r.name === name && r.senderId){
          if(thread) thread.partnerId = r.senderId;
          return r.senderId;
        }
      }
      if(item.owner === name && item.ownerId){
        if(thread) thread.partnerId = item.ownerId;
        return item.ownerId;
      }
    }
    return null;
  }

  // Hook into openChatByName to load real messages + subscribe
  if(typeof window.openChatByName === 'function'){
    const _origOpen = window.openChatByName;
    window.openChatByName = async function(name){
      _origOpen.call(this, name);
      const session = window.QX_SESSION; if(!session) return;
      const thread = chatThreads[name];
      if(!thread) return;
      const partnerId = resolvePartnerId(name, thread);
      if(!partnerId) return;
      const convo = thread.conversationId
        ? {id: thread.conversationId}
        : await findOrCreateConversation(session.user.id, partnerId, null);
      if(!convo) return;
      thread.conversationId = convo.id;
      const msgs = await loadConversationMessages(convo.id);
      thread.messages = msgs.map(m => ({side: m.sender_id===session.user.id ? 'self' : 'them', text:m.text, time:fmtTime(m.created_at)}));
      if(typeof renderChatScreen==='function') renderChatScreen(thread);
      subscribeToConversation(convo.id, session.user.id, name);
    };
  }

  // Override sendChatMessage to persist
  if(typeof window.sendChatMessage === 'function'){
    const _origSend = window.sendChatMessage;
    window.sendChatMessage = async function(){
      const session = window.QX_SESSION; if(!session){ _origSend.call(this); return; }
      const name = appState.activeChatName;
      const thread = chatThreads[name];
      const input = document.getElementById('chatComposeInput');
      const text = String(input?.value || '').trim();
      if(!text){ if(typeof showToast==='function') showToast('พิมพ์ข้อความก่อนส่ง'); return; }
      if(!thread){ _origSend.call(this); return; }
      const partnerId = resolvePartnerId(name, thread);
      // Optimistic UI
      _origSend.call(this);
      if(!partnerId){
        console.warn('chat send: no partnerId for', name, '— message saved locally only');
        if(typeof showToast==='function') showToast('แชทนี้ยังไม่มี partner ในระบบ');
        return;
      }
      try{
        const convo = thread.conversationId
          ? {id: thread.conversationId}
          : await findOrCreateConversation(session.user.id, partnerId, null);
        if(!convo) throw new Error('no convo');
        thread.conversationId = convo.id;
        const { error } = await SB.from('messages').insert({conversation_id:convo.id, sender_id:session.user.id, text});
        if(error) throw error;
        await SB.from('conversations').update({last_message:text, last_at:new Date().toISOString()}).eq('id', convo.id);
      } catch(e){
        console.warn('send msg failed:', e);
        if(typeof showToast==='function') showToast('ส่งข้อความผิดพลาด');
      }
    };
  }

  // 4. Submit Offer — override
  if(typeof window.submitRequestOffer === 'function'){
    const _origSubmit = window.submitRequestOffer;
    window.submitRequestOffer = async function(){
      const session = window.QX_SESSION;
      const item = (typeof currentDetailItem !== 'undefined') ? currentDetailItem : null;
      if(!session || !item || !item.listingId){ _origSubmit.call(this); return; }
      if(item.ownerId === session.user.id){
        if(typeof showToast==='function') showToast('โพสต์ของคุณเอง');
        return;
      }
      if(!selectedInventoryIds || !selectedInventoryIds.length){
        if(typeof showToast==='function') showToast('เลือกสินค้าที่จะใช้แลกก่อน');
        if(typeof setRequestStep==='function') setRequestStep(1);
        return;
      }
      const cash = Number(document.getElementById('requestCash').value || 0);
      const credit = Number(document.getElementById('requestCredit').value || 0);
      const note = document.getElementById('requestNote').value || '';
      const offerItems = (myInventory || []).filter(it => selectedInventoryIds.includes(it.id))
        .map(it => ({title:it.title, image_url:it.img||null, desc:it.desc||null}));
      try{
        const { error } = await SB.from('offers').insert({
          listing_id: item.listingId, sender_id: session.user.id,
          offer_items: offerItems, cash_amount: cash, credit_amount: credit, note: note || null
        });
        if(error){
          if((error.message||'').includes('duplicate') || error.code==='23505'){
            if(typeof showToast==='function') showToast('คุณส่งข้อเสนอนี้ไปแล้ว');
            if(typeof closeRequestSheet==='function') closeRequestSheet(false);
            return;
          }
          throw error;
        }
        // Run original to handle local UI update + close sheet + toast
        _origSubmit.call(this);
        await window.qxHydrate();
      } catch(e){
        console.error('offer error:', e);
        if(typeof showToast==='function') showToast('ส่งข้อเสนอผิดพลาด: '+(e.message||''));
      }
    };
  }

  // 5. Accept/Reject Offer — override applyDecisionToState
  if(typeof window.applyDecisionToState === 'function'){
    const _origApply = window.applyDecisionToState;
    window.applyDecisionToState = function(type, userName, targetTitle){
      const result = _origApply.call(this, type, userName, targetTitle);
      // Run DB update in background
      (async () => {
        try{
          const session = window.QX_SESSION; if(!session) return;
          // Find item & request to get offerId
          const item = feedItems.find(it => it.title === targetTitle);
          if(!item) return;
          const req = (item.requests||[]).find(r => r.name === userName);
          if(!req || !req.offerId) return;
          const check = (label, res) => { if(res && res.error){ console.error('decision '+label+':', res.error.message); if(typeof showToast==='function') showToast('บันทึกผิดพลาด: '+label); }};
          if(type === 'accept'){
            check('accept', await SB.from('offers').update({status:'accepted'}).eq('id', req.offerId));
            check('reject-others', await SB.from('offers').update({status:'rejected'})
              .eq('listing_id', item.listingId).neq('id', req.offerId).eq('status','pending'));
            const convo = await findOrCreateConversation(session.user.id, req.senderId, req.offerId);
            if(convo){
              check('sys-msg', await SB.from('messages').insert({
                conversation_id: convo.id, sender_id: session.user.id,
                text: 'ยอมรับข้อเสนอแล้ว — เริ่มแชทเพื่อตกลงนัดรับ'
              }));
              check('convo-update', await SB.from('conversations').update({
                last_message:'ยอมรับข้อเสนอแล้ว', last_at:new Date().toISOString()
              }).eq('id', convo.id));
            }
          } else if(type === 'reject'){
            check('reject', await SB.from('offers').update({status:'rejected'}).eq('id', req.offerId));
          } else if(type === 'complete'){
            check('complete', await SB.from('offers').update({status:'completed'}).eq('id', req.offerId));
          }
          // Re-hydrate to refresh inbox & notifications
          await window.qxHydrate();
        } catch(e){ console.warn('decision DB error:', e); }
      })();
      return result;
    };
  }

  // Trigger hydration if requested before script loaded
  if(window.qxNeedsHydrate){ window.qxNeedsHydrate=false; window.qxHydrate(); }
})();
</script>
`;

html = html.replace('</head>', headInject + '</head>');
html = html.replace('<body>', '<body>' + bodyTopInject + stubMissingEls);
html = html.replace('</body>', bodyBottomInject + '</body>');

fs.writeFileSync(DST, html);
console.log('Written', DST, 'size:', html.length);
