import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Check, Plus, Trash2, Edit2, Minus, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface PackingItem {
  id: string;
  category: string;
  name: string;
  userId: string; 
  quantity?: number;
  checkedUsers?: Record<string, boolean>; // Independent check status
}

const DEFAULT_ITEMS: Omit<PackingItem, 'id' | 'userId'>[] = [
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
  const { t } = useTranslation();
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState<PackingItem[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, any>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('其他');
  const [newItemQty, setNewItemQty] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  useEffect(() => {
    if (!tripId || !user) return;

    // Fetch members to show avatars
    const fetchMembers = async () => {
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        const data = tripSnap.data();
        const map: Record<string, any> = {};
        for (const uid of data.memberIds || []) {
          const uSnap = await getDoc(doc(db, 'users', uid));
          if (uSnap.exists()) map[uid] = uSnap.data();
        }
        setMembersMap(map);
      }
    };
    fetchMembers();

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
             quantity: item.quantity || 1,
             userId: user.uid,
             createdAt: Date.now(),
             checkedUsers: {}
           })
         );
      }
      await Promise.all(batch);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `trips/${tripId}/packing`);
    }
  };

  const toggleItem = async (item: PackingItem) => {
    if (!user) return;
    try {
      const isChecked = item.checkedUsers?.[user.uid] || false;
      await updateDoc(doc(db, `trips/${tripId}/packing/${item.id}`), {
        [`checkedUsers.${user.uid}`]: !isChecked
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
    if (!confirm(t('PackingList.ConfirmDelete'))) return;
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
        quantity: (newItemCat.includes('衣物')) ? newItemQty : 1,
        userId: user.uid,
        createdAt: Date.now(),
        checkedUsers: {}
      });
      setNewItemName('');
      setNewItemQty(1);
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/packing`);
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));
  const userCheckedCount = useMemo(() => items.filter(i => i.checkedUsers?.[user?.uid || '']).length, [items, user?.uid]);
  const progress = items.length === 0 ? 0 : Math.round((userCheckedCount / items.length) * 100);

  return (
    <div className="flex flex-col h-full bg-green-50 relative overflow-hidden">
      <div className="bg-green-500 pt-12 pb-6 px-6 text-white rounded-b-[2.5rem] shadow-lg z-10 relative shrink-0">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-95 transition-transform">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">{t('PackingList.Title')}</h1>
          <div className="w-10 h-10"></div>
        </div>

        <div className="bg-white/10 p-5 rounded-[2rem] border border-white/20 backdrop-blur-md">
          <div className="flex justify-between text-xs mb-2 font-black uppercase tracking-widest text-green-50">
             <span>{t('PackingList.Progress')}</span>
             <span>{userCheckedCount} / {items.length} ({progress}%)</span>
          </div>
          <div className="w-full h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm shadow-inner border border-white/5">
             <div className="h-full bg-yellow-400 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(234,179,8,0.5)]" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-32 space-y-8">
        {items.length === 0 ? (
          <div className="text-center py-16 mt-10 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 shadow-sm px-6">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
              <Package className="w-12 h-12 text-green-200" />
            </div>
             <p className="text-gray-400 mb-8 font-black text-lg">{t('PackingList.NoItems')}</p>
             <button onClick={loadDefaults} className="bg-yellow-400 text-gray-900 border-2 border-yellow-500 font-black px-10 py-4 rounded-full hover:bg-yellow-500 active:translate-y-1 shadow-[0_6px_0_0_rgb(234,179,8)] active:shadow-none transition-all uppercase tracking-tight">
               {t('PackingList.LoadDefaults')}
             </button>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((cat: any) => {
               const catItems = items.filter(i => i.category === cat);
               const isClothing = String(cat).includes('衣物');
               return (
                 <div key={cat} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-5 mb-4 flex items-center gap-3">
                     <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></span>
                     {cat}
                   </h3>
                   <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border-2 border-gray-50">
                     {catItems.map((item, idx, arr) => {
                        const isChecked = item.checkedUsers?.[user?.uid || ''] || false;
                        const isClothingItem = String(cat).includes('衣物');
                        const checkedUserEntries = Object.entries(item.checkedUsers || {}).filter(([_, val]) => val);

                        return (
                          <div key={item.id} className={cn("flex flex-col p-5 gap-3 transition-all", idx !== arr.length - 1 && "border-b border-gray-50", isChecked && "bg-gray-50/30")}>
                            
                            <div className="flex items-start justify-between gap-3">
                               <div className="flex items-start flex-1 gap-4">
                                  <button 
                                    onClick={() => toggleItem(item)}
                                    className={cn("w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 shadow-sm", isChecked ? "bg-green-500 border-green-600 text-white scale-105" : "border-gray-200 bg-white active:scale-95")}
                                  >
                                    {isChecked && <Check className="w-5 h-5 stroke-[3]" />}
                                  </button>
                                  
                                  <div className="flex-1">
                                    {editingId === item.id ? (
                                       <input 
                                         autoFocus
                                         value={editingName} 
                                         onChange={e => setEditingName(e.target.value)}
                                         onBlur={() => saveEditName(item)}
                                         onKeyDown={e => e.key === 'Enter' && saveEditName(item)}
                                         className="w-full bg-gray-50 border-2 border-green-300 rounded-xl px-3 py-1.5 outline-none text-gray-900 font-bold text-base shadow-inner"
                                       />
                                    ) : (
                                       <div className="flex flex-wrap items-center gap-2">
                                          <span 
                                            onClick={() => { setEditingId(item.id); setEditingName(item.name); }}
                                            className={cn("text-gray-800 font-black text-lg cursor-text hover:text-green-600 transition-colors", isChecked && "text-gray-300 line-through decoration-gray-200")}
                                          >
                                            {item.name}
                                          </span>
                                          {item.quantity && item.quantity > 1 && (
                                            <span className="text-[10px] font-black bg-gray-100 text-gray-400 px-2 py-0.5 rounded-lg border border-gray-200">
                                              x{item.quantity}
                                            </span>
                                          )}
                                       </div>
                                    )}
                                    
                                    {/* Checked Users Avatars */}
                                    {checkedUserEntries.length > 0 && (
                                       <div className="flex -space-x-2 mt-2 animate-in fade-in zoom-in duration-300">
                                          {checkedUserEntries.map(([uid]) => {
                                             const member = membersMap[uid];
                                             if (!member) return null;
                                             return (
                                                <div key={uid} className="w-6 h-6 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100" title={member.displayName}>
                                                   {member.photoURL ? (
                                                      <img src={member.photoURL} className="w-full h-full object-cover" />
                                                   ) : (
                                                      <span className="text-[8px] flex h-full items-center justify-center font-bold text-gray-500">
                                                         {member.displayName?.charAt(0)}
                                                      </span>
                                                   )}
                                                </div>
                                             );
                                          })}
                                       </div>
                                    )}
                                  </div>
                               </div>

                               <div className="flex items-center gap-2">
                                  <button onClick={() => deleteItem(item.id)} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm active:scale-90">
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                               </div>
                            </div>

                            {/* Conditional Quantity Controls for list */}
                            {isClothingItem && !editingId && (
                               <div className="flex items-center justify-end animate-in fade-in duration-500 pr-2">
                                 <div className="flex items-center bg-gray-50 rounded-2xl border-2 border-gray-100 p-1 shadow-inner gap-1">
                                   <button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center rounded-xl bg-white shadow-sm text-gray-400 border border-gray-100 active:scale-90 transition-transform">
                                      <Minus className="w-4 h-4" />
                                   </button>
                                   <div className="w-10 flex flex-col items-center">
                                      <span className="text-xs font-black text-gray-700">{item.quantity || 1}</span>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none italic">{t('PackingList.Qty')}</span>
                                   </div>
                                   <button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center rounded-xl bg-white shadow-sm text-gray-400 border border-gray-100 active:scale-90 transition-transform">
                                      <Plus className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                            )}
                          </div>
                        )
                     })}
                   </div>
                 </div>
               )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      {!showAdd && (
        <button 
          onClick={() => setShowAdd(true)}
          className="absolute bottom-28 right-6 w-16 h-16 bg-green-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-[0_12px_25px_-10px_rgba(16,185,129,0.5)] active:scale-90 transition-all z-[60] border-t border-white/20 active:translate-y-1"
        >
          <Plus className="w-8 h-8" strokeWidth={3} />
        </button>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom border-t-8 border-green-500 max-h-[85vh] overflow-y-auto pb-safe">
            <h3 className="text-2xl font-black mb-8 text-gray-900 leading-tight">{t('PackingList.AddItem')}</h3>
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black text-gray-400 mb-3 block uppercase tracking-[0.2em] ml-2">Category</label>
                  <select 
                    value={newItemCat} 
                    onChange={e => setNewItemCat(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent outline-none font-black text-gray-700 focus:border-green-400 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                  >
                     {['重要物品類', '隨身小物', '環保類', '3C類', '衣物類', '換季保暖衣物類', '洗漱保養類', '外出類', '化妝類', '旅行備用小物', '其他'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black text-gray-400 mb-3 block uppercase tracking-[0.2em] ml-2">Item Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newItemName} 
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent outline-none font-black focus:border-green-400 focus:bg-white transition-all shadow-inner"
                    placeholder="Enter item name..."
                  />
               </div>

               {newItemCat.includes('衣物') && (
                  <div className="animate-in slide-in-from-top-4 duration-300">
                    <label className="text-[10px] font-black text-gray-400 mb-3 block uppercase tracking-[0.2em] ml-2">{t('PackingList.Qty')}</label>
                    <div className="flex items-center bg-gray-50 rounded-2xl border-2 border-transparent p-2 shadow-inner gap-4 px-6 focus-within:border-green-400 focus-within:bg-white transition-all">
                      <button onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-gray-400 border border-gray-100 active:scale-90 transition-transform">
                          <Minus className="w-5 h-5" />
                      </button>
                      <span className="flex-1 text-center font-black text-xl text-gray-700">{newItemQty}</span>
                      <button onClick={() => setNewItemQty(newItemQty + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-gray-400 border border-gray-100 active:scale-90 transition-transform">
                          <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
               )}
               
               <div className="flex gap-4 mt-8">
                 <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-gray-400 font-black bg-gray-50 rounded-2xl border-2 border-gray-100 hover:bg-gray-100 transition-colors uppercase text-sm">{t('Common.Cancel')}</button>
                 <button onClick={addItem} disabled={!newItemName.trim()} className="flex-1 py-4 text-white font-black bg-green-500 border-b-4 border-green-700 rounded-2xl active:translate-y-1 active:border-b-0 transition-all uppercase text-sm shadow-lg shadow-green-100">{t('Common.Confirm')}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
