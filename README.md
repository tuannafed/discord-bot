# Discord Crypto Tracker Bot

Bot Discord theo dõi coin theo vốn hóa và biến động giá/ngày. Xây với discord.js v14, TypeScript, Node.js 20+.

## Tính năng

- Giá realtime qua **Bybit** + dữ liệu thị trường đầy đủ qua **CoinMarketCap**
- Watchlist theo từng server
- Cảnh báo giá / vốn hóa có thời gian chờ giữa các lần nhắc
- Tự quét top tăng và theo dõi mục vốn hóa mục tiêu
- Nhiều khung thời gian cho giá & vốn hóa từng coin (`/coin`) và top biến động (`/movers`)
- Funding perpetual USDT Bybit (`/funding` và một dòng **Funding:** trên `/positions`)
- **Kèo nhóm** — tạo kèo, theo dõi ai đang theo kèo, PnL% realtime khi TP/CL

## Lệnh

### `/ping`
Kiểm tra bot còn chạy.

---

### `/coin`
Giá, vốn hóa, hạng, thay đổi theo khung thời gian chọn, và thông tin cung.

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `symbol` | chuỗi | Có | — | Ký hiệu coin (vd. `btc`, `eth`) |
| `timeframe` | lựa chọn | Không | *(CMC 24h)* | `15 minutes` / `1 hour` / `4 hours` / `24 hours` |

**Ví dụ:**
```
/coin symbol:btc
/coin symbol:eth timeframe:1 hour
```

**Đầu ra (có khung thời gian):** giá, vốn hóa, hạng, cung, v.v. theo format bot.

> **Lưu ý:** `15m` / `1h` / `4h` lấy kline từ Bybit (~2–5s). Không chọn khung thì dùng dữ liệu 24h của CoinMarketCap.

---

### `/top`
Top coin xếp theo vốn hóa (chỉ coin có trên Bybit).

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `limit` | số nguyên | Không | `10` | Số coin (1–25) |

**Ví dụ:** `/top limit:20`

---

### `/movers`
Top tăng/giảm mạnh theo giá hoặc vốn hóa trong khung thời gian.

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `metric` | lựa chọn | Không | `price` | `price` hoặc `market_cap` |
| `timeframe` | lựa chọn | Không | `24h` | `15 minutes` / `1 hour` / `4 hours` / `24 hours` |
| `type` | lựa chọn | Không | `both` | `gainers` / `losers` / `both` |
| `limit` | số nguyên | Không | `5` | Số coin mỗi nhóm (1–10) |

**Ví dụ:**
```
/movers
/movers metric:price timeframe:15 minutes type:gainers limit:10
/movers metric:cap timeframe:1 hour type:both limit:5
```

> **Lưu ý:** `15m` / `1h` / `4h` gọi kline từng coin (~5–10s). `24h` dùng cache, nhanh hơn.

---

### `/scan`
Lọc coin có trên Bybit trong khoảng vốn hóa (CoinMarketCap, quét top 500).

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `min_cap` | số | Có | — | Vốn tối thiểu (USD) |
| `max_cap` | số | Có | — | Vốn tối đa (USD) |
| `limit` | số nguyên | Không | `10` | Tối đa kết quả (1–25) |

**Ví dụ:** `/scan min_cap:70000000 max_cap:100000000`

---

### `/funding`
Perpetual USDT **Bybit** (linear): **rate** hiện tại, **lần funding tới** (giờ **ICT UTC+7**), **hai kỳ thanh toán gần nhất**. Không hiển thị APR năm.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `symbol` | chuỗi | Có | Ký hiệu gốc (vd. `btc`, `eth`, `sol`) |

**Ví dụ:** `/funding symbol:btc`

---

### `/watch-add`
Thêm coin vào watchlist của server.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `symbol` | chuỗi | Có | Ký hiệu coin |

**Ví dụ:** `/watch-add symbol:eth`

---

### `/watch-remove`
Xóa coin khỏi watchlist.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `symbol` | chuỗi | Có | Ký hiệu coin |

**Ví dụ:** `/watch-remove symbol:eth`

---

### `/watch-list`
Xem toàn bộ watchlist kèm giá, vốn hóa, % 24h.

---

### `/alert-add`
Tạo cảnh báo khi giá hoặc vốn hóa vượt ngưỡng. Tin nhắn cảnh báo gửi vào kênh nơi gõ lệnh.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `symbol` | chuỗi | Có | Ký hiệu coin |
| `metric` | lựa chọn | Có | `price` hoặc `market_cap` |
| `condition` | lựa chọn | Có | `above` / `below` (USD cố định) hoặc `change_up` / `change_down` (% so với lúc đặt) |
| `threshold` | số | Có | USD (với above/below) hoặc % 1–100 (với change_up/down) |

**Ví dụ:**
```
/alert-add symbol:btc metric:price condition:above threshold:100000
/alert-add symbol:eth metric:price condition:change_up threshold:3
/alert-add symbol:sol metric:market_cap condition:change_down threshold:5
```

---

### `/alert-list`
Xem cảnh báo đang bật trong server (có `id` để xóa).

---

### `/alert-remove`
Xóa cảnh báo theo `id`.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | chuỗi | Có | ID từ `/alert-list` |

**Ví dụ:** `/alert-remove id:abc123`

---

### `/candidate-list`
Xem coin đang theo dõi theo mục vốn. Lọc theo trạng thái.

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `status` | lựa chọn | Không | `tracking` | `tracking` / `hit_target` / `expired` |

**Ví dụ:** `/candidate-list status:tracking`

---

### `/candidate-remove`
Xóa một candidate khỏi danh sách.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | chuỗi | Có | ID từ `/candidate-list` |

**Ví dụ:** `/candidate-remove id:abc123`

---

### `/unlock`
Tổng quan cung & unlock token.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `symbol` | chuỗi | Có | Ký hiệu coin (vd. `apt`, `arb`) |

**Ví dụ:** `/unlock symbol:apt`

---

### `/call`
Tạo kèo future cho cả nhóm.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `symbol` | chuỗi | Có | Ký hiệu (vd. `BTC`, `ETH`) |
| `direction` | lựa chọn | Có | `long` hoặc `short` |
| `price` | số | Có | Giá call (USD) |

**Ví dụ:** `/call symbol:BTC direction:long price:70000`

---

### `/follow`
Vào lệnh theo kèo đang active (chọn kèo từ gợi ý).

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `call_id` | chuỗi | Có | Chọn từ danh sách |
| `entry` | số | Có | Giá vào lệnh (USD) |

**Ví dụ:** `/follow call_id:[chọn] entry:69500`

---

### `/positions`
Kèo đang active, **chỉ hiển thị người còn mở lệnh**; mỗi kèo có dòng funding (nếu có) + bảng Entry / Lev / PnL.

---

### `/positions-history`
Giống bố cục `/positions` nhưng **đủ mọi người**, kể cả đã TP/CL/SL.

---

### `/positions-clean`
*(Quản trị — cần `ADMIN_LIST_ID` trong env)*  
Xóa trong CSDL các bản ghi position đã đóng và xóa trạng thái đóng của caller trên kèo được chọn.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `call_id` | chuỗi | Có | Chọn kèo từ gợi ý |

---

### `/tp` / `/cl` / `/sl`
Đóng lệnh (chốt lời / cắt lỗ / stop loss). Giá lấy từ Bybit.  
Validation: TP chỉ khi PnL không âm; CL/SL chỉ khi PnL không dương (xem code).

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `call_id` | chuỗi | Có | Chọn kèo |

---

### `/help`
Chỉ các lệnh **nhóm kèo** (rút gọn). Tin nhắn chỉ mình bạn thấy.

### `/help-full`
Danh sách **đầy đủ** mọi lệnh bot (thị trường, watchlist, cảnh báo, kèo, candidate, …). Cũng chỉ mình bạn thấy.

---

## Cài đặt

### 1. Yêu cầu

- Node.js 20+
- Ứng dụng Discord + bot token — [Discord Developer Portal](https://discord.com/developers/applications)
- API key CoinMarketCap — [coinmarketcap.com/api](https://coinmarketcap.com/api/) (bản miễn phí dùng được)
- API key Bybit (tùy chọn, làm giá realtime mượt hơn)

### 2. Cài dependency

```bash
yarn install
```

### 3. Biến môi trường

```bash
cp .env.example .env
```

Chỉnh `.env` — xem bảng **Biến môi trường** ở phần dưới.

### 4. Đăng ký lệnh slash

```bash
yarn register
```

Chạy sau khi cài, và mỗi khi thêm/sửa lệnh.  
Có `DISCORD_GUILD_ID`: đăng ký ngay cho server đó (có thể nhiều ID, cách nhau dấu phẩy).  
Không có: đăng ký global (~1 giờ mới lan hết).

### 5. Chạy

```bash
yarn dev                   # dev (hot reload)
yarn build && yarn start   # production
```

---

## Triển khai Railway

1. Đẩy code lên GitHub
2. Tạo project Railway → deploy từ repo
3. Thêm dịch vụ **PostgreSQL** → nối `DATABASE_URL` vào service bot (Variable Reference)
4. Đặt biến môi trường bắt buộc
5. Deploy — bot tự tạo bảng DB lần chạy đầu

---

## Việc định kỳ (cron)

| Lịch | Việc |
|---|---|
| Mỗi 5 phút | Kiểm tra cảnh báo, gửi thông báo Discord |
| Mỗi 6 giờ | Làm mới dữ liệu candidate |
| 8:00 UTC mỗi ngày | Quét top tăng, thêm candidate mới |

Đặt `CANDIDATE_ALERT_CHANNEL_ID` để bật thông báo candidate.

---

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|
| `DISCORD_TOKEN` | Có | — | Token bot |
| `DISCORD_CLIENT_ID` | Có | — | Application ID |
| `DISCORD_GUILD_ID` | Không | — | ID server để đăng ký lệnh tức thì (nhiều ID cách phẩy) |
| `ADMIN_LIST_ID` | Không | — | User ID Discord được dùng lệnh quản trị (vd. `/positions-clean`), cách phẩy |
| `COINMARKETCAP_API_KEY` | Có | — | API key CMC |
| `BYBIT_API_KEY` | Không | — | Giá realtime Bybit |
| `DATABASE_URL` | Không | — | Chuỗi PostgreSQL (nên dùng production) |
| `DATA_DIR` | Không | `src/data/` | Thư mục lưu JSON (vd. volume Railway `/data`) |
| `ENABLE_AI_CHAT` | Không | `false` | Bật chat AI khi @bot (cần thêm `LLM_*`) |
| `LLM_API_KEY` | Không | — | Chat AI (OpenAI-compatible hoặc Anthropic) |
| `LLM_PROVIDER` | Không | openai | `anthropic` cho Claude |
| `LLM_BASE_URL` / `LLM_MODEL` / … | Không | — | Xem `.env.example` |
| `ALERT_COOLDOWN_MINUTES` | Không | `60` | Phút tối thiểu giữa hai lần nhắc cùng cảnh báo |
| `CANDIDATE_ALERT_CHANNEL_ID` | Không | — | Kênh thông báo candidate |
| `CANDIDATE_TARGET_MARKET_CAP` | Không | `1000000000` | Mục vốn ($1B) |
| `CANDIDATE_TRACKING_DAYS` | Không | `7` | Ngày theo dõi candidate |
| `CANDIDATE_MIN_CHANGE_24H` | Không | `10` | % tối thiểu 24h để vào candidate |
| `CANDIDATE_SCAN_SIZE` | Không | `100` | Số top tăng quét mỗi ngày |

Chi tiết đầy đủ: `.env.example`.

---

## Lưu trữ dữ liệu

- **PostgreSQL** (khuyên dùng production) — đặt `DATABASE_URL`, bảng tự tạo khi khởi động.
- **File JSON** (dev local) — dữ liệu trong `src/data/`, không cần DB.

---

## Giấy phép

MIT
