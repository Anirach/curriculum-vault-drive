# Curriculum Vault Drive

ระบบจัดการเอกสารหลักสูตรออนไลน์ที่เชื่อมต่อกับ Google Drive สำหรับคณะวิศวกรรมศาสตร์และเทคโนโลยี มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ

## คุณสมบัติหลัก

- 🔐 การยืนยันตัวตนผ่าน Google OAuth
- 📁 การจัดการไฟล์และโฟลเดอร์ใน Google Drive
- 👥 ระบบสิทธิ์การเข้าถึง (Admin, Editor, Viewer)
- 📄 รองรับการดูไฟล์ PDF โดยตรงในเบราว์เซอร์
- 🔍 ค้นหาไฟล์และโฟลเดอร์
- 📤 อัปโหลดไฟล์ PDF
- 📥 ดาวน์โหลดไฟล์
- ✏️ เปลี่ยนชื่อไฟล์และโฟลเดอร์
- 🗑️ ลบไฟล์และโฟลเดอร์
- 👥 แชร์โฟลเดอร์กับผู้ใช้อื่น

## เทคโนโลยีที่ใช้

- Frontend: React + TypeScript + Vite
- UI Framework: Tailwind CSS + shadcn/ui
- Authentication: Google OAuth 2.0
- Storage: Google Drive API
- Container: Docker + Nginx

## การติดตั้งสำหรับการพัฒนา

1. ติดตั้ง dependencies:
```bash
npm install
```

2. สร้างไฟล์ `.env` และกำหนดค่าต่างๆ:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_DRIVE_FOLDER_ID=your_drive_folder_id
```

3. รันแอพพลิเคชันในโหมดพัฒนา:
```bash
npm run dev
```

## การติดตั้งบน Docker (Production)

### ข้อกำหนดเบื้องต้น

- Docker Engine (เวอร์ชัน 20.10.0 หรือสูงกว่า)
- Docker Compose (เวอร์ชัน 2.0.0 หรือสูงกว่า)

### ขั้นตอนการติดตั้ง

1. ติดตั้ง Docker บน Linux:
```bash
# ติดตั้ง Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose

# เพิ่มผู้ใช้ปัจจุบันเข้าไปในกลุ่ม docker
sudo usermod -aG docker $USER

# รีสตาร์ทระบบเพื่อให้การเปลี่ยนแปลงมีผล
sudo reboot
```

2. Clone โปรเจค:
```bash
git clone https://github.com/your-username/curriculum-vault-drive.git
cd curriculum-vault-drive
```

3. สร้างไฟล์ `.env` และกำหนดค่าต่างๆ:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
VITE_GOOGLE_REDIRECT_URI=http://your-domain/auth/callback
VITE_DRIVE_FOLDER_ID=your_drive_folder_id
```

4. Build และรันด้วย Docker Compose:
```bash
# Build และรันในโหมด detached
docker-compose up --build -d

# ดู logs
docker-compose logs -f
```

### คำสั่ง Docker ที่เป็นประโยชน์

```bash
# หยุดการทำงาน
docker-compose down

# รีสตาร์ท services
docker-compose restart

# ลบ images ที่ไม่ได้ใช้
docker system prune -a

# ดูสถานะของ containers
docker-compose ps
```

### การเข้าถึงแอพพลิเคชัน

หลังจากติดตั้งเสร็จ แอพพลิเคชันจะสามารถเข้าถึงได้ที่:
- `http://localhost` (ถ้ารันบนเครื่อง local)
- `http://your-domain` (ถ้ารันบนเซิร์ฟเวอร์)

## การตั้งค่า Google OAuth

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้างโปรเจคใหม่
3. เปิดใช้งาน Google Drive API
4. สร้าง OAuth 2.0 Client ID
5. กำหนด Authorized redirect URIs:
   - สำหรับการพัฒนา: `http://localhost:5173/auth/callback`
   - สำหรับ production: `http://your-domain/auth/callback`

## การตั้งค่า Google Drive

1. สร้างโฟลเดอร์ใน Google Drive สำหรับเก็บเอกสาร
2. แชร์โฟลเดอร์กับ service account email
3. คัดลอก Folder ID จาก URL ของโฟลเดอร์
4. นำ Folder ID ไปใส่ในไฟล์ `.env`

## การแก้ไขปัญหา

### ปัญหาการเข้าถึง Google Drive API

1. ตรวจสอบว่าได้เปิดใช้งาน Google Drive API ใน Google Cloud Console
2. ตรวจสอบว่า Client ID และ Client Secret ถูกต้อง
3. ตรวจสอบว่า Redirect URI ตรงกับที่กำหนดใน Google Cloud Console

### ปัญหาการเข้าถึงแอพพลิเคชัน

1. ตรวจสอบว่า Docker containers ทำงานอยู่:
```bash
docker-compose ps
```

2. ตรวจสอบ logs:
```bash
docker-compose logs -f
```

3. ตรวจสอบการตั้งค่า firewall:
```bash
sudo ufw status
sudo ufw allow 80/tcp
```

## การอัปเดตแอพพลิเคชัน

1. ดึงโค้ดล่าสุด:
```bash
git pull origin main
```

2. รีบิลด์และรีสตาร์ท:
```bash
docker-compose up --build -d
```

## การสำรองข้อมูล

ข้อมูลทั้งหมดถูกเก็บใน Google Drive ดังนั้นไม่จำเป็นต้องสำรองข้อมูลเพิ่มเติม อย่างไรก็ตาม ควรสำรองไฟล์คอนฟิก:

1. ไฟล์ `.env`
2. ไฟล์ `docker-compose.yml`
3. ไฟล์ `nginx.conf`

## การสนับสนุน

หากพบปัญหา或有คำถามเพิ่มเติม กรุณาสร้าง issue ใน GitHub repository

## License

MIT License
