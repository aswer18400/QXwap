import type { SVGProps } from "react";
import {
  ArrowLeft as ArrowLeftGlyph,
  ArrowRight as ArrowRightGlyph,
  ArrowUpDown as ArrowUpDownGlyph,
  BadgePlus as BadgePlusGlyph,
  Banknote as BanknoteGlyph,
  Bell as BellGlyph,
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
  Hash as HashGlyph,
  Handshake as HandshakeGlyph,
  Home as HomeGlyph,
  ImagePlus as ImagePlusGlyph,
  Images as ImagesGlyph,
  Inbox as InboxGlyph,
  LogOut as LogOutGlyph,
  MapPin as MapPinGlyph,
  MapPinned as MapPinnedGlyph,
  Menu as MenuGlyph,
  MessageSquare as MessageSquareGlyph,
  PackageCheck as PackageCheckGlyph,
  Plus as PlusGlyph,
  RefreshCcw as RefreshCcwGlyph,
  RefreshCw as RefreshCwGlyph,
  Search as SearchGlyph,
  Send as SendGlyph,
  ShoppingBag as ShoppingBagGlyph,
  ShoppingCart as ShoppingCartGlyph,
  SlidersHorizontal as SlidersHorizontalGlyph,
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

type LucideLikeProps = {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

function withAppIcon(
  Icon: any,
  defaults: Partial<LucideLikeProps> = {}
) {
  return function AppIcon({
    size = defaults.size ?? 18,
    className,
    ...rest
  }: LucideLikeProps) {
    return (
      <Icon
        size={size}
        className={className}
        strokeWidth={2.1}
        absoluteStrokeWidth
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      />
    );
  };
}

function svgDefaults(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
}

export function XwapIcon({ size = 18, className, ...rest }: LucideLikeProps) {
  return (
    <svg {...svgDefaults(size)} className={className} {...(rest as SVGProps<SVGSVGElement>)}>
      <path d="M6.75 9.25c1.2-1.3 3.32-1.3 4.52 0l.73.79.75-.79c1.2-1.3 3.3-1.3 4.5 0 1.23 1.33 1.23 3.45 0 4.77l-2.64 2.84a3 3 0 0 1-4.4 0l-2.71-2.9c-1.23-1.31-1.23-3.41 0-4.71Z" />
      <path d="m9.55 12.08 1.88 1.98a1.8 1.8 0 0 0 2.62 0l1.82-1.92" />
    </svg>
  );
}

export function DealIcon({ size = 18, className, ...rest }: LucideLikeProps) {
  return (
    <svg {...svgDefaults(size)} className={className} {...(rest as SVGProps<SVGSVGElement>)}>
      <path d="M6 7.75h6.25l5.75 5.75-5.5 5.5L6 12.5V7.75Z" />
      <circle cx="9.2" cy="10.8" r="1" />
      <path d="M12.35 11.25 15.8 14.7" />
    </svg>
  );
}

export const BackIcon = withAppIcon(ArrowLeftGlyph);
export const NextIcon = withAppIcon(ArrowRightGlyph);
export const PrevIcon = withAppIcon(ChevronLeftGlyph);
export const ForwardIcon = withAppIcon(ChevronRightGlyph);
export const CloseIcon = withAppIcon(XGlyph);
export const SearchIcon = withAppIcon(SearchGlyph);
export const NotificationIcon = withAppIcon(BellGlyph);
export const SavedIcon = withAppIcon(BookmarkGlyph);
export const SavedFilledIcon = withAppIcon(BookmarkCheckGlyph);
export const HomeIcon = withAppIcon(HomeGlyph);
export const ShopIcon = withAppIcon(ShoppingBagGlyph);
export const AddIcon = withAppIcon(PlusGlyph);
export const InboxIcon = withAppIcon(InboxGlyph);
export const ProfileIcon = withAppIcon(UserGlyph);
export const SortIcon = withAppIcon(ArrowUpDownGlyph);
export const NearbyIcon = withAppIcon(CrosshairGlyph);
export const FilterIcon = withAppIcon(SlidersHorizontalGlyph);
export const HashTagIcon = withAppIcon(HashGlyph);
export const RefreshIcon = withAppIcon(RefreshCwGlyph);
export const RefreshBackIcon = withAppIcon(RefreshCcwGlyph);
export const CameraIcon = withAppIcon(CameraGlyph);
export const TruckIcon = withAppIcon(TruckGlyph);
export const MapIcon = withAppIcon(MapPinnedGlyph);
export const MapPinIcon = withAppIcon(MapPinGlyph);
export const SendIcon = withAppIcon(SendGlyph);
export const MenuIcon = withAppIcon(MenuGlyph);
export const UsersIcon = withAppIcon(UsersRoundGlyph);
export const StoreIcon = withAppIcon(StoreGlyph);
export const LogoutIcon = withAppIcon(LogOutGlyph);
export const EditIcon = withAppIcon(Edit3Glyph);
export const DeleteIcon = withAppIcon(Trash2Glyph);
export const RepeatIcon = withAppIcon(RefreshCwGlyph);
export const TradeOnwardIcon = withAppIcon(RefreshCcwGlyph);
export const OfferChatIcon = withAppIcon(MessageSquareGlyph);
export const TradeActionIcon = withAppIcon(HandshakeGlyph);
export const ImageAddIcon = withAppIcon(ImagePlusGlyph);
export const GalleryIcon = withAppIcon(ImagesGlyph);
export const CashIcon = withAppIcon(BanknoteGlyph);
export const CreditIcon = withAppIcon(CircleDollarSignGlyph);
export const CheckIcon = withAppIcon(CheckGlyph);
export const SparklesIcon = withAppIcon(SparklesGlyph);
export const ShoppingCartIcon = withAppIcon(ShoppingCartGlyph);
export const DealBothIcon = withAppIcon(BadgePlusGlyph);
export const GiftIcon = withAppIcon(GiftGlyph);
export const WalletIcon = withAppIcon(WalletCardsGlyph);
export const PackageIcon = withAppIcon(PackageCheckGlyph);
export const SafetyIcon = withAppIcon(CheckCircle2Glyph);
export const TagIcon = withAppIcon(TagGlyph);

// Semantic aliases for app-wide vocabulary.
export const BackNavIcon = PrevIcon;
export const SearchNavIcon = SearchIcon;
export const SavedNavIcon = SavedIcon;
export const NotificationsNavIcon = NotificationIcon;
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
export const OfferActionIcon = DealIcon;
export const ChatActionIcon = OfferChatIcon;
export const XwapActionIcon = XwapIcon;
export const SwapDealIcon = RepeatIcon;
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
