import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import {
  ArrowLeft as ArrowLeftGlyph,
  ArrowRight as ArrowRightGlyph,
  ArrowUpDown as ArrowUpDownGlyph,
  BadgePlus as BadgePlusGlyph,
  Banknote as BanknoteGlyph,
  Bell as BellGlyph,
  BellRing as BellRingGlyph,
  Bookmark as BookmarkGlyph,
  BookmarkCheck as BookmarkCheckGlyph,
  Camera as CameraGlyph,
  Check as CheckGlyph,
  CheckCircle2 as CheckCircle2Glyph,
  ChevronLeft as ChevronLeftGlyph,
  ChevronRight as ChevronRightGlyph,
  CircleDollarSign as CircleDollarSignGlyph,
  Crosshair as CrosshairGlyph,
  Edit3 as Edit3Glyph,
  Gift as GiftGlyph,
  Gauge as GaugeGlyph,
  Hash as HashGlyph,
  Handshake as HandshakeGlyph,
  Home as HomeGlyph,
  ImagePlus as ImagePlusGlyph,
  Inbox as InboxGlyph,
  LogOut as LogOutGlyph,
  LayoutGrid as LayoutGridGlyph,
  MapPin as MapPinGlyph,
  MapPinCheck as MapPinCheckGlyph,
  MapPinned as MapPinnedGlyph,
  Menu as MenuGlyph,
  MessageCircle as MessageCircleGlyph,
  MessagesSquare as MessagesSquareGlyph,
  PackageCheck as PackageCheckGlyph,
  Plus as PlusGlyph,
  RefreshCcw as RefreshCcwGlyph,
  RefreshCw as RefreshCwGlyph,
  Route as RouteGlyph,
  ScanLine as ScanLineGlyph,
  Search as SearchGlyph,
  Send as SendGlyph,
  ShoppingBag as ShoppingBagGlyph,
  ShoppingCart as ShoppingCartGlyph,
  Sparkles as SparklesGlyph,
  Store as StoreGlyph,
  Tag as TagGlyph,
  Trash2 as Trash2Glyph,
  Truck as TruckGlyph,
  User as UserGlyph,
  UsersRound as UsersRoundGlyph,
  WalletCards as WalletCardsGlyph,
  X as XGlyph
} from "lucide-react";

type LucideLikeProps = HTMLAttributes<HTMLSpanElement> & {
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
  title?: string;
  tone?: AppIconTone;
};

type AppIconTone =
  | "neutral"
  | "teal"
  | "coral"
  | "violet"
  | "amber"
  | "sky";

function AppIconFrame({
  size,
  className,
  style,
  title,
  tone = "neutral",
  children,
  ...rest
}: LucideLikeProps & { children: ReactNode }) {
  return (
    <span
      className={["app-icon-3d", className].filter(Boolean).join(" ")}
      style={{ ...(style as CSSProperties), ["--app-icon-size" as any]: `${size}px` }}
      title={title}
      data-tone={tone}
      {...rest}
    >
      {children}
    </span>
  );
}

function withAppIcon(
  Icon: any,
  defaults: Partial<LucideLikeProps> = {},
  toneDefault: AppIconTone = "neutral"
) {
  return function AppIcon({
    size = defaults.size ?? 18,
    className,
    style,
    title,
    tone = toneDefault,
    ...rest
  }: LucideLikeProps) {
    return (
      <AppIconFrame size={size} className={className} style={style} title={title} tone={tone} {...rest}>
        <Icon
          size={size}
          className="app-icon-shadow"
          strokeWidth={2.1}
          absoluteStrokeWidth
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        />
        <Icon
          size={size}
          className="app-icon-face"
          strokeWidth={2.1}
          absoluteStrokeWidth
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        />
        <Icon
          size={size}
          className="app-icon-highlight"
          strokeWidth={1.8}
          absoluteStrokeWidth
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        />
      </AppIconFrame>
    );
  };
}

function FilterGlyph({ size = 18, className, style, title, tone = "coral", ...rest }: LucideLikeProps) {
  return (
    <AppIconFrame size={size} className={className} style={style} title={title} tone={tone} {...rest}>
      {["app-icon-shadow", "app-icon-face", "app-icon-highlight"].map((layer) => (
        <svg
          key={layer}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={layer}
          stroke="currentColor"
          strokeWidth={layer === "app-icon-highlight" ? "1.8" : "2.1"}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6h9" />
          <path d="M16 6h4" />
          <circle cx="14" cy="6" r="2" />
          <path d="M4 12h4" />
          <path d="M15 12h5" />
          <circle cx="11" cy="12" r="2" />
          <path d="M4 18h10" />
          <path d="M18 18h2" />
          <circle cx="16" cy="18" r="2" />
        </svg>
      ))}
    </AppIconFrame>
  );
}

function GalleryGlyph({ size = 18, className, style, title, tone = "violet", ...rest }: LucideLikeProps) {
  return (
    <AppIconFrame size={size} className={className} style={style} title={title} tone={tone} {...rest}>
      {["app-icon-shadow", "app-icon-face", "app-icon-highlight"].map((layer) => (
        <svg
          key={layer}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={layer}
          stroke="currentColor"
          strokeWidth={layer === "app-icon-highlight" ? "1.8" : "2.1"}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="6.5" width="17" height="13" rx="3" />
          <path d="M7 15l2.7-2.7a1.5 1.5 0 0 1 2.12 0L14 14.5" />
          <path d="M12.5 17.5 15 15a1.5 1.5 0 0 1 2.12 0L20 17.88" />
          <circle cx="9" cy="10" r="1.25" fill={layer === "app-icon-highlight" ? "rgba(255,255,255,0.82)" : "currentColor"} stroke="none" />
          <path d="M7 4.5h10" opacity=".5" />
        </svg>
      ))}
    </AppIconFrame>
  );
}

export const XwapIcon = withAppIcon(RefreshCcwGlyph, {}, "teal");
export const DealIcon = withAppIcon(MessageCircleGlyph, {}, "sky");

export const BackIcon = withAppIcon(ArrowLeftGlyph, {}, "neutral");
export const NextIcon = withAppIcon(ArrowRightGlyph, {}, "neutral");
export const PrevIcon = withAppIcon(ChevronLeftGlyph, {}, "neutral");
export const ForwardIcon = withAppIcon(ChevronRightGlyph, {}, "neutral");
export const CloseIcon = withAppIcon(XGlyph, {}, "neutral");
export const SearchIcon = withAppIcon(SearchGlyph, {}, "sky");
export const NotificationIcon = withAppIcon(BellRingGlyph, {}, "coral");
export const BellNavIcon = withAppIcon(BellGlyph, {}, "coral");
export const SavedIcon = withAppIcon(BookmarkGlyph, {}, "violet");
export const SavedFilledIcon = withAppIcon(BookmarkCheckGlyph, {}, "amber");
export const HomeIcon = withAppIcon(HomeGlyph, {}, "teal");
export const ShopIcon = withAppIcon(ShoppingBagGlyph, {}, "amber");
export const AddIcon = withAppIcon(PlusGlyph, {}, "coral");
export const InboxIcon = withAppIcon(InboxGlyph, {}, "violet");
export const ProfileIcon = withAppIcon(UserGlyph, {}, "sky");
export const SortIcon = withAppIcon(ArrowUpDownGlyph, {}, "violet");
export const NearbyIcon = withAppIcon(CrosshairGlyph, {}, "teal");
export const FilterIcon = FilterGlyph;
export const HashTagIcon = withAppIcon(HashGlyph, {}, "violet");
export const RefreshIcon = withAppIcon(RefreshCwGlyph, {}, "teal");
export const RefreshBackIcon = withAppIcon(RefreshCcwGlyph, {}, "teal");
export const CameraIcon = withAppIcon(CameraGlyph, {}, "violet");
export const TruckIcon = withAppIcon(TruckGlyph, {}, "amber");
export const MapIcon = withAppIcon(MapPinnedGlyph, {}, "teal");
export const MapPinIcon = withAppIcon(MapPinGlyph, {}, "teal");
export const SendIcon = withAppIcon(SendGlyph, {}, "coral");
export const MenuIcon = withAppIcon(MenuGlyph, {}, "neutral");
export const UsersIcon = withAppIcon(UsersRoundGlyph, {}, "sky");
export const StoreIcon = withAppIcon(StoreGlyph, {}, "amber");
export const LogoutIcon = withAppIcon(LogOutGlyph, {}, "neutral");
export const EditIcon = withAppIcon(Edit3Glyph, {}, "violet");
export const DeleteIcon = withAppIcon(Trash2Glyph, {}, "coral");
export const RepeatIcon = withAppIcon(RefreshCwGlyph, {}, "teal");
export const TradeOnwardIcon = withAppIcon(RefreshCcwGlyph, {}, "teal");
export const OfferChatIcon = withAppIcon(MessagesSquareGlyph, {}, "violet");
export const TradeActionIcon = withAppIcon(HandshakeGlyph, {}, "coral");
export const ImageAddIcon = withAppIcon(ImagePlusGlyph, {}, "violet");
export const GalleryIcon = GalleryGlyph;
export const CashIcon = withAppIcon(BanknoteGlyph, {}, "amber");
export const CreditIcon = withAppIcon(CircleDollarSignGlyph, {}, "amber");
export const CheckIcon = withAppIcon(CheckGlyph, {}, "teal");
export const SparklesIcon = withAppIcon(SparklesGlyph, {}, "coral");
export const ShoppingCartIcon = withAppIcon(ShoppingCartGlyph, {}, "amber");
export const DealBothIcon = withAppIcon(BadgePlusGlyph, {}, "coral");
export const GiftIcon = withAppIcon(GiftGlyph, {}, "coral");
export const WalletIcon = withAppIcon(WalletCardsGlyph, {}, "amber");
export const PackageIcon = withAppIcon(PackageCheckGlyph, {}, "amber");
export const SafetyIcon = withAppIcon(CheckCircle2Glyph, {}, "teal");
export const TagIcon = withAppIcon(TagGlyph, {}, "violet");
export const CategoryIcon = withAppIcon(LayoutGridGlyph, {}, "sky");
export const ConditionIcon = withAppIcon(GaugeGlyph, {}, "amber");
export const ProofIcon = withAppIcon(ScanLineGlyph, {}, "neutral");
export const PickupIcon = withAppIcon(MapPinCheckGlyph, {}, "teal");
export const DeliveryIcon = withAppIcon(MapPinnedGlyph, {}, "coral");
export const DistanceIcon = withAppIcon(RouteGlyph, {}, "teal");

// Semantic aliases for app-wide vocabulary.
export const BackNavIcon = PrevIcon;
export const SearchNavIcon = SearchIcon;
export const SavedNavIcon = SavedIcon;
export const NotificationsNavIcon = BellNavIcon;
export const HomeNavIcon = HomeIcon;
export const ShopNavIcon = ShopIcon;
export const AddProductNavIcon = AddIcon;
export const InboxNavIcon = InboxIcon;
export const ProfileNavIcon = ProfileIcon;
export const SortToolbarIcon = SortIcon;
export const NearbyToolbarIcon = NearbyIcon;
export const FilterToolbarIcon = FilterIcon;
export const HashtagMetaIcon = HashTagIcon;
export const ChangeAvatarIcon = CameraIcon;
export const ShipmentStatusIcon = TruckIcon;
export const OpenMapsIcon = MapIcon;
export const LocationMetaIcon = MapPinIcon;
export const AccountMenuIcon = MenuIcon;
export const FollowingIcon = UsersIcon;
export const MyShopIcon = StoreIcon;
export const SignOutIcon = LogoutIcon;
export const EditProfileIcon = EditIcon;
export const OfferActionIcon = GiftIcon;
export const ChatActionIcon = OfferChatIcon;
export const XwapActionIcon = XwapIcon;
export const SwapDealIcon = XwapIcon;
export const AddMediaActionIcon = ImageAddIcon;
export const PriceCashIcon = CashIcon;
export const TrustScoreIcon = SafetyIcon;
export const SaveActionIcon = SavedIcon;
export const SavedActionIcon = SavedFilledIcon;
export const TradeOnwardActionIcon = TradeOnwardIcon;
export const ProductGalleryIcon = GalleryIcon;

// Compatibility exports so the app can migrate away from direct lucide imports
// without rewriting every callsite at once.
export const ArrowLeftIcon = BackIcon;
export const ArrowRightIcon = NextIcon;
export const ChevronLeftIcon = PrevIcon;
export const ChevronRightIcon = ForwardIcon;
export const Handshake = TradeActionIcon;
export const ArrowLeft = BackIcon;
export const ArrowRight = NextIcon;
export const ChevronLeft = PrevIcon;
export const ChevronRight = ForwardIcon;
export const X = CloseIcon;
export const Search = SearchIcon;
export const Bell = NotificationIcon;
export const Bookmark = SavedIcon;
export const BookmarkCheck = SavedFilledIcon;
export const Home = HomeIcon;
export const ShoppingBag = ShopIcon;
export const Plus = AddIcon;
export const Inbox = InboxIcon;
export const User = ProfileIcon;
export const ArrowUpDown = SortIcon;
export const Crosshair = NearbyIcon;
export const SlidersHorizontal = FilterIcon;
export const Hash = HashTagIcon;
export const RefreshCw = RefreshIcon;
export const RefreshCcw = RefreshBackIcon;
export const Camera = CameraIcon;
export const Truck = TruckIcon;
export const MapPinned = MapIcon;
export const MapPin = MapPinIcon;
export const Send = SendIcon;
export const Menu = MenuIcon;
export const UsersRound = UsersIcon;
export const Store = StoreIcon;
export const LogOut = LogoutIcon;
export const Edit3 = EditIcon;
export const Trash2 = DeleteIcon;
export const Repeat2 = RepeatIcon;
export const MessageSquare = OfferChatIcon;
export const ImagePlus = ImageAddIcon;
export const Images = GalleryIcon;
export const Banknote = CashIcon;
export const CircleDollarSign = CreditIcon;
export const Check = CheckIcon;
export const Sparkles = SparklesIcon;
export const ShoppingCart = ShoppingCartIcon;
export const BadgePlus = DealBothIcon;
export const Gift = GiftIcon;
export const WalletCards = WalletIcon;
export const PackageCheck = PackageIcon;
export const CheckCircle2 = SafetyIcon;
export const Tag = TagIcon;
