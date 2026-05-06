import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Share2, Users, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Members() {
  const { t } = useTranslation();
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId || !user) return;
    
    const unsubscribeTrip = onSnapshot(doc(db, 'trips', tripId), async (docSnap) => {
      if(docSnap.exists()) {
         const tData = docSnap.data();
         setTrip(tData);
         
         // Fetch user profiles for memberIds
         if (tData.memberIds && tData.memberIds.length > 0) {
            try {
              const usersCache: any[] = [];
              for (const uid of tData.memberIds) {
                 const uSnap = await getDoc(doc(db, 'users', uid));
                 if (uSnap.exists()) {
                   usersCache.push({ id: uid, ...uSnap.data() });
                 }
              }
              setMembers(usersCache);
            } catch(e) {
               console.error(e);
            }
         }
      }
      setLoading(false);
    });

    return () => unsubscribeTrip();
  }, [tripId, user]);

  const handleShare = () => {
    if (!tripId) return;
    const shareUrl = `${window.location.origin}/trips/${tripId}?join=true`;
    navigator.clipboard.writeText(shareUrl);
    alert(t('Members.ShareAlert') + '\n\n' + shareUrl);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-500 to-blue-600 pt-12 pb-16 px-6 text-white rounded-b-[2rem] shadow-sm relative shrink-0">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(`/trips/${tripId}`)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-95 transition-transform">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">{t('Members.Title')}</h1>
          <button onClick={handleShare} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:scale-95 transition-transform">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-blue-100 text-center font-medium opacity-90">{trip?.title || t('MyTrips.Trip')}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 -mt-8 z-10 space-y-6">
         <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                  <Users className="w-5 h-5" />
               </div>
               <h2 className="text-lg font-bold text-gray-800">{t('Members.Count', { count: members.length })}</h2>
            </div>
            
            <div className="flex flex-col gap-4">
               {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="relative">
                           {m.photoURL ? (
                              <img src={m.photoURL} alt={m.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                           ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-300 to-yellow-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                 {m.displayName?.charAt(0) || '?'}
                              </div>
                           )}
                           {m.id === trip?.ownerId && (
                              <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-[10px] font-bold text-white px-2 py-0.5 rounded-full border-2 border-white">
                                {t('Members.Owner')}
                              </div>
                           )}
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-gray-900">{m.displayName}</span>
                           {m.id === user?.uid && <span className="text-xs text-blue-500 font-bold mt-0.5 bg-blue-50 w-fit px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">{t('Members.You')}</span>}
                        </div>
                     </div>
                  </div>
               ))}
            </div>

            <button 
              onClick={handleShare}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm"
            >
               <Share2 className="w-5 h-5" />
               {t('Members.InviteMore')}
            </button>
         </div>
      </div>
    </div>
  );
}
