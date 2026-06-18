export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'dealer';
  likedCarIds: string[];
  savedCarIds: string[];
  subscriptionTier?: 'free' | 'veloce_gt' | 'dealer_paid';
  followingUserIds?: string[];
  isKycVerified?: boolean;
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  eulaAccepted?: boolean;
}

export interface Review {
  id: string;
  carId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  images: string[];
  price: number; // per day for rent, or full price for buy
  type: 'rent' | 'buy' | 'both';
  transmission: string;
  engine: string;
  power: number; // HP
  acceleration: string; // 0-100 km/h e.g. "2.9s"
  topSpeed: number; // km/h
  location: string;
  distance: number; // in miles/km away
  rating: number;
  reviews: Review[];
  description: string;
  features: string[];
  dealerId: string;
  dealerName: string;
  dealerAvatar: string;
  insuranceLevel: 'basic' | 'premium' | 'none';
  category?: 'car' | 'motorcycle';
  drivetrain?: 'AWD' | 'RWD' | 'FWD';
  displacement?: string; // e.g. "4.0L", "3.0L", "Electric", "0.9L"
  mileage?: number;
  engineSize?: string;
  engineShape?: string;
  rentAvailableStart?: string;
  rentAvailableEnd?: string;
}

export interface Booking {
  id: string;
  carId: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  insuranceType: 'basic' | 'premium' | 'none';
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  pickupLocation: string;
  paymentStatus: 'paid' | 'pending';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'seen';
}

export interface ChatSession {
  id: string;
  carId: string;
  userId: string;
  dealerId: string;
  carName: string;
  carImage: string;
  dealerName: string;
  userName: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  messages: ChatMessage[];
  dealerAvatar?: string;
}

export enum AppLanguage {
  EN = 'en',
  ES = 'es',
  IT = 'it'
}

export enum AppSection {
  PROFILE = 'profile',
  INBOX = 'inbox',
  EXPLORE = 'explore',
  RENTALS = 'rentals',
  LIKED = 'liked',
  COMMUNITY = 'community',
  MY_FLEET = 'my_fleet'
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  type: 'ride' | 'meetup' | 'track_day';
  date: string;
  location: string;
  participantsCount: number;
  hostName: string;
  hostAvatar: string;
  isHostGtrs: boolean;
  joined?: boolean;
  isPremium?: boolean;
  onlyPremiumVisible?: boolean;
  feeType?: 'free' | 'paid';
  feeAmount?: number;
  sponsoredBy?: 'dealer' | 'private_sponsor';
}

export interface CreatorPost {
  id: string;
  username: string;
  userAvatar: string;
  title: string;
  image: string;
  likes: number;
  commentsCount: number;
  hasLiked?: boolean;
  speedOverlay?: string;
}

export const COMMON_BRANDS_MODELS: Record<string, string[]> = {
  'Porsche': ['911 GT3 RS', '911 Turbo S', '718 Cayman GT4', 'Taycan Turbo S', 'Panamera Turbo', 'Macan GTS', 'Cayenne Coupe'],
  'Ferrari': ['SF90 Stradale', '296 GTB', 'Roma Spider', 'F8 Tributo', '812 Superfast', 'Purosangue', 'LaFerrari'],
  'Lamborghini': ['Aventador SVJ', 'Huracán STO', 'Urus Performante', 'Revuelto', 'Gallardo Superleggera', 'Murciélago LP640'],
  'McLaren': ['720S Spider', 'Artura Hybrid', '765LT', 'P1 Coupe', '570S Coupe', 'GT Ultimate'],
  'Aston Martin': ['DBX707 V8', 'DBS Superleggera', 'Vantage V8', 'Valhalla', 'DB12 Coupe'],
  'Maserati': ['MC20 Cielo', 'GranTurismo Trofeo', 'Ghibli Trofeo', 'Levante Trofeo'],
  'Rolls-Royce': ['Spectre EV', 'Phantom VIII', 'Cullinan Black Badge', 'Ghost V12'],
  'Bentley': ['Continental GT Speed', 'Flying Spur Mulliner', 'Bentayga S'],
  'Audi': ['R8 V10 Performance', 'RS6 Avant', 'e-tron GT RS', 'RS7 Sportback', 'RS Q8 Performance'],
  'BMW': ['M3 Competition', 'M4 CSL', 'M5 Competition', 'M8 Competition', 'i8 Roadster', 'XM Label Red'],
  'Mercedes-Benz': ['AMG GT Black Series', 'SL 63 Roadster', 'G 63 AMG (G-Wagon)', 'C 63 S AMG', 'EQS Sedan AMG'],
  'Chevrolet': ['Corvette Z06 (C8)', 'Corvette Stingray', 'Camaro ZL1 1LE'],
  'Ford': ['Ford GT Supercar', 'Mustang Shelby GT500', 'Mustang Mach 1'],
  'Dodge': ['Challenger SRT Demon', 'Charger SRT Hellcat', 'Viper ACR'],
  'Nissan': ['GT-R Nismo (R35)', 'Z Performance', 'Skyline GT-R (R34)'],
  'Toyota': ['GR Supra Premium', 'GR Yaris R', 'GR 86 Premium'],
  'Lexus': ['LFA V10', 'LC 500 V8', 'IS 500 F-Sport', 'RCF Track Edition'],
  'Jaguar': ['F-Type R V8', 'I-Pace HSE'],
  'Land Rover': ['Range Rover Sport SV', 'Defender 110 V8 Octa'],
  'Tesla': ['Model S Plaid', 'Model X Plaid', 'Model 3 Performance', 'Cybertruck Cyberbeast', 'Roadster 2.0'],
  'Koenigsegg': ['Jesko Absolut', 'Gemera Hybrid', 'Regera'],
  'Bugatti': ['Chiron Super Sport', 'Veyron Grand Sport', 'Tourbillon Hybrid'],
  'Pagani': ['Huayra Roadster', 'Zonda Cinque', 'Utopian'],
  'Ducati': ['Panigale V4 R', 'Monster 1205', 'Diavel V4', 'Streetfighter V4 SP2', 'Multistrada V4 S']
};
