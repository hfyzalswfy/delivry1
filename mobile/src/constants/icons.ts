export const ICONS = {
  // Navigation / Tabs
  home: 'home',
  orders: 'assignment',
  chat: 'chat',
  profile: 'person',
  wallet: 'account-balance-wallet',
  delivery: 'local-shipping',
  create: 'add-circle',
  createOutline: 'add-circle-outline',
  notifications: 'notifications',
  notificationsOff: 'notifications-none',
  settings: 'settings',
  back: 'arrow-back',
  forward: 'arrow-forward',
  chevronRight: 'chevron-right',
  dropdown: 'arrow-drop-down',
  refresh: 'refresh',
  close: 'close',
  logout: 'logout',
  exit: 'exit-to-app',

  // Status / Feedback
  check: 'check',
  checkCircle: 'check-circle',
  warning: 'warning',
  error: 'error',
  info: 'info',
  infoOutline: 'info-outline',
  help: 'help',
  helpOutline: 'help-outline',
  star: 'star',
  starBorder: 'star-border',
  stars: 'stars',
  favorite: 'favorite',
  favoriteBorder: 'favorite-border',
  flag: 'flag',
  bolt: 'bolt',
  timer: 'timer',

  // Communication
  phone: 'phone',
  message: 'chat',
  email: 'email',

  // Location / Map
  location: 'location-on',
  map: 'map',
  store: 'storefront',
  storeAlt: 'store',

  // Media
  camera: 'camera-alt',
  photo: 'photo',
  photoLibrary: 'photo-library',
  edit: 'edit',

  // Files / Documents
  document: 'description',
  clipboard: 'assignment',
  receipt: 'receipt-long',

  // Security
  lock: 'lock',
  lockOpen: 'lock-open',
  visibility: 'visibility',
  visibilityOff: 'visibility-off',
  security: 'security',

  // Money / Finance
  money: 'attach-money',
  moneyOff: 'money-off',
  payment: 'payment',
  cardGift: 'card-giftcard',

  // Transport
  car: 'directions-car',
  truck: 'local-shipping',
  packageIcon: 'inventory-2',

  // UI / Actions
  search: 'search',
  filter: 'filter-list',
  menu: 'menu',
  more: 'more-vert',
  share: 'share',
  calendar: 'calendar-today',
  clock: 'access-time',
  person: 'person',
  personOutline: 'person-outline',

  // Theme / Appearance
  darkMode: 'brightness-3',
  lightMode: 'brightness-5',
  palette: 'palette',
  autoAwesome: 'auto-awesome',
  celebration: 'auto-awesome',

  // Misc
  wave: 'waves',
  gift: 'card-giftcard',
  shield: 'security',
  emergency: 'medical-services',
  language: 'language',
} as const;

export type IconName = keyof typeof ICONS;
