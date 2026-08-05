export type Availability = "public" | "friends" | "hidden";

export type Person = {
  id: string;
  name: string;
  age: number;
  bio: string;
  avatar: string;
  distance: string;
  place: string;
  online: boolean;
  isFriend: boolean;
  visibility: Availability;
  interests: string[];
  canHelp: string[];
  needHelp: string[];
  match: number;
};

const face = (seed: string) => `https://i.pravatar.cc/240?u=fendee-${seed}`;

export const me = {
  id: "me",
  name: "Vũ Minh",
  age: 22,
  handle: "@vuminh",
  bio: "Sinh viên Ngân hàng · thích cà phê sáng",
  avatar: face("me"),
  interests: ["Cà phê", "UI/UX", "Chạy bộ", "Board game"],
  canHelp: ["Setup mô hình định giá", "Review CV", "Chụp ảnh film"],
  needHelp: ["Tìm tài liệu triết học", "Bạn tập gym buổi sáng"],
  friends: 142,
  visibility: "friends" as Availability,
};

export const people: Person[] = [
  {
    id: "hailang",
    name: "Hải Đăng",
    age: 23,
    bio: "Dev frontend, hay ngồi cafe làm việc",
    avatar: face("hailang"),
    distance: "Cách 100m",
    place: "The Coffee House Nguyễn Du",
    online: true,
    isFriend: true,
    visibility: "public",
    interests: ["Cà phê", "Code", "Indie game"],
    canHelp: ["Review code React", "Chia sẻ tài liệu FE"],
    needHelp: ["Bạn chạy bộ 5km"],
    match: 92,
  },
  {
    id: "minhtu",
    name: "Minh Tú",
    age: 21,
    bio: "Sinh viên Kiến trúc, mê sketch",
    avatar: face("minhtu"),
    distance: "Cách 450m",
    place: "Thư viện trường",
    online: true,
    isFriend: true,
    visibility: "friends",
    interests: ["Sketch", "Triển lãm", "Cà phê"],
    canHelp: ["Hướng dẫn dựng 3D cơ bản"],
    needHelp: ["Người mẫu chụp thử"],
    match: 84,
  },
  {
    id: "tuananh",
    name: "Tuấn Anh",
    age: 24,
    bio: "Product analyst, thích board game",
    avatar: face("tuananh"),
    distance: "Cách 800m",
    place: "Co-working Dreamplex",
    online: false,
    isFriend: true,
    visibility: "public",
    interests: ["Board game", "Data", "Phở"],
    canHelp: ["Setup mô hình định giá", "Phân tích SQL"],
    needHelp: ["Tìm nhóm board game tối thứ 5"],
    match: 78,
  },
  {
    id: "hoanglan",
    name: "Hoàng Lan",
    age: 20,
    bio: "Admin cộng đồng đọc sách",
    avatar: face("hoanglan"),
    distance: "Cách 1.2km",
    place: "Đang ở quanh Quận 3",
    online: false,
    isFriend: false,
    visibility: "public",
    interests: ["Sách", "Triết học", "Trà"],
    canHelp: ["Tìm tài liệu triết học", "Tổ chức club đọc"],
    needHelp: ["Bạn đi hội sách cuối tuần"],
    match: 88,
  },
  {
    id: "khanhvy",
    name: "Khánh Vy",
    age: 22,
    bio: "Marketing intern, hay đi bộ buổi tối",
    avatar: face("khanhvy"),
    distance: "Cách ~2km",
    place: "Khu vực Quận 1",
    online: true,
    isFriend: false,
    visibility: "public",
    interests: ["Chạy bộ", "Podcast", "Cà phê"],
    canHelp: ["Chỉnh caption content"],
    needHelp: ["Bạn chạy bộ buổi sáng"],
    match: 71,
  },
  {
    id: "gialong",
    name: "Gia Long",
    age: 25,
    bio: "Nhiếp ảnh tự do",
    avatar: face("gialong"),
    distance: "Cách ~3km",
    place: "Khu vực Bình Thạnh",
    online: false,
    isFriend: false,
    visibility: "public",
    interests: ["Chụp ảnh film", "Cà phê", "Xe máy"],
    canHelp: ["Chụp ảnh chân dung miễn phí"],
    needHelp: ["Chỗ rửa film giá tốt"],
    match: 65,
  },
];

export type Gather = {
  id: string;
  hostId: string;
  title: string;
  note: string;
  place: string;
  distance: string;
  startsIn: string;
  duration: string;
  expiresAt: string;
  audience: "friends" | "public" | "selected";
  joined: string[];
  slots: number;
  status: "live" | "expired";
};

export const gathers: Gather[] = [
  {
    id: "g1",
    hostId: "hailang",
    title: "Cà phê làm việc chung 2 tiếng",
    note: "Mình ngồi tầng 2, có ổ cắm. Ai rảnh qua ngồi cho vui.",
    place: "The Coffee House Nguyễn Du",
    distance: "Cách 100m",
    startsIn: "Bắt đầu trong 15 phút",
    duration: "2 giờ",
    expiresAt: "Hết hạn 16:30",
    audience: "friends",
    joined: ["minhtu", "tuananh"],
    slots: 4,
    status: "live",
  },
  {
    id: "g2",
    hostId: "minhtu",
    title: "Đi bộ vòng công viên",
    note: "Cần người đi bộ nói chuyện linh tinh 30 phút.",
    place: "Công viên Tao Đàn",
    distance: "Cách 450m",
    startsIn: "Đang diễn ra",
    duration: "45 phút",
    expiresAt: "Hết hạn 18:00",
    audience: "public",
    joined: ["hailang"],
    slots: 3,
    status: "live",
  },
  {
    id: "g3",
    hostId: "tuananh",
    title: "Board game tối thứ 5",
    note: "Đủ 4 người là chơi Catan.",
    place: "Dreamplex Nguyễn Trung Ngạn",
    distance: "Cách 800m",
    startsIn: "19:30 hôm nay",
    duration: "3 giờ",
    expiresAt: "Hết hạn 22:30",
    audience: "selected",
    joined: [],
    slots: 4,
    status: "live",
  },
  {
    id: "g0",
    hostId: "hoanglan",
    title: "Đọc sách chung buổi sáng",
    note: "Đã kết thúc, cảm ơn mọi người.",
    place: "Thư viện Khoa học Tổng hợp",
    distance: "Cách 1.2km",
    startsIn: "Hôm qua 09:00",
    duration: "2 giờ",
    expiresAt: "Đã hết hạn",
    audience: "public",
    joined: ["minhtu"],
    slots: 5,
    status: "expired",
  },
];

export type StatusPost = {
  id: string;
  authorId: string;
  text: string;
  place: string;
  distance: string;
  time: string;
  canHelp?: string;
  needHelp?: string;
  reactions: number;
};

export const feed: StatusPost[] = [
  {
    id: "s1",
    authorId: "hailang",
    text: "Đang code ở quán quen, ai ghé thì ới mình nhé ☕",
    place: "The Coffee House Nguyễn Du",
    distance: "Cách 100m",
    time: "5 phút trước",
    canHelp: "Review code React",
    needHelp: "Bạn chạy bộ 5km",
    reactions: 8,
  },
  {
    id: "s2",
    authorId: "minhtu",
    text: "Trưa nay rảnh 1 tiếng, muốn đi bộ cho tỉnh ngủ.",
    place: "Thư viện trường",
    distance: "Cách 450m",
    time: "22 phút trước",
    needHelp: "Người mẫu chụp thử",
    reactions: 3,
  },
  {
    id: "s3",
    authorId: "tuananh",
    text: "Có ai cần dựng mô hình định giá không, mình rảnh tối nay.",
    place: "Dreamplex",
    distance: "Cách 800m",
    time: "1 giờ trước",
    canHelp: "Setup mô hình định giá",
    reactions: 12,
  },
];

export type Conversation = {
  id: string;
  personId: string;
  last: string;
  time: string;
  unread: number;
};

export const conversations: Conversation[] = [
  { id: "c1", personId: "hailang", last: "Ok mình giữ chỗ nha", time: "2 phút", unread: 2 },
  { id: "c2", personId: "minhtu", last: "Mai đi sớm chút được không?", time: "18 phút", unread: 0 },
  { id: "c3", personId: "tuananh", last: "Đã tham gia Gather của bạn", time: "1 giờ", unread: 0 },
];

export const messages: Record<string, { from: "me" | "them"; text: string; time: string }[]> = {
  c1: [
    { from: "them", text: "Ê mình đang ở The Coffee House nè", time: "14:02" },
    { from: "me", text: "Ngồi tầng mấy đó?", time: "14:03" },
    { from: "them", text: "Tầng 2 gần cửa sổ, có ổ cắm", time: "14:03" },
    { from: "me", text: "15 phút nữa mình qua", time: "14:05" },
    { from: "them", text: "Ok mình giữ chỗ nha", time: "14:06" },
  ],
  c2: [
    { from: "them", text: "Mai đi sớm chút được không?", time: "09:12" },
    { from: "me", text: "7h30 nha", time: "09:15" },
  ],
  c3: [{ from: "them", text: "Đã tham gia Gather của bạn", time: "13:20" }],
};

export type Notice = {
  id: string;
  type: "gather" | "friend" | "nearby" | "system";
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

export const notifications: Notice[] = [
  {
    id: "n1",
    type: "gather",
    title: "Hải Đăng vừa tạo Gather",
    body: "Cà phê làm việc chung · Cách 100m · còn 4 chỗ",
    time: "5 phút",
    unread: true,
  },
  {
    id: "n2",
    type: "friend",
    title: "Khánh Vy gửi lời mời kết bạn",
    body: "Có 3 sở thích chung với bạn",
    time: "30 phút",
    unread: true,
  },
  {
    id: "n3",
    type: "nearby",
    title: "2 người bạn đang Public gần bạn",
    body: "Bật Nearby để xem ai đang ở quanh đây",
    time: "1 giờ",
    unread: false,
  },
  {
    id: "n4",
    type: "system",
    title: "Gather “Đọc sách chung” đã hết hạn",
    body: "Trạng thái và vị trí kèm theo đã được xoá",
    time: "Hôm qua",
    unread: false,
  },
];

export const friendRequests = [
  { id: "khanhvy", mutual: 4, reason: "3 sở thích chung" },
  { id: "gialong", mutual: 1, reason: "Cùng khu vực Bình Thạnh" },
  { id: "hoanglan", mutual: 7, reason: "Có thể giúp bạn: Tìm tài liệu triết học" },
];

export const getPerson = (id: string) => people.find((p) => p.id === id);
export const getGather = (id: string) => gathers.find((g) => g.id === id);
