import {
  Sparkles,
  Utensils,
  Timer,
  Moon,
  ChefHat,
  MessageCircle,
  Trophy,
  Flame,
  Heart,
  Camera,
  Activity,
  Baby,
} from "lucide-react";

export const FEATURES = [
  {
    icon: Camera,
    title: "Scan makanan AI",
    desc: "Foto piringmu — kalori & makro muncul instan.",
    tint: "from-primary/15 to-primary/0",
  },
  {
    icon: Utensils,
    title: "Database lokal Indonesia",
    desc: "Nasi padang, soto, gado-gado — ribuan menu lengkap.",
    tint: "from-accent/15 to-accent/0",
  },
  {
    icon: Timer,
    title: "Puasa cerdas 16:8 & Ramadhan",
    desc: "Timer + reminder sahur & berbuka otomatis.",
    tint: "from-amber-300/20 to-amber-300/0",
  },
  {
    icon: Moon,
    title: "Jadwal sholat & kiblat",
    desc: "Waktu sholat akurat + kompas kiblat berbasis sensor.",
    tint: "from-indigo-400/15 to-indigo-400/0",
  },
  {
    icon: ChefHat,
    title: "Meal plan AI",
    desc: "Rencana mingguan personal sesuai goal & alergi.",
    tint: "from-primary/15 to-primary/0",
  },
  {
    icon: MessageCircle,
    title: "HealthyU AI Coach chatbot",
    desc: "Tanya jawab AI 24/7 dalam Bahasa Indonesia.",
    tint: "from-accent/15 to-accent/0",
  },
  {
    icon: Trophy,
    title: "Streak & gamifikasi",
    desc: "Level up, koin, achievement — konsisten jadi seru.",
    tint: "from-amber-300/20 to-amber-300/0",
  },
  {
    icon: Heart,
    title: "Vitals & body comp",
    desc: "Lacak berat, tekanan darah, gula, & komposisi tubuh.",
    tint: "from-rose-300/20 to-rose-300/0",
  },
];

export const STEPS = [
  { n: "01", title: "Daftar gratis", desc: "Buat akun dalam 30 detik dengan email atau Google." },
  { n: "02", title: "Isi profil & goal", desc: "Kami hitung kebutuhan kalori & makro personalmu." },
  {
    n: "03",
    title: "Catat & dapat insight",
    desc: "Log makanan, ikuti meal plan AI, capai targetmu.",
  },
];

export const TESTIMONIALS = [
  {
    name: "Rina, 28",
    city: "Jakarta",
    quote:
      "Turun 6 kg dalam 2 bulan tanpa kelaparan. Meal plan AI-nya pas banget sama selera Indonesia.",
    rating: 5,
  },
  {
    name: "Budi, 35",
    city: "Surabaya",
    quote: "Akhirnya app puasa yang ngerti jadwal Ramadhan. Reminder sahur penyelamat hidup.",
    rating: 5,
  },
  {
    name: "Sari, 24",
    city: "Bandung",
    quote:
      "HealthyU AI Coach jawab pertanyaan diet lebih cepat dari nutritionist saya. Worth it banget!",
    rating: 5,
  },
];

export const FAQ_ITEMS = [
  {
    q: "Apakah benar-benar gratis?",
    a: "Ya, semua fitur inti gratis. Tidak perlu kartu kredit untuk daftar.",
  },
  {
    q: "Apakah makanan Indonesia lengkap?",
    a: "Database kami berisi ribuan menu lokal: nasi padang, gado-gado, soto, hingga jajanan tradisional.",
  },
  {
    q: "Bagaimana AI coach bekerja?",
    a: "HealthyU AI Coach menggunakan AI canggih untuk memberi saran berdasarkan profil, riwayat makan, dan goal kamu.",
  },
  {
    q: "Aman untuk data saya?",
    a: "Data kamu dienkripsi dan tidak pernah dijual. Kamu pegang kontrol penuh.",
  },
];

export const COMPARE = [
  { f: "Database makanan Indonesia", us: true, mfp: "Terbatas", fitbit: false },
  { f: "Puasa Ramadhan & 16:8", us: true, mfp: false, fitbit: "Sebagian" },
  { f: "Jadwal sholat & kiblat", us: true, mfp: false, fitbit: false },
  { f: "AI coach Bahasa Indonesia", us: true, mfp: false, fitbit: false },
  { f: "Scan makanan AI", us: true, mfp: "Premium", fitbit: false },
  { f: "Gratis selamanya", us: true, mfp: false, fitbit: false },
];

export const AUDIENCES = [
  { icon: Moon, t: "Muslim", d: "Puasa & jadwal sholat terintegrasi." },
  { icon: Activity, t: "Atlet", d: "Makro presisi & meal-timing." },
  { icon: Heart, t: "Diabetisi", d: "Lacak gula darah & GI makanan." },
  { icon: Baby, t: "Ibu hamil", d: "Nutrisi trimester & vitamin penting." },
];

export const RECIPES = [
  { name: "Nasi Bakar Ayam Suwir", kcal: 420, time: "25m" },
  { name: "Gado-Gado Light", kcal: 310, time: "15m" },
  { name: "Soto Ayam Bening", kcal: 280, time: "30m" },
  { name: "Tumis Tahu Telur", kcal: 350, time: "12m" },
];

export const MEDIA_LOGOS = ["Kompas", "Detik", "Tempo", "Tirto", "CNN Indonesia", "IDN Times"];

export const MARQUEE_CITIES = [
  "Jakarta",
  "Surabaya",
  "Bandung",
  "Medan",
  "Makassar",
  "Yogyakarta",
  "Semarang",
  "Denpasar",
  "Palembang",
  "Balikpapan",
];

export const HERO_DEMO_ICONS = { Sparkles, Flame, Timer };
