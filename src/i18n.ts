import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Home": {
        "Title": "Tokyo Trip 2026",
        "TripList": "Upcoming Adventures",
        "Countdown": "Departing in {{days}} days",
        "CountdownToday": "Starts today!",
        "CountdownReady": "Ready to depart!",
        "LeaveTrip": "Leave Trip",
        "LeaveConfirm": "Are you sure you want to leave this trip?",
        "NoTrips": "No trips yet? Start your adventure!",
        "CreateTrip": "Create New Trip",
        "Trip": "Trip",
        "DaysUntil": "Days until trip"
      },
      "TripDetails": {
        "Countdown": "D-{{days}}",
        "CountdownDeparted": "Departed",
        "WeatherSettings": "Weather Region (data from Bank of Taiwan/Central Weather Bureau)",
        "EditTrip": "Edit Trip Info",
        "DeleteTrip": "Delete Trip",
        "Members": "Members",
        "Itinerary": "Itinerary",
        "AddItem": "Add Item",
        "EditItem": "Edit Item",
        "NoItems": "No adventures planned for today!",
        "Status": "Days Left",
        "SetRegionForWeather": "Set region to see weather",
        "SelectDate": "Please select a date",
        "Category": "Category",
        "ItemTitle": "Item Title",
        "Date": "Date",
        "Time": "Time",
        "Location": "Location",
        "Notes": "Notes",
        "SaveEdit": "Save Changes",
        "DeleteConfirm": "Are you sure you want to delete this item?",
        "WeatherRegion": "Weather Region"
      },
      "Bookkeeping": {
        "Title": "Cash Book",
        "TotalSpent": "Total Spent",
        "BudgetRemaining": "Remaining",
        "SetInitialBalance": "Set Initial Budget",
        "InitialBalanceDesc": "This is your first time opening the cash book. Please set your starting budget.",
        "AddExpense": "Add Expense",
        "Category": "Category",
        "Amount": "Amount",
        "Currency": "Currency",
        "Note": "Note",
        "Save": "Save",
        "Apply": "Apply",
        "NoExpenses": "No expenses yet. Add one to see it here!",
        "ConvertPreview": "Converted to {{currency}}"
      },
      "PackingList": {
        "Title": "Packing List",
        "AddItem": "Add Item",
        "Category": "Category",
        "Quantity": "Quantity",
        "Qty": "Qty",
        "Claim": "Claim",
        "Claimed": "Claimed",
        "HasClaimed": "has claimed",
        "NoItems": "Packing list is empty!",
        "LoadDefaults": "Auto-load Template",
        "Progress": "Packing Progress",
        "ConfirmDelete": "Delete this item?"
      },
      "Members": {
        "Title": "Travel Buddies",
        "Count": "Members ({{count}})",
        "Owner": "Host",
        "You": "YOU",
        "InviteMore": "Invite More Friends",
        "ShareAlert": "Invitation link copied! Share it with your friends!"
      },
      "Exchange": {
        "Title": "Exchange Abacus",
        "SelectCurrency": "Select Currency",
        "Rate": "Current Rate (BoT Spot Sell)",
        "Computing": "Converting..."
      },
      "Common": {
        "Cancel": "Cancel",
        "Confirm": "Confirm",
        "Loading": "Loading...",
        "Language": "Language",
        "NotSet": "Not Set",
        "Save": "Save"
      }
    }
  },
  zh: {
    translation: {
      "Home": {
        "Title": "2026 東京行",
        "TripList": "即將到來的冒險",
        "Countdown": "倒數 {{days}} 天啟程",
        "CountdownToday": "今天啟程！",
        "CountdownReady": "準備出發！",
        "LeaveTrip": "退出行程",
        "LeaveConfirm": "確定要退出這個行程嗎？",
        "NoTrips": "還沒有行程？開始你的第一趟冒險吧！",
        "CreateTrip": "建立新行程",
        "Trip": "行程",
        "DaysUntil": "距離出發天數"
      },
      "TripDetails": {
        "Countdown": "倒數 {{days}} 天",
        "CountdownDeparted": "已啟程",
        "WeatherSettings": "天氣區域設定 (資料來源：中央氣象局/台銀匯率)",
        "EditTrip": "編輯行程資訊",
        "DeleteTrip": "刪除行程",
        "Members": "旅伴成員",
        "Itinerary": "行程表",
        "AddItem": "新增行程",
        "EditItem": "編輯行程 (共同編輯)",
        "NoItems": "這天還沒安排行程！",
        "Status": "倒數天數",
        "SetRegionForWeather": "設定地區以查看天氣",
        "SelectDate": "請選擇日期",
        "Category": "分類",
        "ItemTitle": "行程標題",
        "Date": "日期",
        "Time": "時間",
        "Location": "Google 地圖位置",
        "Notes": "備註",
        "SaveEdit": "儲存修改 / 同步",
        "DeleteConfirm": "確定要刪除這個行程嗎？",
        "WeatherRegion": "天氣偵測區域"
      },
      "Bookkeeping": {
        "Title": "現金記帳本",
        "TotalSpent": "累積支出",
        "BudgetRemaining": "剩餘預算",
        "SetInitialBalance": "設置初始金額",
        "InitialBalanceDesc": "這是你第一次開啟此行程的記帳本，請設置初始預算金額。",
        "AddExpense": "新增支出",
        "Category": "分類",
        "Amount": "金額",
        "Currency": "幣別",
        "Note": "備註",
        "Save": "儲存",
        "Apply": "套用",
        "NoExpenses": "尚無支出紀錄。開始記帳吧！",
        "ConvertPreview": "約合 {{currency}}"
      },
      "PackingList": {
        "Title": "行李清單",
        "AddItem": "新增物品",
        "Category": "分類",
        "Quantity": "數量",
        "Qty": "數量",
        "Claim": "認領",
        "Claimed": "已認領",
        "HasClaimed": "已認領",
        "NoItems": "清單空空如也！",
        "LoadDefaults": "自動載入建議範本",
        "Progress": "完成進度",
        "ConfirmDelete": "確定刪除此物品？"
      },
      "Members": {
        "Title": "旅伴成員",
        "Count": "同行成員 ({{count}})",
        "Owner": "主揪",
        "You": "你自己",
        "InviteMore": "邀請更多旅伴",
        "ShareAlert": "已複製邀請連結！快傳給朋友吧"
      },
      "Exchange": {
        "Title": "換匯算盤",
        "SelectCurrency": "選擇幣別",
        "Rate": "即時匯率 (台銀即期賣出)",
        "Computing": "換算中..."
      },
      "Common": {
        "Cancel": "取消",
        "Confirm": "確認",
        "Loading": "載入中...",
        "Language": "語言",
        "NotSet": "未設定",
        "Save": "儲存"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "zh", // default language
    fallbackLng: "zh",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
