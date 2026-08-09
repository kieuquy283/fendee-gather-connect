# Fendee

Fendee là frontend mobile-first cho các luồng:

- Nearby và hiện diện theo khu vực gần đúng
- Snapshot vị trí một lần cho bạn bè
- Gather với mô hình `Cùng tạo` và `Mời tham gia`
- Chat, hồ sơ, bạn bè, thông báo, quyền riêng tư và widget

Ứng dụng hiện vẫn là frontend prototype chạy được cục bộ. Không có backend production, không có nhà cung cấp danh tính thật, không có thực thi quyền trên server, và không có hạ tầng presence/push thực.

## Môi trường phát triển

Yêu cầu:

- Node.js 20+
- npm

Chạy local:

```sh
npm install
npm run dev
```

Build và kiểm tra:

```sh
npm run typecheck
npm run lint
npm run build
npm run test:gather
npm run test:gather:visual
npm run test:e2e
```

## Ghi chú sản phẩm

Một số nguyên tắc Fendee đang được giữ cố định trong frontend:

- Nearby không phải bản đồ.
- Người lạ chỉ thấy khoảng cách tương đối và nhãn địa điểm gần đúng.
- Bạn bè thấy snapshot vị trí chia sẻ thủ công, không phải theo dõi liên tục.
- Gather phân biệt rõ co-host và người được mời.
- Block/report/privacy hiện mới là logic frontend để phục vụ QA và prototype UX.

## Cấu trúc chính

- `src/routes/`: các màn hình ứng dụng
- `src/components/fendee/`: shell, card, sheet, Nearby, Presence, Gather UI
- `src/lib/`: auth dev adapter, privacy store, presence store, gather store, authorization policies
- `tests/gather-v2/`: Playwright functional, visual và E2E coverage
- `reports/mobile-review/`: báo cáo review và bằng chứng Phase A/B/C

## Lovable

Repo này đang đồng bộ với Lovable. Tránh rewrite lịch sử đã push như rebase/squash/amend trên commit đã được publish.
