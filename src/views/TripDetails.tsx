import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useContext } from 'react';
import { doc, getDoc, collection, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Info, Calendar, Users, Wallet, CheckSquare, Map, Share2, Copy } from 'lucide-react';

export function TripDetails() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!user || !tripId) return;

    const fetchTrip = async () => {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripDoc = await getDoc(tripRef);
        if (tripDoc.exists()) {
          setTrip({ id: tripDoc.id, ...tripDoc.data() });
        } else {
          // If the user has a share link but is not a member, we need a special logic to join
          // In this simple version, they must be added before they can get it.
          // Let's implement join code next.
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId, user]);

  const joinTrip = async () => {
     if(!user || !tripId) return;
     // Security rules might block this if we don't have an invitation system that allows anyone with link to update.
     // To solve "Share", we can copy the App URL with the trip ID. If they don't have access, they get Access Denied.
     // Let's assume for sharing, the owner sends the ID.
  }

  if (loading) return <div className="p-6">載入中...</div>;
  if (!trip) return <div className="p-6">找不到此旅程或您沒有權限。</div>;

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/trips/${tripId}?join=true`);
    alert('已複製邀請連結！');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Image Area */}
      <div className="relative h-64 bg-gradient-to-br from-sky-300 to-sky-500 overflow-hidden">
         {/* Simple abstract shapes for summer vibe */}
         <div className="absolute top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
         <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-300/30 rounded-full blur-2xl"></div>
         
         <div className="absolute top-12 left-4 right-4 flex justify-between items-center z-10">
           <button onClick={() => navigate(-1)} className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
             <ChevronLeft className="w-6 h-6" />
           </button>
           <button onClick={handleShare} className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
             <Share2 className="w-5 h-5" />
           </button>
         </div>

         <div className="absolute bottom-6 left-6 right-6 text-white z-10">
            <div className="bg-white/20 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full inline-block mb-2">
              日本 • 東京
            </div>
            <h1 className="text-3xl font-bold tracking-tight shadow-sm leading-tight mb-1">{trip.title}</h1>
            <div className="flex items-center text-sky-50 text-sm font-medium">
              <Calendar className="w-4 h-4 mr-1.5 opacity-80" />
              {trip.startDate} - {trip.endDate}
            </div>
         </div>
      </div>

      <div className="flex-1 px-6 py-8 pb-32 overflow-y-auto space-y-4">
        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link to={`/trips/${tripId}/itinerary`} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 aspect-square active:scale-95 transition-transform">
            <div className="w-14 h-14 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center">
              <Map className="w-7 h-7" />
            </div>
            <span className="font-semibold text-gray-800">行程表</span>
          </Link>
          
          <Link to={`/trips/${tripId}/bookkeeping`} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 aspect-square active:scale-95 transition-transform">
             <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
            <span className="font-semibold text-gray-800">記帳本</span>
          </Link>

          <Link to={`/trips/${tripId}/packing`} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 aspect-square active:scale-95 transition-transform">
             <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center">
              <CheckSquare className="w-7 h-7" />
            </div>
            <span className="font-semibold text-gray-800">行李清單</span>
          </Link>
          
          <div onClick={() => navigate('/settings')} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 aspect-square active:scale-95 transition-transform cursor-pointer">
             <div className="w-14 h-14 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <span className="font-semibold text-gray-800">旅伴</span>
          </div>
        </div>
      </div>
    </div>
  );
}
