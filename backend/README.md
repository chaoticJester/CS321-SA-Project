# Purchase Request Approval Backend

Backend สำหรับระบบสร้างและอนุมัติใบขอซื้อ (Purchase Request หรือ PR) พัฒนาด้วย Express, TypeScript และ MySQL

## การติดตั้งและเริ่มระบบ

ต้องมี Node.js, npm และ MySQL

```bash
npm install
```

คัดลอก `.env.example` เป็น `.env` แล้วตั้งค่าต่อไปนี้

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pr_approval
JWT_SECRET=replace_with_a_strong_secret
```

สร้างโครงสร้างและข้อมูลตัวอย่างตามลำดับ:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p pr_approval < database/seed_data.sql
mysql -u root -p pr_approval < database/add_pr_number_reservations.sql
```

`schema.sql` ยังไม่มีตารางจองเลข จึงต้องรัน `add_pr_number_reservations.sql` ด้วย โดยรันหลัง seed เพื่อให้ตัวนับเริ่มจากเลข PR สูงสุดที่มีอยู่ หากใช้ฐานข้อมูลเดิม ให้รันเฉพาะไฟล์เพิ่มตารางนี้หนึ่งครั้งในช่วงที่ไม่มีการสร้าง PR หรือจองเลข ไม่ต้องรัน schema/seed ซ้ำ ไฟล์นี้ใช้ `USE pr_approval` หากเปลี่ยนชื่อฐานข้อมูลต้องปรับให้ตรงกัน

สำหรับ PowerShell ที่ไม่รองรับ input redirection แบบ `<` สามารถเปิด MySQL client แล้วใช้คำสั่งต่อไปนี้จาก directory `backend`:

```sql
SOURCE database/schema.sql;
SOURCE database/seed_data.sql;
SOURCE database/add_pr_number_reservations.sql;
```

หากสร้างฐานข้อมูลไว้ก่อนที่จะเพิ่ม API รายการคำขอ ให้เพิ่ม index นี้หนึ่งครั้ง (ฐานข้อมูลใหม่ที่สร้างจาก `schema.sql` มี index นี้แล้ว):

```sql
CREATE INDEX idx_pr_requester_status_created
ON pr (requester_id, status, created_at);
```

เริ่มเซิร์ฟเวอร์สำหรับพัฒนา:

```bash
npm run dev
```

หรือ build และรัน production build:

```bash
npm run build
npm start
```

ค่าเริ่มต้นของ Base URL คือ `http://localhost:3000`

## ใช้ MySQL ผ่าน Docker

Repository ปัจจุบันยังไม่มี `Dockerfile` หรือ `compose.yaml` ขั้นตอนนี้จึงใช้ Docker สำหรับ MySQL และรัน backend บนเครื่องด้วย npm

คำสั่งตัวอย่างใช้รหัสผ่านสำหรับ development เท่านั้น ควรเปลี่ยนรหัสผ่านและ `JWT_SECRET` ก่อนใช้ใน environment จริง หาก port `3306` ถูกใช้อยู่แล้ว ให้เปลี่ยน mapping เป็น `-p 3307:3306` และตั้ง `DB_PORT=3307`

### 1. สร้าง MySQL container

```bash
docker run -d \
  --name pr-approval-mysql \
  -e MYSQL_ROOT_PASSWORD=devpassword123 \
  -e MYSQL_DATABASE=pr_approval \
  -p 3306:3306 \
  -v pr-approval-mysql-data:/var/lib/mysql \
  mysql:8.4
```

ใน PowerShell ต้องใช้ backtick แทน `\` หรือเขียนเป็นบรรทัดเดียว:

```powershell
docker run -d --name pr-approval-mysql -e MYSQL_ROOT_PASSWORD=devpassword123 -e MYSQL_DATABASE=pr_approval -p 3306:3306 -v pr-approval-mysql-data:/var/lib/mysql mysql:8.4
```

รอจน MySQL พร้อมใช้งาน:

```bash
docker exec pr-approval-mysql mysqladmin ping -uroot -pdevpassword123 --silent
```

### 2. โหลด schema และ seed data

macOS/Linux/Git Bash:

```bash
docker exec -i pr-approval-mysql mysql -uroot -pdevpassword123 < database/schema.sql
docker exec -i pr-approval-mysql mysql -uroot -pdevpassword123 pr_approval < database/seed_data.sql
docker exec -i pr-approval-mysql mysql -uroot -pdevpassword123 pr_approval < database/add_pr_number_reservations.sql
```

PowerShell:

```powershell
Get-Content -Raw database/schema.sql | docker exec -i pr-approval-mysql mysql -uroot -pdevpassword123
Get-Content -Raw database/seed_data.sql | docker exec -i pr-approval-mysql mysql -uroot -pdevpassword123 pr_approval
Get-Content -Raw database/add_pr_number_reservations.sql | docker exec -i pr-approval-mysql mysql -uroot -pdevpassword123 pr_approval
```

> `seed_data.sql` เป็นคำสั่ง `INSERT` ธรรมดา ควรโหลดเพียงครั้งเดียวต่อฐานข้อมูลว่าง หากรันซ้ำจะชน primary/unique keys

### 3. ตั้งค่า backend

ค่าใน `.env` สำหรับ container ด้านบน:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=devpassword123
DB_NAME=pr_approval
JWT_SECRET=replace_with_a_strong_secret
```

จากนั้นรัน backend:

```bash
npm install
npm run dev
```

ตรวจการทำงาน:

```bash
curl http://localhost:3000/health
```

ควรได้รับ `{"ok":true}` หมายเหตุว่า endpoint นี้ตรวจเฉพาะ Express server หากต้องการยืนยัน MySQL ให้ลอง login หรือเรียก API ที่อ่านฐานข้อมูลด้วย

### จัดการ container

```bash
docker stop pr-approval-mysql
docker start pr-approval-mysql
docker logs pr-approval-mysql
```

หากต้องการสร้างฐานข้อมูลใหม่ทั้งหมด ให้ลบทั้ง container และ named volume ซึ่งจะลบข้อมูล MySQL ถาวร:

```bash
docker rm -f pr-approval-mysql
docker volume rm pr-approval-mysql-data
```

## Authentication

ยกเว้น `GET /health` และ `POST /api/auth/login` ทุก API ต้องส่ง JWT ที่ได้จากการ login:

```http
Authorization: Bearer <token>
```

Token มีอายุ 8 ชั่วโมง หากไม่ส่ง header จะได้รับ `401` พร้อมข้อความ `Missing or invalid Authorization header` และหาก token ผิดหรือหมดอายุจะได้รับ `401` พร้อมข้อความ `Invalid or expired token`

## สรุป API

| Method | Endpoint | หน้าที่ | Authentication |
|---|---|---|---|
| `GET` | `/health` | ตรวจว่า HTTP server ทำงานอยู่ | ไม่ต้องใช้ |
| `POST` | `/api/auth/login` | เข้าสู่ระบบและรับ JWT | ไม่ต้องใช้ |
| `GET` | `/api/employees/:id` | อ่านข้อมูลพนักงาน | Bearer token |
| `GET` | `/api/employees/:id/pending-approvals` | ดู PR ที่รอพนักงานคนนี้อนุมัติในลำดับปัจจุบัน | Bearer token |
| `GET` | `/api/pr` | ดูรายการคำขอของผู้ใช้ปัจจุบัน พร้อม filter และ pagination | Bearer token |
| `POST` | `/api/pr/number-reservations` | จองเลข PR ในนามผู้ใช้ปัจจุบัน | Bearer token |
| `POST` | `/api/pr` | สร้าง PR ด้วย `reservation_id` พร้อมรายการสินค้าและ approval chain | Bearer token |
| `GET` | `/api/pr/:id` | อ่าน PR พร้อมสินค้า ยอดรวม และไฟล์แนบ | Bearer token; requester/approver |
| `POST` | `/api/pr/:id/attachments` | แนบ PDF/JPEG/PNG ให้ PR | Bearer token |
| `GET` | `/api/pr/:id/attachments/:attachmentId/download` | ดาวน์โหลดไฟล์แนบ | Bearer token; requester/approver |
| `GET` | `/api/pr/:id/status` | อ่านสถานะ PR และทุกขั้นอนุมัติ | Bearer token |
| `POST` | `/api/pr/:id/approve` | อนุมัติขั้นปัจจุบัน | Bearer token + passcode |
| `POST` | `/api/pr/:id/reject` | ปฏิเสธ PR ในขั้นปัจจุบัน | Bearer token |

## รายละเอียด API

### `GET /health`

ตรวจว่า Express server ตอบสนองได้ โดยไม่ตรวจการเชื่อมต่อฐานข้อมูล

Response `200`:

```json
{
  "ok": true
}
```

### `POST /api/auth/login`

ตรวจ `employee_id` และ passcode กับข้อมูลพนักงาน แล้วสร้าง JWT อายุ 8 ชั่วโมง

Request body:

```json
{
  "employee_id": "E0020",
  "passcode": "123456"
}
```

Response `200`:

```json
{
  "token": "<jwt>",
  "employee": {
    "employee_id": "E0020",
    "full_name": "Mr. A",
    "position": "IT Support",
    "department": "IT Department",
    "approval_level_id": null
  }
}
```

Errors สำคัญ:

- `400` เมื่อไม่มี `employee_id` หรือ `passcode`
- `401` เมื่อไม่พบพนักงานหรือ passcode ไม่ถูกต้อง
- `500` เมื่อเกิดข้อผิดพลาดภายใน เช่น เชื่อมต่อฐานข้อมูลไม่ได้

### `GET /api/employees/:id`

อ่านข้อมูลพนักงานตาม `id` โดยไม่ส่ง `passcode_hash` กลับมา

Response `200`:

```json
{
  "employee_id": "E0020",
  "full_name": "Mr. A",
  "position": "IT Support",
  "department": "IT Department",
  "approval_level_id": null,
  "signature_image": null
}
```

Errors สำคัญ: `401` เมื่อ token ไม่ถูกต้อง, `404` เมื่อไม่พบพนักงาน และ `500` เมื่อเกิดข้อผิดพลาดภายใน

> ปัจจุบันผู้ใช้ที่ login แล้วสามารถขอข้อมูล employee ID ใดก็ได้ ยังไม่มีการตรวจว่า `:id` ตรงกับเจ้าของ token

### `GET /api/employees/:id/pending-approvals`

ส่งรายการ PR ที่มี approval step สถานะ `pending` ของพนักงานคนนี้ และ step นั้นเป็นลำดับแรกที่ยังค้างอยู่ของ PR

Response `200`:

```json
[
  {
    "pr_id": "PR0001",
    "pr_no": "IT-001-PR",
    "job_name": "Notebook",
    "requester_id": "E0020",
    "created_at": "2026-07-01T02:00:00.000Z"
  }
]
```

หากไม่มีงานรออนุมัติจะตอบ `200` เป็น array ว่าง `[]`

> ปัจจุบันผู้ใช้ที่ login แล้วสามารถดู pending approvals ของ employee ID ใดก็ได้

### `GET /api/pr`

ส่งรายการคำขอของผู้ใช้ที่ login อยู่ โดยอ่าน `requester_id` จาก JWT ผู้เรียกจึงไม่ต้องและไม่สามารถกำหนด employee ID ผ่าน query string ได้ รายการเรียงจาก `created_at` ล่าสุดไปเก่าสุด และส่งเฉพาะข้อมูลสรุปโดยไม่รวม `items`

Query parameters:

| Parameter | ค่าเริ่มต้น | รายละเอียด |
|---|---:|---|
| `status` | ทุกสถานะ | `pending`, `approved` หรือ `rejected`; ระบุหลายค่าโดยคั่นด้วย comma |
| `page` | `1` | หน้าที่ต้องการ ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป |
| `limit` | `20` | จำนวนรายการต่อหน้า ต้องเป็นจำนวนเต็มระหว่าง 1–100 |

ตัวอย่างการใช้งาน:

```http
GET /api/pr
GET /api/pr?status=pending&page=1&limit=20
GET /api/pr?status=approved,rejected&page=1&limit=20
```

การนำไปใช้ใน frontend:

- หน้า **คำขอของฉัน** ใช้ `GET /api/pr`
- แท็บ **กำลังดำเนินการ** ใช้ `GET /api/pr?status=pending`
- หน้า **ประวัติคำขอ** ใช้ `GET /api/pr?status=approved,rejected`
- เมื่อผู้ใช้เลือกรายการ ให้เปิดรายละเอียดด้วย `GET /api/pr/:id`

Response `200`:

```json
{
  "data": [
    {
      "pr_id": "PR0123456789abcdef",
      "pr_no": "IT-003-PR",
      "requester_id": "EMP001",
      "require_date": "2026-10-15T00:00:00.000Z",
      "job_name": "Office notebooks",
      "vendor_name": "ABC Company",
      "status": "pending",
      "created_at": "2026-09-29T07:00:00.000Z",
      "total_amount": 44000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

หากไม่พบรายการ `data` จะเป็น `[]` และ `pagination.total` กับ `pagination.total_pages` จะเป็น `0`

Errors สำคัญ:

- `400` เมื่อ `status` ไม่ใช่ค่าที่รองรับ
- `400` เมื่อ `page` ไม่ใช่จำนวนเต็มบวก
- `400` เมื่อ `limit` อยู่นอกช่วง 1–100
- `401` เมื่อไม่มี token หรือ token ไม่ถูกต้อง
- `500` เมื่ออ่านข้อมูลจากฐานข้อมูลไม่สำเร็จ

### `POST /api/pr/number-reservations`

จองเลข PR รูปแบบ `IT-001-PR` และผูกการจองกับพนักงานจาก JWT โดยยังไม่สร้างเอกสาร PR ไม่ต้องส่ง request body

Response `201`:

```json
{
  "reservation_id": "67e63420-2280-4cf8-8c5a-8fd623e1bc90",
  "pr_no": "IT-003-PR"
}
```

Frontend แสดง `pr_no` บนฟอร์มและเก็บ `reservation_id` เพื่อส่งตอนสร้าง PR แต่ละคำขอจองที่สำเร็จจะออกเลขใหม่ จึงควรเก็บการจองเดิมไว้ระหว่างกรอกฟอร์ม

Errors สำคัญ:

- `401` เมื่อไม่มี token หรือ token ไม่ถูกต้อง
- `500` เมื่อจองเลขไม่สำเร็จ เช่น ไม่มีตัวนับหรือบันทึกการจองไม่ได้

### `POST /api/pr`

สร้าง PR ในนามพนักงานจาก JWT โดยใช้เลขจากการจอง และสร้าง approval chain ตามยอดรวม ต้องเรียก `POST /api/pr/number-reservations` ก่อน แล้วส่ง `reservation_id` ที่ได้รับกลับมา ระบบอ่าน `pr_no` จากฐานข้อมูล ไม่ใช้เลขที่ frontend กำหนดเอง

Request body:

```json
{
  "reservation_id": "<reservation_id>",
  "require_date": "2026-10-15T00:00:00Z",
  "job_name": "Office notebooks",
  "purpose": "Replace old equipment",
  "asset_type": "IT equipment",
  "vendor_name": "ABC Company",
  "items": [
    {
      "description": "Notebook model X",
      "qty": 2,
      "unit": "set",
      "unit_price": 22000.00
    }
  ]
}
```

Validation:

- `require_date` ต้องเป็น string ที่แปลงเป็นวันที่ได้
- `items` ต้องมีอย่างน้อย 1 รายการ
- `description` ต้องไม่ว่างและยาวไม่เกิน 255 ตัวอักษร
- `qty` ต้องเป็นจำนวนเต็มมากกว่า 0
- `unit_price` ต้องเป็นตัวเลขตั้งแต่ 0 ถึง `9,999,999,999,999.99` และมีทศนิยมไม่เกิน 2 ตำแหน่ง
- `unit` ยาวไม่เกิน 30 ตัวอักษร
- optional fields จำกัดความยาว: `job_name` 150, `purpose` 255, `asset_type` 100 และ `vendor_name` 150 ตัวอักษร

Response `201`:

```json
{
  "pr_id": "PR0123456789abcdef"
}
```

Errors สำคัญ:

- `400` เมื่อ body, วันที่ หรือ items ไม่ถูกต้อง
- `400` พร้อม `Invalid reservation_id` เมื่อไม่มีรหัสการจองหรือรูปแบบไม่ใช่ UUID v4
- `400` พร้อม `Invalid PR number reservation` เมื่อไม่พบการจองหรือการจองไม่ใช่ของผู้ใช้ปัจจุบัน
- `401` เมื่อไม่มี token หรือ token ไม่ถูกต้อง
- `409` พร้อม `PR number reservation has already been used` เมื่อการจองถูกใช้แล้ว
- `500` เมื่อสร้าง PR ไม่สำเร็จ

### Flow การจองเลขและสร้าง PR

1. Login และรับ JWT
2. เรียก `POST /api/pr/number-reservations` แล้วเก็บ `reservation_id` กับ `pr_no`
3. ส่ง `reservation_id` พร้อมข้อมูลฟอร์มไปที่ `POST /api/pr` ด้วยผู้ใช้คนเดิม
4. เมื่อสร้างสำเร็จ ใช้ `pr_id` ที่ได้รับอ่านรายละเอียดหรือแนบไฟล์

ตาราง `pr_number_counter` เก็บลำดับล่าสุด ส่วน `pr_number_reservation` เก็บรหัสการจอง เลข PR เจ้าของ และ `used_at` การจองใช้ transaction และ `SELECT ... FOR UPDATE` ล็อกแถวตัวนับ เพื่อให้คำขอที่ใช้ตัวนับเดียวกันออกเลขตามลำดับ

ตอนสร้าง PR ระบบล็อกแถวการจอง ตรวจเจ้าของและ `used_at` แล้วบันทึก PR, items, approval logs และเวลาใช้การจองภายใน transaction เดียวกัน หากขั้นตอนใดล้มเหลวจะ rollback และการจองยังใช้ใหม่ได้ หากสร้างสำเร็จแล้วส่งซ้ำจะตอบ `409`

เลขที่จองสำเร็จแล้วจะไม่ถูกนำกลับมาแจกใหม่ จึงอาจมีเลขข้ามในรายการ PR หากผู้ใช้ปิดฟอร์มหรือไม่ได้บันทึกเอกสาร ระบบปัจจุบันยังไม่มี API ยกเลิกการจองหรือวันหมดอายุของการจอง

### `GET /api/pr/:id`

อ่าน PR, รายการสินค้า, รายการไฟล์แนบ และคำนวณ `total_amount` จากผลรวม `qty * unit_price` ผู้เรียกต้องเป็น requester หรือเป็น approver ที่อยู่ใน approval chain ของ PR

Response `200`:

```json
{
  "pr_id": "PR0001",
  "pr_no": "IT-001-PR",
  "requester_id": "E0020",
  "require_date": "2026-08-01T00:00:00.000Z",
  "job_name": "Notebook",
  "purpose": "Replace the old one",
  "asset_type": "Office Supply",
  "vendor_name": "ABC Company",
  "status": "approved",
  "created_at": "2026-07-01T02:00:00.000Z",
  "items": [
    {
      "item_id": "ITM0001",
      "pr_id": "PR0001",
      "description": "Notebook HP ; Model 123456",
      "qty": 5,
      "unit": "set",
      "unit_price": "22000.00"
    }
  ],
  "attachments": [
    {
      "attachment_id": "AT0123456789abcdef",
      "pr_id": "PR0001",
      "file_type": "application/pdf",
      "file_path": "0123456789abcdef0123456789abcdef.pdf",
      "uploaded_at": "2026-07-01T02:05:00.000Z"
    }
  ],
  "total_amount": 110000
}
```

Errors สำคัญ:

- `401` เมื่อไม่มี token หรือ token ไม่ถูกต้อง
- `403` เมื่อผู้ใช้ไม่ใช่ requester หรือ approver ของ PR
- `404` เมื่อไม่พบ PR
- `500` เมื่อเกิดข้อผิดพลาดภายใน

### `POST /api/pr/:id/attachments`

แนบไฟล์ให้ PR ผู้ส่งต้องเป็น `requester_id` เจ้าของ PR ใช้ `multipart/form-data` โดย field ต้องชื่อ `file`

ตัวอย่าง:

```bash
curl -X POST http://localhost:3000/api/pr/PR0001/attachments \
  -H "Authorization: Bearer <token>" \
  -F "file=@quotation.pdf"
```

รองรับ MIME type `application/pdf`, `image/jpeg`, `image/png` ครั้งละ 1 ไฟล์ ขนาดสูงสุด 10 MB ไฟล์จะถูกบันทึกในโฟลเดอร์ `uploads/` ด้วยชื่อแบบสุ่ม

Response `201`:

```json
{
  "attachment_id": "AT0123456789abcdef",
  "pr_id": "PR0001",
  "file_type": "application/pdf",
  "file_path": "0123456789abcdef0123456789abcdef.pdf"
}
```

Errors สำคัญ:

- `400` เมื่อไม่มีไฟล์หรือชนิดไฟล์ไม่รองรับ
- `401` เมื่อ token ไม่ถูกต้อง
- `403` เมื่อผู้ใช้ไม่ใช่เจ้าของ PR
- `404` เมื่อไม่พบ PR
- `413` เมื่อไฟล์เกิน 10 MB

### `GET /api/pr/:id/attachments/:attachmentId/download`

ดาวน์โหลดไฟล์แนบ ผู้เรียกต้องเป็น requester หรือ approver ใน approval chain ของ PR ระบบอ่านไฟล์ผ่าน endpoint นี้โดยตรงและไม่ได้เปิดโฟลเดอร์ `uploads/` เป็น static directory

ตัวอย่าง:

```bash
curl -L \
  "http://localhost:3000/api/pr/PR0001/attachments/AT0123456789abcdef/download" \
  -H "Authorization: Bearer <token>" \
  -o downloaded-file.pdf
```

หากต้องการให้ curl ใช้ชื่อจาก `Content-Disposition`:

```bash
curl -L -OJ \
  "http://localhost:3000/api/pr/PR0001/attachments/AT0123456789abcdef/download" \
  -H "Authorization: Bearer <token>"
```

เนื่องจากฐานข้อมูลไม่ได้เก็บชื่อไฟล์ต้นฉบับ ระบบจะสร้างชื่อดาวน์โหลดในรูปแบบ:

```text
<PR_ID>-<ATTACHMENT_ID>.<extension>
```

Response `200` เป็น binary file พร้อม header `Content-Disposition: attachment` ไม่ใช่ JSON

Errors สำคัญ:

- `401` เมื่อไม่มี token หรือ token ไม่ถูกต้อง
- `403` เมื่อผู้ใช้ไม่ใช่ requester หรือ approver ของ PR
- `404` เมื่อไม่พบ attachment, path ไม่ถูกต้อง หรือไฟล์ไม่มีอยู่บน disk
- `500` เมื่อเกิดข้อผิดพลาดภายในหรือส่งไฟล์ไม่สำเร็จ

### `GET /api/pr/:id/status`

ส่งสถานะรวมของ PR, ยอดรวม และ approval chain เรียงตามลำดับ

Response `200`:

```json
{
  "pr_id": "PR0001",
  "pr_no": "IT-001-PR",
  "pr_status": "pending",
  "total": 44000,
  "chain": [
    {
      "sequence_order": 1,
      "level_name": "Senior Chief",
      "approver_id": "E0018",
      "approver_name": "Mr. B",
      "position": "Senior Chief",
      "department": "IT Department",
      "status": "approved",
      "comment": null,
      "approved_at": "2026-09-29T07:00:00.000Z"
    },
    {
      "sequence_order": 2,
      "level_name": "Manager",
      "approver_id": "E0017",
      "approver_name": "Mr. C",
      "position": "IT Manager",
      "department": "IT Department",
      "status": "pending",
      "comment": null,
      "approved_at": null
    }
  ]
}
```

สถานะของ PR คือ `pending`, `approved` หรือ `rejected` ส่วนสถานะของแต่ละ step คือ `pending`, `approved`, `rejected` หรือ `cancelled`

Errors สำคัญ: `401` เมื่อ token ไม่ถูกต้อง, `404` เมื่อไม่พบ PR และ `500` เมื่อเกิดข้อผิดพลาดภายใน

### `POST /api/pr/:id/approve`

อนุมัติ step แรกที่ยัง `pending` ผู้ใช้ใน JWT ต้องเป็น approver ของ step นั้นและต้องยืนยัน passcode 6 หลักอีกครั้ง เมื่ออนุมัติ step สุดท้าย สถานะ PR จะเปลี่ยนเป็น `approved`

Request body:

```json
{
  "passcode": "123456"
}
```

Response `200`:

```json
{
  "message": "Approved successfully",
  "pr_id": "PR0001",
  "current_level": "Manager",
  "is_final": false
}
```

Errors สำคัญ:

- `400` เมื่อ passcode ไม่ใช่ string ตัวเลข 6 หลัก
- `401` เมื่อ token หรือ passcode ไม่ถูกต้อง
- `403` เมื่อยังไม่ถึงลำดับอนุมัติของผู้ใช้
- `404` เมื่อไม่พบ PR
- `409` เมื่อ PR จบกระบวนการแล้วหรือไม่มี step ที่รออนุมัติ

### `POST /api/pr/:id/reject`

ปฏิเสธ step แรกที่ยัง `pending` ผู้ใช้ใน JWT ต้องเป็น approver ของ step นั้น ระบบจะเปลี่ยน PR เป็น `rejected` และยกเลิก step ที่เหลือเป็น `cancelled`

Request body:

```json
{
  "reason": "Budget is not available"
}
```

`reason` ต้องไม่ว่างและยาวไม่เกิน 255 ตัวอักษร

Response `200`:

```json
{
  "message": "Rejected successfully",
  "pr_id": "PR0001"
}
```

Errors สำคัญ:

- `400` เมื่อ reason ไม่ถูกต้อง
- `401` เมื่อ token ไม่ถูกต้อง
- `403` เมื่อยังไม่ถึงลำดับ review ของผู้ใช้
- `404` เมื่อไม่พบ PR
- `409` เมื่อ PR จบกระบวนการแล้วหรือไม่มี step ที่รอ review

> ปัจจุบัน reject ไม่ได้ตรวจ passcode ซ้ำ ต่างจาก approve

## Approval chain

เมื่อสร้าง PR ระบบคำนวณยอดรวมและเลือก approver ตั้งแต่ลำดับแรกขึ้นไปจนถึงระดับที่วงเงินครอบคลุมยอด PR หากเกินวงเงินทุกระดับที่กำหนด จะไปถึงระดับสุดท้ายที่ `limit_amount` เป็น `NULL`

ข้อมูล seed ปัจจุบันกำหนดระดับดังนี้:

| ลำดับ | ระดับ | วงเงิน |
|---:|---|---:|
| 1 | Senior Chief | อยู่ในทุก PR |
| 2 | Manager | 10,000 |
| 3 | Deputy General Manager | 50,000 |
| 4 | General Manager | 100,000 |
| 5 | Senior Director | 200,000 |
| 6 | Vice President | ไม่จำกัด |

ระบบต้องมีพนักงาน approver อย่างน้อยหนึ่งคนในแต่ละระดับที่ถูกเลือก มิฉะนั้นการสร้าง PR จะล้มเหลวและ transaction จะถูก rollback

## คำสั่งที่มีในโปรเจกต์

| คำสั่ง | รายละเอียด |
|---|---|
| `npm run dev` | รัน `tsx watch src/server.ts` และ restart เมื่อ source เปลี่ยน |
| `npm run build` | compile TypeScript ไปยัง `dist/` |
| `npm start` | รัน `dist/server.js` ซึ่งต้อง build ก่อน |
| `npm test` | ยังไม่มี test runner; คำสั่งนี้จะจบด้วย exit code 1 |

## ข้อจำกัดที่ควรทราบ

- `/health` ตรวจเฉพาะ HTTP server ไม่ได้ตรวจ MySQL
- ยังไม่มี automated unit/integration tests
- ยังไม่มี global 404 handler หรือ standard error schema
- `GET /api/pr/:id/status` ยังเปิดให้ผู้ใช้ที่มี token ทุกคนดูสถานะได้ หากรู้ PR ID
- ระบบไม่เก็บชื่อไฟล์ต้นฉบับ ชื่อไฟล์ดาวน์โหลดจึงถูกสร้างจาก PR ID และ attachment ID
- `reject` ไม่ต้องยืนยัน passcode ซ้ำ แต่ `approve` ต้องยืนยัน
- หากมีพนักงานหลายคนใช้ `approval_level_id` เดียวกัน ระบบจะเลือกเพียงหนึ่งคนโดยไม่มีลำดับที่รับประกัน ควรกำหนดกติกาการเลือก approver หรือบังคับ uniqueness ให้ชัดเจน
