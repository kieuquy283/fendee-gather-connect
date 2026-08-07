# Fendee Connect

Thiết kế app mobile tên Fendee cho người trẻ, phong cách dark red / black gradient theo logo và demo UI đã cung cấp. App giúp người dùng chia sẻ trạng thái ngắn kèm vị trí, mời bạn bè đến gặp (Gather), khám phá người đang Public ở gần, và kết nối dựa trên profile, sở thích, “Tôi có thể giúp gì” và “Tôi đang cần giúp gì”. App không phải app hẹn hò, không theo dõi vị trí liên tục, không cho phép tương tác vô danh hoàn toàn.

Tạo full flow từ splash, onboarding, signup/login, setup profile, add friend qua link/QR, home feed, create Gather, chọn người nhận, chọn thời lượng, preview, Gather detail, Nearby discovery, filters, other profile, friend requests, friends list, chat, notifications, privacy settings, block/report. Dùng bottom navigation gồm Home, Nearby, Gather, Chat, Profile. Tập trung UX privacy-first: vị trí mặc định tắt, Public/Nearby phải bật chủ động, không hiển thị tọa độ chính xác cho người lạ, chỉ hiển thị khoảng cách tương đối, “Ẩn khỏi Nearby” không phải “Ẩn danh”. Tạo đầy đủ empty states, permission states, expired states.

Thiết kế thêm widget ngoài home screen của điện thoại. Widget là bản thu nhỏ của app, hiển thị nhanh Gather của bạn bè hoặc một người có độ phù hợp cao trong phạm vi. Thiết kế small / medium / large widget với deep link vào app. Small widget hiển thị 1 update ưu tiên, medium hiển thị 2–3 thẻ, large hiển thị danh sách ngắn và CTA nhanh như “Tạo Gather” và “Xem Nearby”.

Hãy tạo UI kit đồng bộ, màn hình high-fidelity, prototype flow hoàn chỉnh, visual trẻ trung hiện đại, card bo tròn, avatar tròn, text tiếng Việt, CTA rõ ràng, ưu tiên hành động nhanh trong 10–15 giây.

dựa trên logo cung cấp, theme chủ yếu được sử dụng là dark và light như các sản phẩm hiện nay, chỉ một số thành phần, button nhỏ có màu đỏ như logo

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fendee-gather-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e0fecdd6-39d0-456f-b034-096e4f38fcaf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
