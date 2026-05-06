import { useState, useEffect, ChangeEvent } from 'react';
import { ArrowDownUp, Globe, Loader2, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export function CurrencyConverter() {
  const { t } = useTranslation();
  const [targetCurrency, setTargetCurrency] = useState('JPY');
  const [foreignAmount, setForeignAmount] = useState('');
  const [twdAmount, setTwdAmount] = useState('');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState<'FOREIGN' | 'TWD'>('FOREIGN');
  const [showSelector, setShowSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/rates');
        const data = await res.json();
        if (data.rates) {
          setRates(data.rates);
        }
      } catch (error) {
        console.error('Failed to fetch rates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  const rate = rates[targetCurrency] || 0;

  useEffect(() => {
    if (rate === 0) return;

    if (base === 'FOREIGN') {
      const numTarget = parseFloat(foreignAmount);
      if (!isNaN(numTarget) && numTarget !== 0) {
        setTwdAmount((numTarget * rate).toFixed(2));
      } else if (foreignAmount === '') {
        setTwdAmount('');
      }
    } else {
      const numTwd = parseFloat(twdAmount);
      if (!isNaN(numTwd) && numTwd !== 0) {
        setForeignAmount((numTwd / rate).toFixed(2));
      } else if (twdAmount === '') {
        setForeignAmount('');
      }
    }
  }, [foreignAmount, twdAmount, rate, base, targetCurrency]); 

  const handleForeignChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBase('FOREIGN');
    setForeignAmount(e.target.value);
  };

  const handleTwdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBase('TWD');
    setTwdAmount(e.target.value);
  };

  const availableCurrencies = Object.keys(rates).filter(c => c !== 'TWD');
  const filteredCurrencies = availableCurrencies.filter(c => 
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-gray-400 font-medium tracking-widest">{t('Common.Loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-12 px-6 h-full flex flex-col bg-gray-50 relative overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('Exchange.Title')}</h1>
        <button 
           onClick={() => setShowSelector(true)}
           className="px-4 py-2 bg-white rounded-full shadow-sm text-sm font-black text-sky-600 border border-gray-100 flex items-center gap-2 active:scale-95 transition-all"
        >
          <Globe className="w-4 h-4" />
          {targetCurrency}
        </button>
      </div>

      <div className="bg-white rounded-[3rem] p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border-2 border-gray-50 flex flex-col items-center relative">
        <div className="w-full relative">
           <div className={cn("p-6 rounded-[2rem] border-2 transition-all flex justify-between items-center", base === 'FOREIGN' ? "border-sky-400 bg-sky-50 shadow-[0_10px_20px_-10px_rgba(56,189,248,0.2)]" : "border-transparent bg-gray-50")}>
              <div className="pr-6 border-r border-gray-200">
                <span className="text-2xl font-black text-gray-900 block">{targetCurrency}</span>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t('Exchange.SelectCurrency')}</span>
              </div>
              <input 
                 type="number"
                 placeholder="0"
                 value={foreignAmount}
                 onChange={handleForeignChange}
                 className="w-full text-right bg-transparent text-4xl font-bold text-gray-900 outline-none placeholder:text-gray-200"
              />
           </div>

           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white border-2 border-gray-50 shadow-xl rounded-2xl flex items-center justify-center z-10 text-sky-500 transform hover:rotate-180 transition-transform duration-500">
              <ArrowDownUp className="w-6 h-6" strokeWidth={3} />
           </div>

           <div className={cn("p-6 rounded-[2rem] border-2 transition-all flex justify-between items-center mt-4", base === 'TWD' ? "border-emerald-400 bg-emerald-50 shadow-[0_10px_20px_-10px_rgba(52,211,153,0.2)]" : "border-transparent bg-gray-50")}>
              <div className="pr-6 border-r border-gray-200">
                <span className="text-2xl font-black text-gray-900 block">TWD</span>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">台幣</span>
              </div>
              <input 
                 type="number"
                 placeholder="0"
                 value={twdAmount}
                 onChange={handleTwdChange}
                 className="w-full text-right bg-transparent text-4xl font-bold text-gray-900 outline-none placeholder:text-gray-200"
              />
           </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-50 w-full">
           <div className="flex flex-col items-center gap-2">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('Exchange.Rate')}</span>
             <div className="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
               <span className="text-gray-400 font-bold">1 {targetCurrency} = </span>
               <span className="text-sky-600 text-xl font-black">{rate.toFixed(4)}</span>
               <span className="text-gray-400 font-bold">TWD</span>
             </div>
           </div>
           <p className="text-[10px] text-gray-300 mt-4 text-center font-bold tracking-tight">資料來源：台灣銀行 (Bank of Taiwan)</p>
        </div>
      </div>

      {/* Currency Selector Modal */}
      {showSelector && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowSelector(false)} />
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-500">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">{t('Exchange.SelectCurrency')}</h2>
                <button onClick={() => setShowSelector(false)} className="text-gray-400 hover:text-gray-600 font-black">CLOSE</button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  type="text"
                  placeholder="Search currency..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-sky-400 font-medium transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2 px-8 pb-8">
              {filteredCurrencies.map(code => (
                <button
                  key={code}
                  onClick={() => {
                    setTargetCurrency(code);
                    setShowSelector(false);
                    setSearchQuery('');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all",
                    targetCurrency === code ? "bg-sky-50 text-sky-600 ring-2 ring-sky-400" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <span className="text-xl font-black">{code}</span>
                  <div className="text-right">
                    <span className="text-xs font-bold block opacity-60">Rate</span>
                    <span className="font-black">{(rates[code]).toFixed(4)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

