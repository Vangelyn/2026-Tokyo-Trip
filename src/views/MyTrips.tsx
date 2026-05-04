import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  memberIds: string[];
}

export function MyTrips() {
  const { user } = useContext(AuthContext);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchTrips = async () => {
      try {
        const q = query(
          collection(db, 'trips'),
          where('memberIds', 'array-contains', user.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedTrips: Trip[] = [];
        snapshot.forEach(doc => {
          fetchedTrips.push({ id: doc.id, ...doc.data() } as Trip);
        });
        setTrips(fetchedTrips);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'trips');
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [user]);

  const createDefaultTrip = async () => {
    if (!user) return;
    try {
      const tripData = {
        title: '東京夏日之旅',
        startDate: '2026-05-11',
        endDate: '2026-05-16',
        ownerId: user.uid,
        memberIds: [user.uid],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      
      // Add user to subcollection members
      await setDoc(doc(db, `trips/${tripRef.id}/members`, user.uid), {
        userId: user.uid,
        role: 'owner',
        initialBudget: 50000,
        joinedAt: Date.now()
      });

      // Default Category styling for default data
      const DEFAULT_ITINERARY = [
        { date: '2026-05-11', title: '桃園機場 (TPE) 出發', startTime: '09:00', location: '桃園國際機場', category: '交通' },
        { date: '2026-05-11', title: '抵達東京成田機場 (NRT)', startTime: '13:30', location: '成田國際機場', category: '交通' },
        { date: '2026-05-11', title: '飯店 Check-in & 附近晚餐', startTime: '16:00', location: '東京', category: '住宿' },
        { date: '2026-05-12', title: '淺草寺、雷門參拜', startTime: '09:30', location: '淺草寺', category: '景點' },
        { date: '2026-05-12', title: '晴空塔觀景 & 商場購物', startTime: '14:00', location: '東京晴空塔', category: '景點' },
        { date: '2026-05-13', title: '寶可夢咖啡廳 / 寶可夢中心', startTime: '11:00', location: 'Pokemon Center Tokyo DX', category: '美食' },
        { date: '2026-05-13', title: '秋葉原動漫電器街', startTime: '14:00', location: '秋葉原', category: '景點' },
        { date: '2026-05-14', title: '明治神宮 & 原宿商圈', startTime: '09:30', location: '明治神宮', category: '景點' },
        { date: '2026-05-14', title: '澀谷十字路口 & 晚餐', startTime: '16:00', location: '澀谷', category: '美食' },
        { date: '2026-05-15', title: '東京迪士尼樂園 / 海洋', startTime: '08:30', location: '東京迪士尼度假區', category: '景點' },
        { date: '2026-05-16', title: '購買伴手禮', startTime: '09:30', location: '東京車站', category: '其他' },
        { date: '2026-05-16', title: '前往機場準備搭機', startTime: '13:00', location: '成田國際機場', category: '交通' },
        { date: '2026-05-16', title: '抵達桃園機場', startTime: '18:00', location: '桃園國際機場', category: '交通' }
      ];

      for (const item of DEFAULT_ITINERARY) {
        await addDoc(collection(db, `trips/${tripRef.id}/itinerary`), {
            ...item,
            creatorId: user.uid,
            createdAt: Date.now()
        });
      }
      
      navigate(`/trips/${tripRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trips');
    }
  };

  return (
    <div className="pt-12 px-6 h-full flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">我的旅程</h1>
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center border-2 border-white shadow-[0_2px_10px_rgba(239,68,68,0.2)] overflow-hidden shrink-0">
          {user?.photoURL ? (
             <img src={user.photoURL} alt="User" />
          ) : (
             <span className="text-red-500 font-black tracking-tighter">{user?.displayName?.[0] || 'U'}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-6">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-400">載入中...</div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-gray-200 text-center mt-10">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-extrabold text-xl text-gray-900 mb-2">尚未新增旅程</h3>
            <p className="text-gray-500 font-bold text-sm mb-6">點擊下方按鈕，展開你的偉大冒險吧！</p>
            <button 
              onClick={createDefaultTrip}
              className="bg-yellow-400 text-gray-900 border-2 border-yellow-500 rounded-full px-6 py-4 font-black shadow-[0_4px_0_0_rgb(234,179,8)] active:translate-y-1 active:shadow-none transition-all w-full"
            >
              建立預設東京之旅
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map(trip => (
              <Link to={`/trips/${trip.id}`} key={trip.id} className="block active:scale-95 transition-transform">
                <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 hover:border-red-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-yellow-200 shadow-sm">
                      準備出發
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-1">{trip.title}</h3>
                  <div className="flex items-center text-gray-400 text-xs font-bold">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-80 text-red-400" />
                    {trip.startDate.replace(/-/g, '/')} - {trip.endDate.replace(/-/g, '/')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
