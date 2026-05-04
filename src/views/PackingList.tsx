import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Check, Plus, Trash2, Edit2, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

// We import DEFAULT_ITEMS from inside since it's long. I'll just use what was already here.

interface PackingItem {
  id: string;
  category: string;
  name: string;
  checked: boolean;
  userId: string; 
  quantity?: number;
}

const DEFAULT_ITEMS: Omit<PackingItem, 'id' | 'checked' | 'userId'>[] = [
  { category: '重要物品類', name: '網路(ESIM)' }, { category: '重要物品類', name: '保險(旅平/不便險)' }, { category: '重要物品類', name: '護照/日鈔/交通卡' },
  { category: '隨身小物', name: '護唇/護手霜' }, { category: '隨身小物', name: '雨傘/雨衣' }, { category: '隨身小物', name: '充氣頸枕' },
  { category: '環保類', name: '水壺(飲料提袋)' }, { category: '環保類', name: '環保袋' },
  { category: '3C類', name: '行動電源' }, { category: '3C類', name: '充電線材' },
  { category: '衣物類', name: '上衣', quantity: 1 }, { category: '衣物類', name: '下身', quantity: 1 }, { category: '衣物類', name: '內衣褲', quantity: 1 }, { category: '衣物類', name: '襪子', quantity: 1 },
  { category: '換季保暖衣物類', name: '發熱衣', quantity: 1 }, { category: '換季保暖衣物類', name: '防風外套', quantity: 1 },
  { category: '洗漱保養類', name: '牙刷' }, { category: '洗漱保養類', name: '卸妝棉' },
  { category: '外出類', name: '防曬乳' }, { category: '外出類', name: '防蚊液' },
  { category: '化妝類', name: '粉底&刷' }, { category: '化妝類', name: '口紅' },
  { category: '旅行備用小物', name: '塑膠袋' }, { category: '旅行備用小物', name: '濕紙巾' }
];

export function PackingList() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState<PackingItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('其他');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  useEffect(() => {
    if (!tripId || !user) return;
    const q = query(collection(db, `trips/${tripId}/packing`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: PackingItem[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as PackingItem);
      });
      setItems(fetched);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/packing`);
    });
    return () => unsubscribe();
  }, [tripId, user]);

  const loadDefaults = async () => {
    if (!user || !tripId) return;
    try {
      const batch = [];
      for (const item of DEFAULT_ITEMS) {
         batch.push(
           addDoc(collection(db, `trips/${tripId}/packing`), {
             category: item.category,
             name: item.name,
             checked: false,
             quantity: item.quantity || 1,
             userId: user.uid,
             createdAt: Date.now()
           })
         );
      }
      await Promise.all(batch);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `trips/${tripId}/packing`);
    }
  };

  const toggleItem = async (item: PackingItem) => {
    try {
      await updateDoc(doc(db, `trips/${tripId}/packing/${item.id}`), {
        checked: !item.checked
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/packing`);
    }
  };

  const updateQuantity = async (item: PackingItem, delta: number) => {
    try {
      const newQty = Math.max(1, (item.quantity || 1) + delta);
      await updateDoc(doc(db, `trips/${tripId}/packing/${item.id}`), {
        quantity: newQty
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/packing`);
    }
  };

  const saveEditName = async (item: PackingItem) => {
     if (!editingName.trim() || editingName === item.name) {
        setEditingId(null);
        return;
     }
     try {
        await updateDoc(doc(db, `trips/${tripId}/packing/${item.id}`), {
           name: editingName.trim()
        });
        setEditingId(null);
     } catch(e) {
        handleFirestoreError(e, OperationType.UPDATE, `trips/${tripId}/packing`);
     }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, `trips/${tripId}/packing/${id}`));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/packing`);
    }
  };

  const addItem = async () => {
    if (!newItemName.trim() || !user) return;
    try {
      await addDoc(collection(db, `trips/${tripId}/packing`), {
        category: newItemCat,
        name: newItemName.trim(),
        checked: false,
        quantity: 1,
        userId: user.uid,
        createdAt: Date.now()
      });
      setNewItemName('');
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/packing`);
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));
  const progress = items.length === 0 ? 0 : Math.round((items.filter(i => i.checked).length / items.length) * 100);

  return (
    <div className="flex flex-col h-full bg-green-50">
      <div className="bg-green-500 pt-12 pb-6 px-6 text-white rounded-b-[2rem] shadow-sm z-10 relative">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-95 transition-transform">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">行李清單</h1>
          <div className="w-10 h-10"></div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2 font-bold">
             <span>完成進度</span>
             <span>{progress}%</span>
          </div>
          <div className="w-full h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm shadow-inner border border-white/10">
             <div className="h-full bg-yellow-400 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-8">
        {items.length === 0 ? (
          <div className="text-center py-10 mt-10 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
              <Check className="w-8 h-8 text-green-500" />
            </div>
             <p className="text-gray-500 mb-6 font-bold">清單空空如也！</p>
             <button onClick={loadDefaults} className="bg-yellow-400 text-gray-900 border-2 border-yellow-500 font-black px-6 py-3 rounded-full hover:bg-yellow-500 active:translate-y-1 shadow-[0_4px_0_0_rgb(234,179,8)] active:shadow-none transition-all">
               自動載入建議範本
             </button>
          </div>
        ) : (
          <div>
            {categories.map(cat => {
               const catItems = items.filter(i => i.category === cat);
               const isClothing = cat === '衣物類' || cat === '換季保暖衣物類';
               return (
                 <div key={cat} className="mb-6">
                   <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest ml-4 mb-2 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                     {cat}
                   </h3>
                   <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] border-2 border-gray-100">
                     {catItems.map((item, idx, arr) => (
                       <div key={item.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3", idx !== arr.length - 1 && "border-b border-gray-50")}>
                         
                         <div className="flex items-center flex-1 pr-4">
                            <button 
                              onClick={() => toggleItem(item)}
                              className={cn("w-7 h-7 rounded border-2 flex items-center justify-center mr-3 transition-colors shrink-0", item.checked ? "bg-green-500 border-green-500 text-white" : "border-gray-300 bg-gray-50")}
                            >
                              {item.checked && <Check className="w-4 h-4 font-bold" />}
                            </button>
                            
                            {editingId === item.id ? (
                               <input 
                                 autoFocus
                                 value={editingName} 
                                 onChange={e => setEditingName(e.target.value)}
                                 onBlur={() => saveEditName(item)}
                                 onKeyDown={e => e.key === 'Enter' && saveEditName(item)}
                                 className="flex-1 bg-gray-50 border-2 border-green-300 rounded-lg px-2 py-1 outline-none text-gray-900 font-bold font-sm"
                               />
                            ) : (
                               <span 
                                 onClick={() => { setEditingId(item.id); setEditingName(item.name); }}
                                 className={cn("text-gray-800 font-bold cursor-text underline-offset-4 hover:underline", item.checked && "text-gray-400 line-through decoration-gray-300")}
                               >
                                 {item.name}
                               </span>
                            )}
                         </div>

                         <div className="flex items-center justify-between sm:justify-end shrink-0 pl-10 sm:pl-0">
                            {isClothing && (
                              <div className="flex items-center bg-gray-100 rounded-full border border-gray-200 p-0.5 mr-4 shadow-inner">
                                <button onClick={() => updateQuantity(item, -1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500 border border-gray-200">
                                   <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-bold text-xs text-gray-700">{item.quantity || 1}</span>
                                <button onClick={() => updateQuantity(item, 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500 border border-gray-200">
                                   <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <button onClick={() => deleteItem(item.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>

                       </div>
                     ))}
                   </div>
                 </div>
               )
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-28 right-6">
        <button 
          onClick={() => setShowAdd(true)}
          className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center border-2 border-green-600 shadow-[0_8px_0_0_rgb(22,163,74)] active:translate-y-2 active:shadow-none transition-all z-20"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom border-t-4 border-green-500">
            <h3 className="text-xl font-extrabold mb-4 text-gray-900">新增物品</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">分類</label>
                  <select 
                    value={newItemCat} 
                    onChange={e => setNewItemCat(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-2xl mt-1 border-2 border-gray-100 outline-none font-bold text-gray-700 focus:border-green-400"
                  >
                     {['重要物品類', '隨身小物', '環保類', '3C類', '衣物類', '換季保暖衣物類', '洗漱保養類', '外出類', '化妝類', '旅行備用小物', '其他'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">物品名稱</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newItemName} 
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-2xl mt-1 border-2 border-gray-100 outline-none font-bold focus:border-green-400"
                    placeholder="輸入物品名稱"
                  />
               </div>
               
               <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-50">
                 <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-gray-400 font-bold bg-gray-100 rounded-2xl border-2 border-gray-200">取消</button>
                 <button onClick={addItem} disabled={!newItemName.trim()} className="flex-1 py-4 text-gray-900 font-black bg-yellow-400 border-2 border-yellow-500 rounded-2xl shadow-[0_4px_0_0_rgb(234,179,8)] disabled:opacity-50 active:translate-y-1 active:shadow-none">新增</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
