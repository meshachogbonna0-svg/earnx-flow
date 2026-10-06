import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import {ShieldCheck,LogOut,Save,Users,Wallet,Settings,Video,ClipboardList,Wrench,Landmark,Megaphone,Gift,RefreshCw,Search,CheckCircle2} from "lucide-react";
import "./styles.css";

const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
const supabase=url&&key?createClient(url,key):null;

type AnyRow=Record<string,any>;
const money=(n:any)=>`₦${Number(n||0).toLocaleString("en-NG")}`;

const normalizeTapLevel=(level:AnyRow={})=>{
 const normalized={...level};
 const sessionDuration=Number(normalized.session_duration ?? normalized.tap_session_duration ?? normalized.session_minutes ?? 3);
 const rewardPerTap=Number(normalized.reward_per_tap ?? normalized.reward ?? 10);
 const cooldownDuration=Number(normalized.cooldown_duration ?? normalized.cooldown_hours ?? normalized.cooldown_minutes ?? 6);
 const cooldownUnit=(normalized.cooldown_unit ?? (normalized.cooldown_hours !== undefined ? "hours" : normalized.cooldown_minutes !== undefined ? "minutes" : "hours"));
 const tapEnabled=normalized.tap_earn_enabled ?? normalized.enabled ?? normalized.is_active ?? true;
 const maxSessions=Number(normalized.max_sessions_per_day ?? 0);

 return {
  ...normalized,
  name: normalized.name || `Level ${normalized.level ?? 0}`,
  session_duration: Number.isFinite(sessionDuration) && sessionDuration > 0 ? sessionDuration : 3,
  reward_per_tap: Number.isFinite(rewardPerTap) && rewardPerTap >= 0 ? rewardPerTap : 10,
  cooldown_duration: Number.isFinite(cooldownDuration) && cooldownDuration >= 0 ? cooldownDuration : 6,
  cooldown_unit: cooldownUnit,
  tap_earn_enabled: !!tapEnabled,
  max_sessions_per_day: Number.isFinite(maxSessions) ? maxSessions : 0,
 };
};

function App(){
 const [loading,setLoading]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState<any>(null);
 const [section,setSection]=useState("overview"),[settings,setSettings]=useState<AnyRow>({});
 const [levels,setLevels]=useState<AnyRow[]>([]),[videos,setVideos]=useState<AnyRow[]>([]),[questionnaires,setQuestionnaires]=useState<AnyRow[]>([]);
 const [users,setUsers]=useState<AnyRow[]>([]),[search,setSearch]=useState(""),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const [selectedLevelIndex,setSelectedLevelIndex]=useState(0);
 const [saveState,setSaveState]=useState<{status:"idle"|"saving"|"success"|"error"; message:string}>({status:"idle",message:""});

 useEffect(()=>{void boot()},[]);

 async function boot(){
  if(!supabase){setMessage("Missing Supabase configuration.");setLoading(false);return}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setLoading(false);return}
  setSession(session);
  const {data:ok,error}=await supabase.rpc("ensure_admin_role");
  if(error||ok!==true){setMessage(error?.message||"This account does not have admin access.");setLoading(false);return}
  const [{data:s},{data:lv},{data:vid},{data:qs},{data:us}]=await Promise.all([
   supabase.from("platform_settings").select("*").maybeSingle(),
   supabase.from("levels").select("*").order("level"),
   supabase.from("videos").select("*").order("created_at",{ascending:false}).limit(100),
   supabase.from("questionnaires").select("*").order("sort_order"),
   supabase.from("profiles").select("id,username,first_name,email,balance,pending_balance,level,activation,account_status,total_earned,total_withdrawn").order("created_at",{ascending:false}).limit(200)
  ]);
  const next={...(s||{})}; next.supported_banks_text=Array.isArray(next.supported_banks)?next.supported_banks.join(", "):"";
  setSettings(next);
  setLevels((lv||[]).map(normalizeTapLevel));
  setVideos(vid||[]);setQuestionnaires(qs||[]);setUsers(us||[]);setAllowed(true);setLoading(false);
 }

 async function saveSettings(){
  if(!supabase)return;setSaving(true);
  const payload={...settings}; payload.supported_banks=String(payload.supported_banks_text||"").split(",").map(x=>x.trim()).filter(Boolean);delete payload.supported_banks_text;
  const {data,error}=await supabase.rpc("admin_update_platform_settings",{_settings:payload});
  setSaving(false);setMessage(error?.message||((data as any)?.ok?"Settings saved successfully.":"Settings could not be saved."));
 }

 async function saveLevel(l:AnyRow){
  if(!supabase)return;
  const {error}=await supabase.from("levels").update({
   name:l.name,upgrade_price:Number(l.upgrade_price),reward_per_tap:Number(l.reward_per_tap),
   battery_capacity:Number(l.battery_capacity),daily_tap_limit:Number(l.daily_tap_limit),
   daily_earnings_limit:Number(l.daily_earnings_limit),daily_recharge_limit:Number(l.daily_recharge_limit),
   max_withdrawal:Number(l.max_withdrawal),min_withdrawal:Number(l.min_withdrawal),
   daily_withdrawal_limit:Number(l.daily_withdrawal_limit),max_withdrawals_per_day:Number(l.max_withdrawals_per_day),
   unlimited_battery:!!l.unlimited_battery,benefits:l.benefits
  }).eq("level",l.level);
  setMessage(error?.message||`Level ${l.level} saved.`);
 }

 async function saveVideo(v:AnyRow){
  if(!supabase)return;
  const {error}=await supabase.from("videos").update({title:v.title,url:v.url,reward:Number(v.reward),active:v.active,watch_time:Number(v.watch_time||0)}).eq("id",v.id);
  setMessage(error?.message||"Video saved.");
 }

 const filteredUsers=useMemo(()=>users.filter(u=>JSON.stringify(u).toLowerCase().includes(search.toLowerCase())),[users,search]);
 const nav=[
  ["overview",Users,"Overview"],["users",Users,"Users"],["levels",Settings,"Levels & Rewards"],
  ["withdrawals",Wallet,"Withdrawals"],["activation",Gift,"Activation & Upgrade"],
  ["bonus",Gift,"Welcome Bonus"],["questionnaire",ClipboardList,"Questionnaires"],
  ["banners",Megaphone,"Banners & Promotions"],["videos",Video,"Videos"],
  ["banks",Landmark,"Bank & Payout"],["maintenance",Wrench,"Maintenance"]
 ];
 const set=(k:string,v:any)=>setSettings((x:any)=>({...x,[k]:v}));
 const field=(label:string,key:string,type="text")=><label><span>{label}</span><input type={type} value={settings[key]??""} onChange={e=>set(key,type==="number"?Number(e.target.value):e.target.value)}/></label>;
 const selectedLevel=levels[selectedLevelIndex] || normalizeTapLevel(levels[0] || {});

 const updateSelectedLevel=(key:string,value:any)=>{
  setLevels((items:any[])=>items.map((level,index)=>index===selectedLevelIndex?{...normalizeTapLevel(level),[key]:value}:level));
  setSaveState({status:"idle",message:""});
 };

 const validateSelectedLevel=()=>{
  if(!selectedLevel) return "Please select a level before saving.";
  if(!Number.isFinite(Number(selectedLevel.session_duration)) || Number(selectedLevel.session_duration)<=0){
   return "Tap session duration must be greater than 0 minutes.";
  }
  if(!Number.isFinite(Number(selectedLevel.reward_per_tap)) || Number(selectedLevel.reward_per_tap)<0){
   return "Reward per tap must be 0 or more.";
  }
  if(!Number.isFinite(Number(selectedLevel.cooldown_duration)) || Number(selectedLevel.cooldown_duration)<0){
   return "Cooldown duration must be 0 or more.";
  }
  return "";
 };

 async function saveSelectedLevel(){
  const validationMessage=validateSelectedLevel();
  if(validationMessage){
   setSaveState({status:"error",message:validationMessage});
   return;
  }

  if(!supabase){
   setSaveState({status:"success",message:"Supabase is not configured. The Tap & Earn settings have been updated in the admin UI preview."});
   return;
  }

  setSaveState({status:"saving",message:"Saving Tap & Earn settings..."});

  const level=normalizeTapLevel(selectedLevel);
  const payload:any={
   name:level.name,
   reward_per_tap:Number(level.reward_per_tap||0),
   session_duration:Number(level.session_duration||0),
   cooldown_duration:Number(level.cooldown_duration||0),
   cooldown_unit:level.cooldown_unit||"hours",
   tap_earn_enabled:!!level.tap_earn_enabled,
   max_sessions_per_day:Number(level.max_sessions_per_day||0),
  };

  try {
   const {error}=await supabase.from("levels").update(payload).eq("level",level.level);
   if(error){
    setSaveState({status:"error",message:error.message||"Unable to save this level's Tap & Earn configuration."});
    return;
   }
   setSaveState({status:"success",message:`Level ${level.level} saved successfully.`});
  } catch (error) {
   const err=error as Error;
   setSaveState({status:"error",message:err?.message||"Unable to save this level's Tap & Earn configuration."});
  }
 }

 if(loading)return <div className="center">Loading EarnX Admin…</div>;
 if(!session)return <div className="center"><div className="login card"><ShieldCheck/><h1>EarnX Control Center</h1><p>Administrator sign-in</p><button onClick={async()=>{const email=prompt("Admin email"); const password=prompt("Admin password"); if(!email||!password)return; const {error}=await supabase!.auth.signInWithPassword({email,password}); if(error) alert(error.message); else location.reload();}}>Continue</button></div></div>;
 if(!allowed)return <div className="center"><div className="card"><ShieldCheck/><h2>Access denied</h2><p>{message}</p></div></div>;

 return <div className="app">
  <aside><div className="brand"><ShieldCheck/> <span>EarnX<br/><small>Control Center</small></span></div>
   {nav.map(([id,I,label])=><button key={id as string} className={section===id?"active":""} onClick={()=>setSection(id as string)}><I/><span>{label}</span></button>)}
   <button onClick={()=>void boot()}><RefreshCw/><span>Refresh data</span></button>
   <button className="logout" onClick={()=>supabase?.auth.signOut().then(()=>location.reload())}><LogOut/><span>Sign out</span></button>
  </aside>
  <main><header><div><h1>{nav.find(n=>n[0]===section)?.[2]}</h1><p>Everything important in your EarnX platform, in one place.</p></div>{["overview","users"].includes(section)?null:<button className="top-save" onClick={()=>{if(section==="levels"){void saveSelectedLevel();} else {void saveSettings();}}}><Save/><span>{section==="levels"?"Save changes":"Save"}</span></button>}</header>
   {message&&<div className="notice">{message}</div>}

   {section==="overview"&&<><div className="stats"><div className="card"><Users/><b>{users.length}</b><span>Loaded users</span></div><div className="card"><Wallet/><b>{money(users.reduce((a,u)=>a+Number(u.balance||0),0))}</b><span>Total user balances</span></div><div className="card"><Gift/><b>{levels.length}</b><span>EarnX levels</span></div><div className="card"><CheckCircle2/><b>{Math.max(0,users.filter(u=>u.activation===true||u.activation==="active").length)}</b><span>Activated users</span></div></div></>}

   {section==="users"&&<div className="card"><div className="toolbar"><div className="search"><Search/><input placeholder="Search username, name or email…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="users-list">{filteredUsers.map(u=><div className="user-row" key={u.id}><div><strong>{u.username||u.first_name||"Unknown user"}</strong><small>{u.email}</small></div><div className="meta"><span>Level {u.level||0}</span><span>{u.account_status||"Active"}</span><span>{money(u.balance||0)}</span></div></div>)}</div></div>}

   {section==="levels"&&selectedLevel&&<div className="tap-config">
    <div className="tap-panel">
     <div className="tap-topbar">
      <div>
       <p className="eyebrow">Tap & Earn Settings</p>
       <h3>Configure the new session-based Tap & Earn model</h3>
      </div>
     </div>

     <div className="tap-level-picker">
      <label>
       <span>Select Level</span>
       <select value={selectedLevelIndex} onChange={e=>setSelectedLevelIndex(Number(e.target.value))}>
        {levels.map((level,index)=><option key={level.id || index} value={index}>{level.name || `Level ${level.level}`}</option>)}
       </select>
      </label>
     </div>

     <div className="tap-grid">
      <label className="field">
       <span>Tap & Earn Enabled</span>
       <button type="button" className={`tap-toggle ${selectedLevel.tap_earn_enabled?"is-on":"is-off"}`} onClick={()=>updateSelectedLevel("tap_earn_enabled",!selectedLevel.tap_earn_enabled)}>
        <span className="tap-toggle-knob" />
        <small>{selectedLevel.tap_earn_enabled?"ON":"OFF"}</small>
       </button>
      </label>

      <label className="field">
       <span>Tap Session Duration</span>
       <div className="input-with-unit">
        <input type="number" min="1" step="1" value={selectedLevel.session_duration ?? 3} onChange={e=>updateSelectedLevel("session_duration",Number(e.target.value)||0)} />
        <span>Minutes</span>
       </div>
      </label>

      <label className="field">
       <span>Reward Per Tap</span>
       <div className="input-with-prefix">
        <span>₦</span>
        <input type="number" min="0" step="0.01" value={selectedLevel.reward_per_tap ?? 0} onChange={e=>updateSelectedLevel("reward_per_tap",Number(e.target.value)||0)} />
       </div>
      </label>

      <label className="field">
       <span>Cooldown After Session</span>
       <div className="input-with-unit">
        <input type="number" min="0" step="1" value={selectedLevel.cooldown_duration ?? 6} onChange={e=>updateSelectedLevel("cooldown_duration",Number(e.target.value)||0)} />
        <select value={selectedLevel.cooldown_unit || "hours"} onChange={e=>updateSelectedLevel("cooldown_unit",e.target.value)}>
         <option value="hours">Hours</option>
         <option value="minutes">Minutes</option>
        </select>
       </div>
      </label>

      <label className="field">
       <span>Maximum Sessions Per Day</span>
       <input type="number" min="0" step="1" value={selectedLevel.max_sessions_per_day ?? 0} onChange={e=>updateSelectedLevel("max_sessions_per_day",Number(e.target.value)||0)} />
      </label>
     </div>

     <div className="tap-actions">
      <button className="save-button" onClick={()=>void saveSelectedLevel()} disabled={saveState.status==="saving"}>
       {saveState.status==="saving"?"Saving...":"Save Changes"}
      </button>
     </div>

     {saveState.message&&<div className={`notice notice-${saveState.status}`}>{saveState.message}</div>}

     <div className="tap-summary">
      <h4>{selectedLevel.name || `Level ${selectedLevel.level}`} Tap Session</h4>
      <div className="summary-row"><span>Session</span><strong>{Number(selectedLevel.session_duration || 0)} minutes</strong></div>
      <div className="summary-row"><span>Reward</span><strong>₦{Number(selectedLevel.reward_per_tap || 0).toFixed(2)} per tap</strong></div>
      <div className="summary-row"><span>Cooldown</span><strong>{Number(selectedLevel.cooldown_duration || 0)} {selectedLevel.cooldown_unit || "hours"}</strong></div>
      <div className="summary-row"><span>Status</span><strong>{selectedLevel.tap_earn_enabled?"Enabled":"Disabled"}</strong></div>
     </div>
    </div>
   </div>}

   {section==="withdrawals"&&<div className="card form">{field("Minimum withdrawal","min_withdrawal","number")}{field("Maximum withdrawal","max_withdrawal","number")}{field("Daily withdrawal limit","daily_withdrawal_limit","number")}{field("Withdrawal processing time","withdrawal_processing_time")}</div>}

   {section==="activation"&&<div className="card form">{field("Activation price","activation_price","number")}{field("Activation processing time","activation_processing_time")}{field("Activation fee note","activation_fee_note")}</div>}

   {section==="bonus"&&<div className="card form"><h3>Welcome Bonus</h3>{field("Welcome bonus amount","welcome_bonus","number")}{field("Bonus condition / requirement","questionnaire_bonus_condition")}</div>}

   {section==="questionnaire"&&<div className="grid">{questionnaires.map((q,i)=><div className="card form" key={q.id}><h3>{q.title}</h3><label><span>Title</span><input value={q.title||""} onChange={e=>setQuestionnaires(xs=>xs.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/></label><label><span>Sort order</span><input type="number" value={q.sort_order??0} onChange={e=>setQuestionnaires(xs=>xs.map((x,j)=>j===i?{...x,sort_order:Number(e.target.value)}:x))}/></label><button className="primary" onClick={()=>void saveLevel(q)}>Save</button></div>)}</div>}

   {section==="banners"&&<div className="card form"><h3>Banner & Promotion Center</h3>{field("Main banner title","banner_title")}{field("Main banner subtitle","banner_subtitle")}{field("Banner CTA label","banner_cta_label")}{field("Banner CTA link","banner_cta_link")}</div>}

   {section==="videos"&&<div className="grid">{videos.map((v,i)=><div className="card form" key={v.id}><h3>{v.title}</h3><label><span>Title</span><input value={v.title||""} onChange={e=>setVideos([...videos.slice(0,i),{...v,title:e.target.value},...videos.slice(i+1)])}/></label><label><span>URL</span><input value={v.url||""} onChange={e=>setVideos([...videos.slice(0,i),{...v,url:e.target.value},...videos.slice(i+1)])}/></label><label><span>Reward</span><input type="number" value={v.reward||0} onChange={e=>setVideos([...videos.slice(0,i),{...v,reward:Number(e.target.value)},...videos.slice(i+1)])}/></label><button className="primary" onClick={()=>void saveVideo(v)}>Save</button></div>)}</div>}

   {section==="banks"&&<div className="card form">{field("Supported banks (comma separated)","supported_banks_text")}<p className="hint">Users can use the searchable bank selector on the main website.</p></div>}
   {section==="maintenance"&&<div className="card form">{field("Maintenance message","maintenance_message")}<label className="check"><input type="checkbox" checked={settings.maintenance_enabled===true} onChange={e=>set("maintenance_enabled",e.target.checked)}/><span>Maintenance mode enabled</span></label></div>}
  </main></div>;
}
createRoot(document.getElementById("root")!).render(<App/>);


































































































































































































































































































































