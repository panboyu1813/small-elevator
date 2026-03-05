/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Cpu, 
  Settings, 
  ShieldCheck, 
  Info, 
  Layers, 
  Wrench, 
  Play, 
  ArrowUp, 
  ArrowDown, 
  Bell, 
  Eye,
  CheckCircle2,
  ChevronRight,
  Code2,
  Terminal,
  AlertTriangle,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
enum ElevatorStatus {
  IDLE = 'IDLE',
  MOVING_UP = 'MOVING_UP',
  MOVING_DOWN = 'MOVING_DOWN',
  ARRIVED = 'ARRIVED',
  DOOR_OPENING = 'DOOR_OPENING',
  DOOR_OPEN = 'DOOR_OPEN',
  DOOR_CLOSING = 'DOOR_CLOSING',
}

interface ElevatorState {
  currentFloor: number;
  targetFloor: number | null;
  status: ElevatorStatus;
  doorPosition: number; // 0 to 1
  queue: number[];
  isObstacleDetected: boolean;
}

interface BOMItem {
  category: string;
  name: string;
  count: number;
  usage: string;
}

// --- Constants ---
const BOM_DATA: BOMItem[] = [
  { category: '控制器', name: 'Arduino Uno / Nano', count: 1, usage: '系統邏輯運算與控制' },
  { category: '動力', name: '28BYJ-48 步進馬達 + ULN2003', count: 1, usage: '負責車廂升降定位' },
  { category: '動力', name: 'SG90 伺服馬達 (Servo)', count: 1, usage: '負責電梯門自動開關' },
  { category: '感測器', name: '紅外線避障感測器', count: 1, usage: '偵測門口障礙物（防夾）' },
  { category: '顯示', name: 'I2C LCD 1602 模組', count: 1, usage: '顯示樓層與狀態訊息' },
  { category: '輸入', name: '微動按鈕 (Push Button)', count: 10, usage: '樓層呼叫與選擇' },
  { category: '提示', name: '主動式蜂鳴器', count: 1, usage: '到達目標樓層提示音' },
];

const FEATURES = [
  { title: '外部呼叫', desc: '每層樓設有獨立按鈕，按下後電梯調度至該樓層。', icon: <Bell className="w-5 h-5" /> },
  { title: '內部選樓', desc: '電梯內設有 1-5 樓按鈕，進入後可選擇目標樓層。', icon: <Layers className="w-5 h-5" /> },
  { title: '智慧調度', desc: '系統依據「順向優先」原則自動規劃停靠順序。', icon: <Cpu className="w-5 h-5" /> },
  { title: '安全防護', desc: '整合紅外線避障感測器，實現「防夾功能」。', icon: <ShieldCheck className="w-5 h-5" /> },
];

// --- Components ---

const CodeBlock = ({ code }: { code: string }) => (
  <div className="bg-zinc-950 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto border border-zinc-800 shadow-inner">
    <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
      <Terminal className="w-4 h-4 text-emerald-500" />
      <span className="text-xs text-zinc-500 uppercase tracking-widest">Arduino Sketch</span>
    </div>
    <pre><code>{code}</code></pre>
  </div>
);

const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle?: string }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-emerald-500">
        {icon}
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{title}</h2>
    </div>
    {subtitle && <p className="text-zinc-500 text-sm ml-11">{subtitle}</p>}
  </div>
);

const ElevatorSim = () => {
  const [state, setState] = useState<ElevatorState>({
    currentFloor: 1,
    targetFloor: null,
    status: ElevatorStatus.IDLE,
    doorPosition: 0,
    queue: [],
    isObstacleDetected: false,
  });

  const addFloorToQueue = (floor: number) => {
    if (state.queue.includes(floor) || (Math.round(state.currentFloor) === floor && state.status === ElevatorStatus.IDLE)) return;
    setState(prev => ({ ...prev, queue: [...prev.queue, floor] }));
  };

  // Queue handling
  useEffect(() => {
    if (state.status === ElevatorStatus.IDLE && state.queue.length > 0) {
      const nextFloor = state.queue[0];
      setState(prev => ({
        ...prev,
        targetFloor: nextFloor,
        status: nextFloor > prev.currentFloor ? ElevatorStatus.MOVING_UP : ElevatorStatus.MOVING_DOWN,
        queue: prev.queue.slice(1)
      }));
    }
  }, [state.status, state.queue]);

  // Movement handling
  useEffect(() => {
    if (state.status === ElevatorStatus.MOVING_UP || state.status === ElevatorStatus.MOVING_DOWN) {
      const interval = setInterval(() => {
        setState(prev => {
          if (prev.targetFloor === null) return prev;
          
          const step = 0.05;
          const diff = prev.targetFloor - prev.currentFloor;
          
          if (Math.abs(diff) < step) {
            return { ...prev, currentFloor: prev.targetFloor, status: ElevatorStatus.ARRIVED };
          }
          
          return {
            ...prev,
            currentFloor: prev.currentFloor + (diff > 0 ? step : -step)
          };
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [state.status]);

  // Arrival handling
  useEffect(() => {
    if (state.status === ElevatorStatus.ARRIVED) {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, status: ElevatorStatus.DOOR_OPENING }));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [state.status]);

  // Door handling
  useEffect(() => {
    if (state.status === ElevatorStatus.DOOR_OPENING) {
      const interval = setInterval(() => {
        setState(prev => {
          if (prev.doorPosition >= 1) {
            clearInterval(interval);
            return { ...prev, status: ElevatorStatus.DOOR_OPEN };
          }
          return { ...prev, doorPosition: prev.doorPosition + 0.1 };
        });
      }, 50);
      return () => clearInterval(interval);
    }

    if (state.status === ElevatorStatus.DOOR_OPEN) {
      const timeout = setTimeout(() => {
        if (!state.isObstacleDetected) {
          setState(prev => ({ ...prev, status: ElevatorStatus.DOOR_CLOSING }));
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }

    if (state.status === ElevatorStatus.DOOR_CLOSING) {
      if (state.isObstacleDetected) {
        setState(prev => ({ ...prev, status: ElevatorStatus.DOOR_OPENING }));
        return;
      }
      const interval = setInterval(() => {
        setState(prev => {
          if (prev.doorPosition <= 0) {
            clearInterval(interval);
            return { ...prev, status: ElevatorStatus.IDLE, targetFloor: null };
          }
          return { ...prev, doorPosition: prev.doorPosition - 0.1 };
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [state.status, state.isObstacleDetected]);

  const floors = [5, 4, 3, 2, 1];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm sticky top-8">
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-emerald-500 text-[10px] uppercase tracking-widest mb-1 font-bold">System Status</h3>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-zinc-100 tracking-tighter">{Math.round(state.currentFloor)}F</span>
            <div className="flex flex-col text-[10px] font-mono text-zinc-500">
              <span className="text-emerald-500/80">{state.status}</span>
              {state.targetFloor && <span className="text-zinc-600">TARGET: {state.targetFloor}F</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className={`p-2 rounded-lg border transition-all ${state.isObstacleDetected ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-zinc-800 bg-zinc-950 text-zinc-700'}`}>
            <AlertTriangle size={16} />
          </div>
          <div className={`p-2 rounded-lg border transition-all ${state.status === ElevatorStatus.ARRIVED ? 'border-amber-500/50 text-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-950 text-zinc-700'}`}>
            <Bell size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Shaft Visualization */}
        <div className="col-span-4 relative h-[400px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
          {/* Floor Markers */}
          {floors.map(f => (
            <div 
              key={f} 
              className="absolute w-full border-t border-zinc-900/50 text-[8px] font-mono px-2 py-1 text-zinc-700"
              style={{ bottom: `${(f - 1) * 20}%` }}
            >
              {f}F
            </div>
          ))}

          {/* Elevator Car */}
          <motion.div 
            className="absolute left-0 right-0 px-2 z-10"
            animate={{ bottom: `${(state.currentFloor - 1) * 20}%` }}
            transition={{ type: 'tween', ease: 'linear', duration: 0 }}
            style={{ height: '20%' }}
          >
            <div className="w-full h-full bg-zinc-900 border border-zinc-700 rounded-lg flex flex-col relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              {/* Doors */}
              <div className="absolute inset-0 flex z-20">
                <div 
                  className="h-full bg-zinc-800 border-r border-zinc-700 transition-all duration-75"
                  style={{ width: `${50 - (state.doorPosition * 50)}%` }}
                />
                <div className="flex-1" />
                <div 
                  className="h-full bg-zinc-800 border-l border-zinc-700 transition-all duration-75"
                  style={{ width: `${50 - (state.doorPosition * 50)}%` }}
                />
              </div>
              <div className="m-auto text-zinc-800 z-10 opacity-30">
                <User size={20} />
              </div>
              {/* Internal Light */}
              <div className="absolute inset-0 bg-emerald-500/5 z-0" />
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="col-span-8 space-y-6">
          {/* External Call Buttons */}
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3 font-bold">External Call (Hall)</h4>
            <div className="grid grid-cols-5 gap-2">
              {floors.slice().reverse().map(f => (
                <button
                  key={`ext-${f}`}
                  onClick={() => addFloorToQueue(f)}
                  className={`h-10 rounded-lg border font-mono text-xs font-bold transition-all ${
                    state.queue.includes(f) || (state.targetFloor === f)
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Internal Selection Buttons */}
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3 font-bold">Internal Selection (Car)</h4>
            <div className="grid grid-cols-5 gap-2">
              {floors.slice().reverse().map(f => (
                <button
                  key={`int-${f}`}
                  onClick={() => addFloorToQueue(f)}
                  className={`h-10 rounded-full border font-mono text-xs font-bold transition-all ${
                    state.queue.includes(f) || (state.targetFloor === f)
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Safety Simulation */}
          <div className="pt-6 border-t border-zinc-800">
            <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3 font-bold">Safety Sensor (IR/Ultrasonic)</h4>
            <button
              onMouseDown={() => setState(prev => ({ ...prev, isObstacleDetected: true }))}
              onMouseUp={() => setState(prev => ({ ...prev, isObstacleDetected: false }))}
              onMouseLeave={() => setState(prev => ({ ...prev, isObstacleDetected: false }))}
              className={`w-full py-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-xs ${
                state.isObstacleDetected 
                  ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,44,44,0.3)]' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <AlertTriangle size={14} />
              {state.isObstacleDetected ? 'OBSTACLE DETECTED' : 'SIMULATE OBSTACLE'}
            </button>
            <p className="text-[9px] text-zinc-600 mt-3 italic text-center">
              Hold to simulate someone standing in the doorway.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Header / Hero */}
      <header className="relative border-b border-zinc-800 pt-20 pb-12 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold tracking-widest uppercase mb-6">
            <Settings className="w-3 h-3 animate-spin-slow" />
            Arduino Engineering Project
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-zinc-100 tracking-tighter mb-6">
            五層樓迷你<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">智慧電梯系統</span>
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl leading-relaxed">
            本專案旨在利用 Arduino 實作具備精準定位、自動門機構與安全感測的智慧電梯模型。
            結合步進馬達、伺服馬達與紅外線感測，模擬真實工業調度邏輯。
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Column: Documentation */}
          <div className="lg:col-span-7 space-y-24">
            
            {/* Features Section */}
            <section id="features">
              <SectionHeader 
                icon={<Box className="w-6 h-6" />} 
                title="系統功能" 
                subtitle="System Features & Capabilities" 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FEATURES.map((f, i) => (
                  <div key={i} className="group p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400 group-hover:text-emerald-500 transition-colors">
                      {f.icon}
                    </div>
                    <h4 className="text-zinc-100 font-bold mb-2">{f.title}</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* BOM Section */}
            <section id="bom">
              <SectionHeader 
                icon={<Info className="w-6 h-6" />} 
                title="零件清單" 
                subtitle="Bill of Materials (BOM)" 
              />
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/50 border-b border-zinc-800">
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">類別</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">零件名稱</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">數量</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">用途</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {BOM_DATA.map((item, i) => (
                      <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-emerald-500/70">{item.category}</td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-200">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-zinc-400">{item.count}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500">{item.usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Logic Section */}
            <section id="logic">
              <SectionHeader 
                icon={<Code2 className="w-6 h-6" />} 
                title="軟體邏輯架構" 
                subtitle="Arduino Firmware Logic & State Machine" 
              />
              <div className="space-y-6">
                <p className="text-zinc-500 text-sm leading-relaxed">
                  系統採用有限狀態機 (FSM) 設計，確保在處理多重請求與安全中斷時的穩定性。
                  核心包含按鈕掃描、LCD 更新、步進馬達精準位移與紅外線防夾偵測。
                </p>
                <CodeBlock code={`// 狀態機定義
enum State { IDLE, MOVING, ARRIVED, DOOR_OPEN, DOOR_CLOSE };

void loop() {
  checkButtons();      // 掃描所有按鈕
  updateDisplay();     // 更新 LCD 顯示
  
  switch(currentState) {
    case MOVING:
      moveElevator();  // 步進馬達精準位移
      if(reachedTarget()) currentState = ARRIVED;
      break;
      
    case DOOR_CLOSE:
      if(checkObstacle()) { // 紅外線防夾偵測
        openDoor(); 
        currentState = DOOR_OPEN;
      } else {
        closeDoor();
        if(doorFullyClosed()) currentState = IDLE;
      }
      break;
  }
}`} />
              </div>
            </section>

            {/* Mechanical Design Section */}
            <section id="mechanical">
              <SectionHeader 
                icon={<Wrench className="w-6 h-6" />} 
                title="核心機構設計" 
                subtitle="Mechanical Engineering & Stability" 
              />
              <div className="space-y-12">
                {/* Lifting System */}
                <div className="relative pl-8 border-l border-zinc-800">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                  <h3 className="text-xl font-bold text-zinc-100 mb-4">升降系統機構 (Lifting System)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-zinc-900/20 rounded-xl border border-zinc-800/50">
                      <h4 className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-2">驅動核心</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        採用步進馬達實現「數位化定位」。透過計算脈波數精確控制位移，誤差小於 0.1mm。
                      </p>
                    </div>
                    <div className="p-5 bg-zinc-900/20 rounded-xl border border-zinc-800/50">
                      <h4 className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-2">傳動方式</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        捲揚式滑輪搭配垂直導軌，確保車廂升降時的垂直度與靜音效果。
                      </p>
                    </div>
                  </div>
                </div>

                {/* Door System */}
                <div className="relative pl-8 border-l border-zinc-800">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                  <h3 className="text-xl font-bold text-zinc-100 mb-4">自動門機構 (Automatic Door)</h3>
                  <div className="p-6 bg-zinc-900/20 rounded-xl border border-zinc-800/50">
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      採用「伺服連桿機構」將旋轉運動轉化為直線平移。運動曲線接近正弦波，實現開關門的「緩啟緩停」。
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 曲柄 (Crank)</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 連桿 (Linkage)</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 門板 (Door)</span>
                    </div>
                  </div>
                </div>

                {/* Stability */}
                <div className="relative pl-8 border-l border-zinc-800">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                  <h3 className="text-xl font-bold text-zinc-100 mb-4">穩定性優化 (Optimization)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="text-emerald-500 font-bold text-xs mb-1">歸零校準</div>
                      <p className="text-[11px] text-zinc-500">1F 微動開關定義絕對零點，消除累積誤差。</p>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="text-emerald-500 font-bold text-xs mb-1">配重設計</div>
                      <p className="text-[11px] text-zinc-500">模擬真實電梯配重，降低馬達功耗與負擔。</p>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="text-emerald-500 font-bold text-xs mb-1">結構材質</div>
                      <p className="text-[11px] text-zinc-500">鋁擠型條支撐與 3D 列印滑動件，高剛性低噪音。</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column: Interactive Simulator */}
          <div className="lg:col-span-5">
            <ElevatorSim />
            
            <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
              <h4 className="text-emerald-500 font-bold text-sm mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                設計師筆記
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed italic">
                "在開發此系統時，我們特別注重『使用者體驗』。透過 SG90 伺服馬達的精確控制，我們實現了類似高級電梯的緩啟緩停動作。
                同時，步進馬達的數位化定位讓我們省去了在每層樓安裝感測器的繁瑣，大幅簡化了硬體結構並提升了可靠度。"
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-6 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-zinc-950 font-black italic">E</div>
            <span className="text-zinc-100 font-bold tracking-tight">Smart Elevator Pro</span>
          </div>
          <div className="text-zinc-500 text-xs font-mono">
            © 2026 Arduino Engineering Project Proposal
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-zinc-500 hover:text-emerald-500 transition-colors text-xs uppercase tracking-widest font-bold">Documentation</a>
            <a href="#" className="text-zinc-500 hover:text-emerald-500 transition-colors text-xs uppercase tracking-widest font-bold">Source Code</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
