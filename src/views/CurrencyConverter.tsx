import { useState, useEffect, ChangeEvent } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { cn } from '../lib/utils';

export function CurrencyConverter() {
  const [jpy, setJpy] = useState('');
  const [twd, setTwd] = useState('');
  const [rate, setRate] = useState(0.21); // Default rate, e.g. 1 JPY = 0.21 TWD
  const [base, setBase] = useState<'JPY' | 'TWD'>('JPY');

  useEffect(() => {
    if (base === 'JPY') {
      const numJpy = parseFloat(jpy);
      if (!isNaN(numJpy)) {
        setTwd((numJpy * rate).toFixed(2));
      } else {
        setTwd('');
      }
    } else {
      const numTwd = parseFloat(twd);
      if (!isNaN(numTwd)) {
        setJpy((numTwd / rate).toFixed(2));
      } else {
        setJpy('');
      }
    }
  }, [jpy, twd, rate, base]);

  const handleJpyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBase('JPY');
    setJpy(e.target.value);
  };

  const handleTwdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBase('TWD');
    setTwd(e.target.value);
  };

  return (
    <div className="pt-12 px-6 h-full flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">匯率工具</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
        
        <div className="w-full relative">
           <div className={cn("p-4 rounded-2xl border-2 transition-colors flex justify-between items-center", base === 'JPY' ? "border-sky-400 bg-sky-50" : "border-transparent bg-gray-100")}>
              <div className="pr-4 border-r border-gray-200">
                <span className="text-xl font-bold text-gray-900 block">JPY</span>
                <span className="text-xs text-gray-500 font-medium">日幣</span>
              </div>
              <input 
                 type="number"
                 placeholder="0"
                 value={jpy}
                 onChange={handleJpyChange}
                 className="w-full text-right bg-transparent text-3xl font-bold text-gray-900 outline-none"
              />
           </div>

           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center z-10 text-gray-400">
              <ArrowDownUp className="w-5 h-5" />
           </div>

           <div className={cn("p-4 rounded-2xl border-2 transition-colors flex justify-between items-center mt-3", base === 'TWD' ? "border-emerald-400 bg-emerald-50" : "border-transparent bg-gray-100")}>
              <div className="pr-4 border-r border-gray-200">
                <span className="text-xl font-bold text-gray-900 block">TWD</span>
                <span className="text-xs text-gray-500 font-medium">台幣</span>
              </div>
              <input 
                 type="number"
                 placeholder="0"
                 value={twd}
                 onChange={handleTwdChange}
                 className="w-full text-right bg-transparent text-3xl font-bold text-gray-900 outline-none"
              />
           </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 w-full">
           <div className="flex justify-between items-center text-sm">
             <span className="text-gray-500 font-bold">目前匯率設定</span>
             <div className="flex items-center gap-2">
               <span className="text-gray-900 font-bold">1 JPY = </span>
               <input 
                 type="number" 
                 value={rate}
                 onChange={e => setRate(parseFloat(e.target.value) || 0.21)}
                 className="w-16 bg-gray-100 text-center rounded py-1 px-2 font-bold outline-none ring-1 ring-inset ring-transparent focus:ring-sky-400"
               />
               <span className="text-gray-900 font-bold">TWD</span>
             </div>
           </div>
           <p className="text-xs text-gray-400 mt-2 text-right">可點擊數字修改自訂匯率</p>
        </div>
      </div>
    </div>
  );
}
