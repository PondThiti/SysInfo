# SysInfo — System Storage, File Organizer & Port Inspector

> **All-in-One PC Utility (v0.1.3):** Installed Apps & Smart Uninstall, Storage Analyzer, Smart File Organizer, Junk Cleaner, Game Libraries Analyzer & Port Inspector  
> **Platform:** Windows 10 / Windows 11 (x64), Linux, macOS  
> **Executable:** `sysinfo.exe`  
> **Distribution:** `.exe` (NSIS), `.zip` (Portable), `.msi` (Windows Installer), `.tar.gz` (Linux)  
> **Repository:** `https://github.com/PondThiti/SysPulse.git`  
> **Documentation & Wiki:** [`docs/wiki/Home.md`](./docs/wiki/Home.md)  

---

## 🌟 ฟีเจอร์ใหม่ในเวอร์ชัน 0.1.3 (What's New in v0.1.3)

### 1. 📦 ค้นหาและจัดการโปรแกรม (Installed Apps & Smart Uninstall)
* **รวมโปรแกรมไว้ในหน้าเดียว:** ค้นหาและกรองโปรแกรมจากชื่อ ผู้พัฒนา เวอร์ชัน และตำแหน่งติดตั้ง
* **ตัวกรอง 4 หมวดหมู่ชัดเจน:** ทั้งหมด (All), Windows Apps (Win32/MSI), Developer (Git, VS Code, Node, Python, ฯลฯ), Store Apps (Microsoft Store / AppX)
* **แยกขนาดชัดเจน:** แสดงทั้งขนาดที่ตัวติดตั้งรายงาน (Reported Size) และขนาดจริงที่ได้จากการสแกนไดเรกทอรี (Scanned Size) หรือระบุข้อมูลไม่พร้อมหากโปรแกรมไม่ได้รายงาน
* **สลับโหมดหน้าจอจำลอง (Mockup Preview):** รองรับการเปิดพรีวิวหน้าจอจำลองเปรียบเทียบกับโปรแกรมจริงในเครื่อง
* **Smart Uninstall (ถอนด้วยวิธีที่ถูกต้อง):** เรียก Uninstaller มาตรฐานตามประเภท (Win32 uninstaller, Windows Installer MSI, Remove-AppxPackage หรือ winget) ไม่ลบโฟลเดอร์ทิ้งโดยตรง
* **Pre-uninstall Check (Preflight Check):** ตรวจสอบว่าโปรแกรมยังเปิดทำงานอยู่หรือไม่, แจ้งเตือนไฟล์ที่ยังไม่ได้บันทึก, ตรวจสิทธิ์ Admin, Service, Startup, ตรวจสอบความเกี่ยวข้องกับไดรเวอร์ร่วม, และสถานะรีสตาร์ต
* **Preserve User Data (เก็บข้อมูลก่อนถอน):** ป้องกันการลบข้อมูลส่วนตัวใน AppData, Documents, เซฟเกม หรือโปรเจกต์ พร้อมตัวเลือก Back Up สำรองข้อมูลอัตโนมัติ
* **Residual Scanner (ตรวจสอบไฟล์ตกค้างหลังถอน):** สแกนหาไฟล์ แคช ล็อก โฟลเดอร์ที่เหลือ รายการ Startup และ Registry พร้อม 4 ปุ่มควบคุม: **Open Location**, **Keep**, **Back Up**, **Move to Recycle Bin** และ **ลบถาวร** (มีหน้าต่างยืนยันแยกต่างหาก)

### 2. ⚡ การปรับปรุงและแก้ไข (Enhancements & Fixes)
* **คำเตือน Shader Cache:** เพิ่มการแจ้งเตือนชัดเจนว่าการลบ Shader Cache จะทำให้เมื่อเปิดเข้าเล่นเกมครั้งแรก ตัวเกมจะโหลดช้าเหมือนเข้าเกมครั้งแรกเพื่อ Compile Shader ใหม่
* **ป้าย NEW แสดงเฉพาะครั้งแรก:** ฟีเจอร์ใหม่จะแสดงสถานะ NEW เฉพาะการเปิดใช้งานครั้งแรก เมื่อผู้ใช้เข้าไปดูแล้วจะถูกบันทึกและปลดป้ายออกโดยอัตโนมัติ
* **ตัดจำนวนไฟล์และตัวเลขในแถบเมนูข้างออก:** นำตัวเลขไฟล์ตรงวิเคราะห์พื้นที่จัดเก็บ และตัวเลขพอร์ตตรงเมนูพอร์ตออก
* **ปรับปรุงตัวแจ้งเตือนกระพริบ:** ปรับการแจ้งเตือนข้อขัดแย้งที่กระพริบให้แสดงเฉพาะตัวเลข
* **ปรับปรุงเมนูจัดระเบียบไฟล์:** นำเลขเวอร์ชันและป้าย NEW ออก และปรับข้อความให้อ่านง่ายเป็นธรรมชาติ
* **แก้ไขธีมขาว (Light Theme Overrides):** แก้ไขปัญหาตัวหนังสือกลืนกับพื้นหลัง ปรับสีพื้นหลังการ์ดแจ้งเตือนให้สว่างสบายตา และแก้ไขหลอดสถานะ (Progress Bar) บนหน้าหลักให้แสดงผลชัดเจนสมบูรณ์ในธีมขาว

### 1. 🗂️ ระบบจัดระเบียบไฟล์อัจฉริยะ (Smart File Organizer)
* **Rule Engine (กฎ "ถ้า → แล้ว"):** กรองตามนามสกุล, ประเภทไฟล์, ขนาด, วันที่, และโฟลเดอร์ต้นทาง
* **พรีเซ็ตในตัว (Built-in Presets):**
  * 📁 *จัดตามประเภทไฟล์ (By File Type):* แยก `Images/`, `Documents/`, `Videos/`, `Audio/`, `Archives/`, `Executables/`, `Code/`, `GameAssets/`
  * 📅 *จัดตามปีและเดือน (By Date: YYYY/MM):* แยกตามช่วงเวลา เช่น `2026/10`
  * 📥 *จัดระเบียบโฟลเดอร์ Downloads:* ล้างโฟลเดอร์ดาวน์โหลด แยกตามประเภทและปี
  * 🛠️ *จัดระเบียบ Dev & Game Assets:* แยก Asset bundles, Source code, logs
* **Template ปลายทาง:** รองรับตัวแปร `{type}`, `{ext}`, `{year}`, `{month}`, `{day}`, `{name}`, `{counter}`, `{size}`
* **Dry-Run Preview:** ตารางแสดงตัวอย่าง "ต้นทาง → ปลายทาง" ให้ติ๊กเลือก/ยกเว้นรายไฟล์ก่อนลงมือย้ายจริง
* **Conflict Handling ป้องกันเขียนทับ:** 
  * เปลี่ยนชื่ออัตโนมัติ (`file (1).ext`)
  * ข้ามไฟล์เดิม (Skip)
  * **ตรวจ Hash อัตโนมัติ:** หากเนื้อหาซ้ำเป๊ะ 100% เสนอส่งสำเนาส่วนเกินลง Recycle Bin
* **Undo Journal (หัวใจสำคัญ):** บันทึกทุกขั้นตอนลง Journal สามารถกด **"ย้อนกลับทั้งชุด (Undo Batch)"** คืนค่าไฟล์ทั้งหมดกลับตำแหน่งเดิมได้ 100% พร้อมคงค่า metadata วันที่แก้ไข (`mtime`)
* **Bulk Rename:** รองรับการเปลี่ยนชื่อกลุ่มไฟล์พร้อมตาราง Live Preview
* **Empty Folder Cleanup:** หลังย้ายไฟล์ ตรวจหาโฟลเดอร์ว่างเปล่าและให้ผู้ใช้กดลบได้ใน 1 คลิก
* **Watch Folder (Recommendation Mode):** แจ้งเตือนแนะนำการจัดระเบียบเมื่อมีไฟล์สะสม ไม่ย้ายเองจนกว่าผู้ใช้จะสั่ง

### 2. 🎨 ไอคอนเวกเตอร์ SVG ใหม่ (Modern App Icon)
* อัปเดตไอคอนแอปพลิเคชันจาก `icon.svg` คุณภาพสูง
* สร้างไฟล์ไอคอนแบบ Multi-resolution `.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
* ผูกเข้ากับตัวโปรแกรม `sysinfo.exe`, Taskbar, Window Header, และตัวติดตั้ง MSI/NSIS

### 3. 🛡️ สถาปัตยกรรมความปลอดภัยระดับสูง (Rust & Electron Backend)
* **ย้ายข้ามไดรฟ์ปลอดภัย (Atomic Cross-Drive Move):** Copy → Verify (Size & SHA-256 Hash) → Delete Source
* **ขอบเขต Path ปลอดภัย:** ห้ามกฎย้ายไฟล์เข้า/ออกจากโฟลเดอร์ระบบ (`C:\Windows`, `C:\Program Files`)
* **ป้องกันโปรเจกต์นักพัฒนา:** ห้ามแยกไฟล์ในโฟลเดอร์ที่มี `.git`, `package.json`, `Cargo.toml`, `go.mod`
* **รองรับ Windows Long Paths:** ป้องกันปัญหาพาธยาวเกิน 260 ตัวอักษร (`\\?\`) และชื่อไฟล์ต้องห้าม (`CON`, `PRN`, `AUX`, `NUL`)

---

## 📚 เอกสารวิกิบน GitHub (GitHub Wiki Documentation)

* [🏠 หน้าหลักวิกิ (Wiki Home)](./docs/wiki/Home.md)
* [🗂️ คู่มือระบบจัดระเบียบไฟล์ (File Organizer Guide)](./docs/wiki/File-Organizer-Guide.md)
* [⚙️ กฎและตัวแปร Template (Rule Engine & Templates)](./docs/wiki/Rule-Engine-and-Templates.md)
* [🛡️ สถาปัตยกรรมและความปลอดภัย (Architecture & Safety)](./docs/wiki/Architecture-and-Safety.md)

---

## 📦 ตัวติดตั้งและแพ็กเกจแจกจ่าย (Installers & Distribution)

ไฟล์ตัวติดตั้งถูกส่งออกไปยัง: [`C:\Users\zeroy\Desktop\MyProject\Apps\PC-App\`](file:///C:/Users/zeroy/Desktop/MyProject/Apps/PC-App/)

1. **Windows NSIS Setup (`.exe`):** `SysInfo-Setup-0.1.2.exe` / `SysInfo_Setup.exe`
2. **Windows Portable Archive (`.zip`):** `SysInfo-0.1.2-win.zip` / `SysInfo_Portable.zip`
3. **Windows MSI Installer (`.msi`):** `SysInfo-Setup-0.1.2.msi` / `SysInfo_Setup.msi`
4. **Linux Application Package (`.tar.gz`):** `SystemStoragePortInspector_Linux_x64.tar.gz`

---

## 🛠️ คำสั่งสำหรับพัฒนาและบิลด์

```bash
# ติดตั้ง dependencies
npm install

# รันโหมด Development
npm run dev

# คอมไพล์โปรเจกต์ (Production Build)
npm run build

# บิลด์ชุดติดตั้งทั้งหมด (.exe, .msi, .zip)
npm run dist
```
