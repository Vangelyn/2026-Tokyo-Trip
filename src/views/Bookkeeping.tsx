import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Plus, Receipt, Coffee, ShoppingBag, Train, Home, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  paidBy: string;
}

const CATEGORIES = [
  { id: 'food', label: '飲食', icon: Coffee, color: 'bg-orange-100 text-orange-500' },
  { id: 'transport', label: '交通', icon: Train, color: 'bg-blue-100 text-blue-500' },
  { id: 'shopping', label: '購物', icon: ShoppingBag, color: 'bg-purple-100 text-purple-500' },
  { id: 'accommodation', label: '住宿', icon: Home, color: 'bg-sky-100 text-sky-500' },
  { id: 'other', label: '其他', icon: Receipt, color: 'bg-gray-100 text-gray-500' },
];

export function Bookkeeping() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [initialBudget, setInitialBudget] = useState(50000);
  const [budgetCurrency, setBudgetCurrency] = useState('TWD');
  const [displayCurrency, setDisplayCurrency] = useState('TWD');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [jpyToTwdRate, setJpyToTwdRate] = useState(0.21);

  useEffect(() => {
    if (!tripId || !user) return;

    // Fetch shared trip budget
    const unsubscribeTrip = onSnapshot(doc(db, 'trips', tripId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.totalBudget !== undefined) {
          setInitialBudget(data.totalBudget);
        }
        if (data.budgetCurrency) {
          setBudgetCurrency(data.budgetCurrency);
          // Only auto-switch display currency once if it was default
          setDisplayCurrency(prev => (prev === 'TWD' && data.budgetCurrency === 'JPY') || (prev === 'JPY' && data.budgetCurrency === 'TWD') ? data.budgetCurrency : prev);
        }
      }
    });

    const q = query(
      collection(db, `trips/${tripId}/expenses`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeExpenses = onSnapshot(q, (snapshot) => {
      const exps: Expense[] = [];
      snapshot.forEach(doc => {
        exps.push({ id: doc.id, ...doc.data() } as Expense);
      });
      setExpenses(exps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/expenses`);
    });

    return () => {
      unsubscribeTrip();
      unsubscribeExpenses();
    };
  }, [tripId, user]);

  const handleUpdateBudget = async (newVal: string) => {
    if (!tripId || !user) return;
    const newBudget = Number(newVal);
    if (isNaN(newBudget) || newBudget <= 0) {
      setIsEditingBudget(false);
      return;
    }
    setInitialBudget(newBudget);
    setBudgetCurrency(displayCurrency);
    setIsEditingBudget(false);
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        totalBudget: newBudget,
        budgetCurrency: displayCurrency,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const convertedBudget = displayCurrency === budgetCurrency 
    ? initialBudget 
    : (budgetCurrency === 'JPY' && displayCurrency === 'TWD' 
        ? initialBudget * jpyToTwdRate 
        : initialBudget / jpyToTwdRate);

  const totalSpent = expenses.reduce((acc, curr) => {
    if (displayCurrency === 'TWD') {
       // Converted to TWD for sum
       const costInTWD = curr.currency === 'JPY' ? curr.amount * jpyToTwdRate : curr.amount;
       return acc + costInTWD;
    } else {
       // Converted to JPY for sum
       const costInJPY = curr.currency === 'TWD' ? curr.amount / jpyToTwdRate : curr.amount;
       return acc + costInJPY;
    }
  }, 0);

  const remaining = convertedBudget - totalSpent;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <div className="bg-emerald-500 pt-12 pb-6 px-6 text-white rounded-b-[2.5rem] shadow-lg z-20 relative shrink-0">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 active:scale-95 transition-transform backdrop-blur-md">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">預算記帳</h1>
          <button 
            onClick={() => setDisplayCurrency(prev => prev === 'JPY' ? 'TWD' : 'JPY')} 
            className="px-4 h-10 flex items-center justify-center rounded-full bg-white/20 text-sm font-bold font-mono tracking-wider transition-colors active:scale-95 border-2 border-white/30 hover:bg-white/30 backdrop-blur-md"
            title="切換顯示幣別"
          >
            {displayCurrency}
          </button>
        </div>

        <div className="text-center mb-4 transition-all">
          <p className="text-emerald-100 text-xs mb-1 font-bold uppercase tracking-widest opacity-80">剩餘預算 ({displayCurrency})</p>
          <div className="text-5xl font-black tracking-tighter px-6 py-3 bg-white/10 rounded-[2rem] inline-block border-2 border-white/20 shadow-inner">
            <span className="opacity-60 text-3xl mr-1">{displayCurrency === 'JPY' ? '¥' : '$'}</span>
            {Math.round(remaining).toLocaleString()}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 bg-white/10 p-4 rounded-[2rem] backdrop-blur-md border border-white/20">
          <div className="flex-1 text-center">
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">總預算</p>
            {isEditingBudget ? (
               <div className="flex flex-col items-center">
                  <input 
                    type="number" 
                    autoFocus
                    defaultValue={Math.round(convertedBudget)}
                    onBlur={(e) => handleUpdateBudget(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleUpdateBudget(e.currentTarget.value) }}
                    className="w-28 bg-white text-emerald-600 font-bold rounded-xl px-3 py-1.5 text-center appearance-none outline-none shadow-lg text-lg"
                  />
               </div>
            ) : (
              <div 
                onClick={() => setIsEditingBudget(true)}
                className="text-lg font-black flex items-center justify-center cursor-pointer gap-1.5 active:scale-95 transition-transform"
              >
                {displayCurrency === 'JPY' ? '¥' : '$'}{Math.round(convertedBudget).toLocaleString()}
                <Edit3 className="w-3.5 h-3.5 text-emerald-200" />
              </div>
            )}
          </div>
          <div className="w-px h-8 bg-white/20 mx-2"></div>
          <div className="flex-1 text-center">
             <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">累計支出</p>
             <div className="text-lg font-black">{displayCurrency === 'JPY' ? '¥' : '$'}{Math.round(totalSpent).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-32 z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold text-gray-900 border-l-4 border-emerald-500 pl-3">支出明細</h2>
          <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            匯率: 1 JPY = {jpyToTwdRate} TWD
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center text-gray-300 py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm">
            <Receipt className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="font-bold">目前尚無支出紀錄</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map(exp => {
              const cat = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[4];
              const Icon = cat.icon;
              return (
                <div 
                  key={exp.id} 
                  onClick={() => setEditingExpense(exp)}
                  className="bg-white p-4 rounded-3xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-50 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-colors", cat.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-0.5">{exp.description || cat.label}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{cat.label}</span>
                        <span className="text-[10px] text-gray-300 font-medium">{exp.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900 text-lg">
                      <span className="text-sm font-bold text-gray-400 mr-0.5">{exp.currency === 'JPY' ? '¥' : '$'}</span>
                      {exp.amount.toLocaleString()}
                    </p>
                    {exp.currency === 'JPY' && displayCurrency === 'TWD' && (
                      <p className="text-[10px] text-emerald-500 font-bold">
                        ≈ NT${Math.round(exp.amount * jpyToTwdRate).toLocaleString()}
                      </p>
                    )}
                    {exp.currency === 'TWD' && displayCurrency === 'JPY' && (
                      <p className="text-[10px] text-emerald-500 font-bold">
                        ≈ ¥{Math.round(exp.amount / jpyToTwdRate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Action Button */}
      <button 
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-[0_12px_25px_-10px_rgba(16,185,129,0.5)] active:scale-90 transition-all z-[60] border-t border-white/20 active:translate-y-1"
      >
        <Plus className="w-8 h-8" strokeWidth={3} />
      </button>

      {(showAdd || editingExpense) && (
        <ExpenseModal 
          expense={editingExpense}
          onClose={() => { setShowAdd(false); setEditingExpense(null); }} 
          tripId={tripId!} 
          jpyToTwdRate={jpyToTwdRate}
        />
      )}
    </div>
  );
}

function ExpenseModal({ expense, onClose, tripId, jpyToTwdRate }: { expense?: Expense | null, onClose: () => void, tripId: string, jpyToTwdRate: number }) {
  const { user } = useContext(AuthContext);
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [currency, setCurrency] = useState(expense?.currency || 'JPY');
  const [category, setCategory] = useState(expense?.category || 'food');
  const [description, setDescription] = useState(expense?.description || '');

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || !user) return;
    
    try {
      if (expense) {
        await updateDoc(doc(db, `trips/${tripId}/expenses/${expense.id}`), {
          amount: Number(amount),
          currency,
          category,
          description,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, `trips/${tripId}/expenses`), {
          amount: Number(amount),
          currency,
          category,
          description,
          date: format(new Date(), 'yyyy-MM-dd'),
          paidBy: user.uid,
          createdAt: Date.now()
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, expense ? OperationType.UPDATE : OperationType.CREATE, `trips/${tripId}/expenses`);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    if (!confirm('確定要刪除這筆紀錄嗎？')) return;
    try {
      await deleteDoc(doc(db, `trips/${tripId}/expenses/${expense.id}`));
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/expenses/${expense.id}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto pb-safe">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-gray-900">{expense ? '編輯支出' : '新增支出'}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 font-bold hover:bg-gray-200 transition-colors">✕</button>
        </div>

        <div className="space-y-6">
          <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[1.5rem]">
            <button 
              className={cn("flex-1 py-3 text-sm font-black rounded-2xl transition-all", currency === 'JPY' ? 'bg-white text-emerald-600 shadow-sm scale-100' : 'text-gray-400 font-bold')}
              onClick={() => setCurrency('JPY')}
            >
              日幣 (JPY)
            </button>
            <button 
              className={cn("flex-1 py-3 text-sm font-black rounded-2xl transition-all", currency === 'TWD' ? 'bg-white text-emerald-600 shadow-sm scale-100' : 'text-gray-400 font-bold')}
              onClick={() => setCurrency('TWD')}
            >
              台幣 (TWD)
            </button>
          </div>

          <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border-2 border-gray-100 focus-within:border-emerald-400 transition-colors shadow-inner">
             <div className="flex items-center">
                <span className="text-3xl font-black text-emerald-300 mr-3">{currency === 'JPY' ? '¥' : '$'}</span>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-transparent text-5xl font-black text-gray-900 outline-none appearance-none placeholder-gray-200"
                />
             </div>
             {currency === 'JPY' && amount && (
               <p className="text-xs text-emerald-500 mt-3 font-black bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">折合台幣約 NT$ {Math.round(Number(amount) * jpyToTwdRate).toLocaleString()}</p>
             )}
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">類別選擇</label>
            <div className="grid grid-cols-5 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn("flex flex-col items-center gap-2 p-2 rounded-2xl transition-all border-2", category === cat.id ? 'bg-emerald-50 border-emerald-400 scale-105 shadow-sm' : 'bg-white border-transparent grayscale opacity-50 hover:grayscale-0 hover:opacity-100')}
                >
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shadow-sm", cat.color)}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-gray-600">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-2">支出原因</label>
             <input type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="例如：敘敘苑燒肉、LAWSON 零食"
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-inner"
             />
          </div>

          <div className="flex gap-3 pt-6">
            {expense && (
              <button 
                onClick={handleDelete}
                className="w-16 h-16 flex items-center justify-center text-red-500 bg-red-50 border-2 border-red-100 rounded-3xl hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={!amount}
              className="flex-1 bg-emerald-500 text-white font-black text-xl rounded-[2rem] py-5 shadow-[0_8px_0_0_rgb(5,150,105)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              {expense ? '確認修正' : '儲存紀錄'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
