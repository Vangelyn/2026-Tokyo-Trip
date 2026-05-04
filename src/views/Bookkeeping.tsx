import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
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
  const [initialBudget, setInitialBudget] = useState(50000); // Default 5w TWD
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  
  // Rate: How much is 1 JPY in TWD. e.g. 0.21
  const [jpyToTwdRate, setJpyToTwdRate] = useState(0.21);

  useEffect(() => {
    if (!tripId || !user) return;

    // Fetch user trip member info for budget
    const fetchMember = async () => {
      try {
        const memberRef = doc(db, `trips/${tripId}/members/${user.uid}`);
        const memberDoc = await getDoc(memberRef);
        if (memberDoc.exists() && memberDoc.data().initialBudget) {
          setInitialBudget(memberDoc.data().initialBudget);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchMember();

    const q = query(
      collection(db, `trips/${tripId}/expenses`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exps: Expense[] = [];
      snapshot.forEach(doc => {
        exps.push({ id: doc.id, ...doc.data() } as Expense);
      });
      setExpenses(exps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/expenses`);
    });

    return () => unsubscribe();
  }, [tripId, user]);

  const handleUpdateBudget = async (newBudget: number) => {
    if (!tripId || !user) return;
    setInitialBudget(newBudget);
    setIsEditingBudget(false);
    try {
      await updateDoc(doc(db, `trips/${tripId}/members/${user.uid}`), {
        initialBudget: newBudget
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/members/${user.uid}`);
    }
  };

  const totalSpentTWD = expenses.reduce((acc, curr) => {
    const costInTWD = curr.currency === 'JPY' ? curr.amount * jpyToTwdRate : curr.amount;
    return acc + costInTWD;
  }, 0);

  const remaining = initialBudget - totalSpentTWD;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-emerald-500 pt-12 pb-6 px-6 text-white rounded-b-3xl shadow-sm z-10 relative">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">記帳本</h1>
          <div className="w-8 h-8"></div>
        </div>

        <div className="text-center mb-2">
          <p className="text-emerald-100 text-sm mb-1">剩餘預算 (TWD)</p>
          <div className="text-4xl font-bold tracking-tight">${Math.round(remaining).toLocaleString()}</div>
        </div>

        <div className="flex justify-between items-center mt-6 bg-emerald-600/50 p-4 rounded-2xl backdrop-blur-sm">
          <div className="flex-1 text-center">
            <p className="text-emerald-200 text-xs mb-1">總預算</p>
            {isEditingBudget ? (
              <input 
                type="number" 
                autoFocus
                defaultValue={initialBudget}
                onBlur={(e) => handleUpdateBudget(Number(e.target.value))}
                className="w-24 bg-white/20 text-white font-semibold rounded px-2 py-0.5 text-center appearance-none outline-none"
              />
            ) : (
              <div 
                onClick={() => setIsEditingBudget(true)}
                className="text-lg font-semibold flex items-center justify-center cursor-pointer gap-1"
              >
                ${initialBudget.toLocaleString()}
                <Edit3 className="w-3 h-3 text-emerald-300" />
              </div>
            )}
          </div>
          <div className="w-px h-8 bg-emerald-400/30"></div>
          <div className="flex-1 text-center">
             <p className="text-emerald-200 text-xs mb-1">已支出 (折合 TWD)</p>
             <div className="text-lg font-semibold">${Math.round(totalSpentTWD).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold text-gray-900">支出明細</h2>
          <div className="text-xs text-gray-400 font-medium bg-gray-200/50 px-2.5 py-1 rounded-full">
            匯率: 1 JPY = {jpyToTwdRate} TWD
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center text-gray-400 py-10 mt-10">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>目前尚無支出紀錄</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map(exp => {
              const cat = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[4];
              const Icon = cat.icon;
              return (
                <div key={exp.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", cat.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{exp.description || cat.label}</h4>
                      <p className="text-xs text-gray-400">{exp.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {exp.currency === 'JPY' ? '¥' : '$'}
                      {exp.amount.toLocaleString()}
                    </p>
                    {exp.currency === 'JPY' && (
                      <p className="text-[10px] text-gray-400">
                        (~NT${Math.round(exp.amount * jpyToTwdRate)})
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-8 right-6">
        <button 
          onClick={() => setShowAdd(true)}
          className="w-14 h-14 bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {showAdd && (
        <AddExpenseModal 
          onClose={() => setShowAdd(false)} 
          tripId={tripId!} 
          jpyToTwdRate={jpyToTwdRate}
        />
      )}
    </div>
  );
}

function AddExpenseModal({ onClose, tripId, jpyToTwdRate }: { onClose: () => void, tripId: string, jpyToTwdRate: number }) {
  const { user } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('JPY');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || !user) return;
    
    try {
      await addDoc(collection(db, `trips/${tripId}/expenses`), {
        amount: Number(amount),
        currency,
        category,
        description,
        date: format(new Date(), 'yyyy-MM-dd'),
        paidBy: user.uid,
        createdAt: Date.now()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/expenses`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom pb-safe">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">新增支出</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full bg-gray-50">
            <Trash2 className="w-5 h-5 opacity-0" /> {/* Just spacing visually, using close visually differently */}
            <span className="text-sm font-bold absolute right-8 top-8" onClick={onClose}>取消</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button 
              className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors", currency === 'JPY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              onClick={() => setCurrency('JPY')}
            >
              日幣 (JPY)
            </button>
            <button 
              className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors", currency === 'TWD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              onClick={() => setCurrency('TWD')}
            >
              台幣 (TWD)
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
             <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-400 mr-2">{currency === 'JPY' ? '¥' : '$'}</span>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-transparent text-4xl font-bold text-gray-900 outline-none appearance-none placeholder-gray-300"
                />
             </div>
             {currency === 'JPY' && amount && (
               <p className="text-xs text-gray-400 mt-2 font-medium">折合台幣約 NT$ {Math.round(Number(amount) * jpyToTwdRate)}</p>
             )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">類別</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-all", category === cat.id ? 'bg-emerald-50 scale-105 outline outline-2 outline-emerald-400' : 'bg-gray-50 grayscale hover:grayscale-0')}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", cat.color)}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-4">備註 (選填)</label>
             <input type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="例如：晚餐拉麵"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 transition-colors"
             />
          </div>

          <button 
            onClick={handleSave}
            disabled={!amount}
            className="w-full mt-6 bg-emerald-500 text-white font-bold text-lg rounded-xl py-4 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-gray-300"
          >
            儲存紀錄
          </button>
        </div>
      </div>
    </div>
  );
}
