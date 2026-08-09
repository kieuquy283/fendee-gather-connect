// Presence model: "Trạm hiện tại + Dòng hiện diện"
// No map, no coordinates, no match percentages — only relative distance and
// concrete reasons why two people might be worth connecting.

import { makeAvatarDataUri } from "./avatar";

export type PresenceState = "gather" | "public" | "friends" | "stale";

export type PresencePerson = {
  id: string;
  name: string;
  age: number;
  role: string;
  avatar: string;
  short: string;
  status: string;
  distance: string;
  publicLeft: string;
  presence: PresenceState;
  isFriend: boolean;
  mutual: number;
  sameStation: boolean;
  canHelp: string;
  needHelp: string;
  reasons: string[];
  interests: string[];
};

const face = (seed: string, name: string) => makeAvatarDataUri(name, seed);

export const station = {
  name: "The Coffee House Thái Hà",
  publicLeft: "Public còn 52 phút",
  updated: "Cập nhật 2 phút trước",
  friends: 3,
  matches: 8,
  gathers: 2,
};

export const presencePeople: PresencePerson[] = [
  {
    id: "minhtu",
    name: "Minh Tú",
    age: 21,
    role: "Sinh viên Kiến trúc",
    avatar: face("minhtu", "Minh Tú"),
    short: "Làm đồ án",
    status: "Đang ngồi làm đồ án ở quán cafe",
    distance: "Dưới 1 km",
    publicLeft: "Public còn 35 phút",
    presence: "public",
    isFriend: true,
    mutual: 4,
    sameStation: true,
    canHelp: "SketchUp",
    needHelp: "Review phối cảnh",
    reasons: ["Cùng làm thiết kế", "Cùng địa điểm"],
    interests: ["Sketch", "Cà phê", "Triển lãm"],
  },
  {
    id: "hailang",
    name: "Hải Đăng",
    age: 23,
    role: "Frontend Developer",
    avatar: face("hailang", "Hải Đăng"),
    short: "Có Gather",
    status: "Ngồi tầng 2, có ổ cắm, ai rảnh qua làm việc cùng",
    distance: "Cùng địa điểm",
    publicLeft: "Public còn 1 giờ 10 phút",
    presence: "gather",
    isFriend: true,
    mutual: 12,
    sameStation: true,
    canHelp: "Review code React",
    needHelp: "Bạn chạy bộ 5 km",
    reasons: ["Có Gather đang mở", "Có 12 bạn chung"],
    interests: ["Code", "Cà phê", "Indie game"],
  },
  {
    id: "hoanglan",
    name: "Hoàng Lan",
    age: 20,
    role: "Sinh viên Ngoại thương",
    avatar: face("hoanglan", "Hoàng Lan"),
    short: "Đang học",
    status: "Ôn thi cuối kỳ, cần chỗ yên tĩnh",
    distance: "1–3 km",
    publicLeft: "Public còn 20 phút",
    presence: "public",
    isFriend: false,
    mutual: 2,
    sameStation: false,
    canHelp: "Tìm tài liệu triết học",
    needHelp: "Bạn học nhóm buổi tối",
    reasons: ["Cùng trường cũ", "Give & Need khớp nhau"],
    interests: ["Sách", "Trà", "Triết học"],
  },
  {
    id: "tuananh",
    name: "Tuấn Anh",
    age: 24,
    role: "Product Analyst",
    avatar: face("tuananh", "Tuấn Anh"),
    short: "Tìm teammate",
    status: "Đang tìm teammate cho một side project data",
    distance: "Dưới 1 km",
    publicLeft: "Chỉ bạn bè · còn 40 phút",
    presence: "friends",
    isFriend: true,
    mutual: 6,
    sameStation: false,
    canHelp: "Phân tích SQL",
    needHelp: "Người làm UI cho side project",
    reasons: ["Có 6 bạn chung", "Give & Need khớp nhau"],
    interests: ["Data", "Board game", "Phở"],
  },
  {
    id: "khanhvy",
    name: "Khánh Vy",
    age: 22,
    role: "Marketing Intern",
    avatar: face("khanhvy", "Khánh Vy"),
    short: "Trạng thái cũ",
    status: "Đi bộ buổi tối quanh khu này",
    distance: "1–3 km",
    publicLeft: "Cập nhật 46 phút trước",
    presence: "stale",
    isFriend: true,
    mutual: 3,
    sameStation: false,
    canHelp: "Chỉnh caption content",
    needHelp: "Bạn chạy bộ buổi sáng",
    reasons: ["Cùng sở thích chạy bộ"],
    interests: ["Chạy bộ", "Podcast", "Cà phê"],
  },
  {
    id: "gialong",
    name: "Gia Long",
    age: 25,
    role: "Nhiếp ảnh tự do",
    avatar: face("gialong", "Gia Long"),
    short: "Đang chụp",
    status: "Rảnh 2 tiếng, muốn chụp thử vài shot chân dung",
    distance: "1–3 km",
    publicLeft: "Public còn 55 phút",
    presence: "public",
    isFriend: false,
    mutual: 1,
    sameStation: false,
    canHelp: "Chụp ảnh chân dung",
    needHelp: "Người mẫu chụp thử",
    reasons: ["Give & Need khớp nhau"],
    interests: ["Chụp ảnh film", "Cà phê", "Xe máy"],
  },
];

export const getPresence = (id: string) => presencePeople.find((p) => p.id === id);

export type PresenceGather = {
  id: string;
  hostId: string;
  activity: string;
  place: string;
  time: string;
  note: string;
  going: number;
  maybe: number;
  tag: "direct" | "expiring" | "mutual" | "station";
  atStation: boolean;
};

export const presenceGathers: PresenceGather[] = [
  {
    id: "g1",
    hostId: "hailang",
    activity: "Làm việc chung 2 tiếng",
    place: "The Coffee House Thái Hà",
    time: "Đến 21:30",
    note: "Mình ngồi tầng 2, có ổ cắm. Ai rảnh qua ngồi cho vui.",
    going: 3,
    maybe: 2,
    tag: "direct",
    atStation: true,
  },
  {
    id: "g2",
    hostId: "minhtu",
    activity: "Đi bộ vòng công viên",
    place: "Công viên Thống Nhất",
    time: "Còn 18 phút",
    note: "Cần người đi bộ nói chuyện linh tinh 30 phút.",
    going: 1,
    maybe: 3,
    tag: "expiring",
    atStation: false,
  },
  {
    id: "g3",
    hostId: "tuananh",
    activity: "Board game tối nay",
    place: "Dreamplex Láng Hạ",
    time: "19:30 hôm nay",
    note: "Đủ 4 người là chơi Catan.",
    going: 2,
    maybe: 1,
    tag: "mutual",
    atStation: false,
  },
];

export const gatherTagLabel: Record<PresenceGather["tag"], string> = {
  direct: "Gửi trực tiếp cho bạn",
  expiring: "Sắp hết hạn",
  mutual: "Có bạn chung",
  station: "Tại trạm của bạn",
};

export type ActivityCluster = {
  id: string;
  label: string;
  count: number;
  hint: string;
  ids: string[];
};

export const activityClusters: ActivityCluster[] = [
  {
    id: "study",
    label: "đang học hoặc làm project",
    count: 5,
    hint: "Phần lớn ở quanh Thái Hà",
    ids: ["minhtu", "hoanglan", "hailang"],
  },
  {
    id: "team",
    label: "đang tìm teammate",
    count: 3,
    hint: "Side project, cuộc thi, nhóm học",
    ids: ["tuananh", "gialong"],
  },
  {
    id: "friends",
    label: "bạn bè đang gần đây",
    count: 4,
    hint: "Đang bật hiện diện trong 1 giờ tới",
    ids: ["hailang", "minhtu", "tuananh", "khanhvy"],
  },
];

export const stationFilters = [
  "Cùng địa điểm",
  "Dưới 1 km",
  "1–3 km",
  "Bạn bè",
  "Bạn chung",
  "Cùng trường",
  "Cùng nghề",
  "Cùng sở thích",
  "Give & Need phù hợp",
  "Có Gather đang mở",
];

export const presenceDurations = ["30 phút", "1 giờ", "2 giờ", "Giờ tự chọn"];

// --- Nearby: relative proximity visualization (NOT a map) ---
// x/y are relative percentages inside the 100m frame, purely spatial hints.
export type NearbyMarker = {
  id: string;
  x: number;
  y: number;
  meters: number;
  place: string;
};

export const nearbyMarkers: NearbyMarker[] = [
  { id: "hailang", x: 30, y: 26, meters: 15, place: "The Coffee House Thái Hà" },
  { id: "minhtu", x: 70, y: 34, meters: 40, place: "The Coffee House Thái Hà" },
  { id: "gialong", x: 22, y: 68, meters: 65, place: "Vỉa hè Thái Hà" },
  { id: "hoanglan", x: 76, y: 72, meters: 90, place: "Thư viện Láng Hạ" },
];

export const nearbyFar = ["tuananh", "khanhvy"];
