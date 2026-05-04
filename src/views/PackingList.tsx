import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Check, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PackingItem {
  id: string;
  category: string;
  name: string;
  checked: boolean;
  userId: string; // The person responsible
}

const DEFAULT_ITEMS = [
  // 隨身行李/背包
  { category: '重要物品類', name: '網路(ESIM)' },
  { category: '重要物品類', name: '保險(旅平/不便險)' },
  { category: '重要物品類', name: '住宿預訂確認' },
  { category: '重要物品類', name: '餐廳預訂確認' },
  { category: '重要物品類', name: '行李箱租借' },
  { category: '重要物品類', name: '交通票確認' },
  { category: '重要物品類', name: 'VJW-VISIT JAPAN WEB' },
  { category: '重要物品類', name: '護照/日鈔/交通卡' },
  { category: '重要物品類', name: '行李秤' },
  { category: '重要物品類', name: '台灣錢包/悠遊卡' },
  { category: '重要物品類', name: '酒精擦' },
  { category: '重要物品類', name: '信用卡' },
  
  { category: '隨身小物', name: '護唇/護手霜' },
  { category: '隨身小物', name: 'OK繃/曼秀雷敦' },
  { category: '隨身小物', name: '止痛/鼻炎/腸胃藥' },
  { category: '隨身小物', name: '口罩' },
  { category: '隨身小物', name: '墨鏡/隱形眼鏡/人工淚液' },
  { category: '隨身小物', name: '雨傘/雨衣' },
  { category: '隨身小物', name: '充氣頸枕' },
  { category: '隨身小物', name: '筆' },
  
  { category: '環保類', name: '水壺(飲料提袋)' },
  { category: '環保類', name: '環保袋' },
  
  // 托運行李
  { category: '3C類', name: '行動電源' },
  { category: '3C類', name: 'TR相機+電池(Duma包)' },
  { category: '3C類', name: 'AirTag' },
  { category: '3C類', name: '手機' },
  { category: '3C類', name: 'AppleWatch' },
  { category: '3C類', name: '充電線材' },
  
  { category: '衣物類', name: '上衣' },
  { category: '衣物類', name: '下身' },
  { category: '衣物類', name: '內衣褲' },
  { category: '衣物類', name: '襪子' },
  { category: '衣物類', name: '備用鞋' },
  { category: '衣物類', name: '外出小包' },
  
  { category: '換季保暖衣物類', name: '發熱衣' },
  { category: '換季保暖衣物類', name: '防風外套' },
  { category: '換季保暖衣物類', name: '羽絨外套' },
  { category: '換季保暖衣物類', name: '圍巾' },
  { category: '換季保暖衣物類', name: '帽子' },
  
  { category: '洗漱保養類', name: '牙刷' },
  { category: '洗漱保養類', name: '洗漱包(護色洗)' },
  { category: '洗漱保養類', name: '棉花棒' },
  { category: '洗漱保養類', name: '卸妝棉' },
  { category: '洗漱保養類', name: '擦臉毛巾' },
  
  { category: '外出類', name: '防曬乳' },
  { category: '外出類', name: '防蚊液' },
  { category: '外出類', name: '寶可夢娃娃' },
  { category: '外出類', name: '寶可夢樂園相關' },
  
  { category: '化妝類', name: '粉底&刷' },
  { category: '化妝類', name: '眼影盤&刷x2' },
  { category: '化妝類', name: '雙眼皮貼' },
  { category: '化妝類', name: '腮紅&刷' },
  { category: '化妝類', name: '鼻影' },
  { category: '化妝類', name: '眼線筆' },
  { category: '化妝類', name: '口紅' },
  { category: '化妝類', name: '定妝粉' },
  { category: '化妝類', name: '假睫毛' },
  
  { category: '旅行備用小物', name: '摺疊式輕便旅行袋' },
  { category: '旅行備用小物', name: '塑膠袋' },
  { category: '旅行備用小物', name: '衛生紙' },
  { category: '旅行備用小物', name: '濕紙巾' }
];

export function PackingList() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState<PackingItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('其他');

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
    if (!user) return;
    try {
      for (const item of DEFAULT_ITEMS) {
        await addDoc(collection(db, `trips/${tripId}/packing`), {
          category: item.category,
          name: item.name,
          checked: false,
          userId: user.uid,
          createdAt: Date.now()
        });
      }
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
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-purple-500 pt-12 pb-6 px-6 text-white rounded-b-3xl shadow-sm z-10 relative">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">出發前準備</h1>
          <div className="w-8 h-8"></div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2 font-medium">
             <span>完成進度</span>
             <span>{progress}%</span>
          </div>
          <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
             <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
        {items.length === 0 ? (
          <div className="text-center py-10 mt-10">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-purple-400" />
            </div>
             <p className="text-gray-500 mb-4">清單空空如也，需要載入建議範本嗎？</p>
             <button onClick={loadDefaults} className="bg-purple-100 text-purple-600 font-bold px-6 py-2 rounded-full text-sm">
               載入預設清單
             </button>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</h3>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  {items.filter(i => i.category === cat).map((item, idx, arr) => (
                    <div key={item.id} className={cn("flex items-center justify-between p-4", idx !== arr.length - 1 && "border-b border-gray-50")}>
                      <button 
                        onClick={() => toggleItem(item)}
                        className="flex items-center flex-1 text-left"
                      >
                         <div className={cn("w-6 h-6 rounded border flex items-center justify-center mr-3 transition-colors", item.checked ? "bg-purple-500 border-purple-500 text-white" : "border-gray-300")}>
                           {item.checked && <Check className="w-4 h-4" />}
                         </div>
                         <span className={cn("text-gray-800 font-medium", item.checked && "text-gray-400 line-through")}>{item.name}</span>
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-8 right-6">
        <button 
          onClick={() => setShowAdd(true)}
          className="w-14 h-14 bg-purple-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">新增物品</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-gray-500">分類</label>
                  <select 
                    value={newItemCat} 
                    onChange={e => setNewItemCat(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-xl mt-1 border border-gray-100 outline-none"
                  >
                     {['重要物品類', '隨身小物', '環保類', '3C類', '衣物類', '換季保暖衣物類', '洗漱保養類', '外出類', '化妝類', '旅行備用小物', '其他'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-500">物品名稱</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newItemName} 
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-xl mt-1 border border-gray-100 outline-none"
                    placeholder="輸入物品名稱"
                  />
               </div>
               
               <div className="flex gap-3 mt-6">
                 <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">取消</button>
                 <button onClick={addItem} disabled={!newItemName.trim()} className="flex-1 py-3 text-white font-bold bg-purple-500 rounded-xl disabled:opacity-50">新增</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
