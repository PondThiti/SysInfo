# ยินดีต้อนรับสู่ SysInfo Wiki (SysPulse v0.1.3)

**SysInfo (System Storage, File Organizer & Port Inspector)** เป็นยูทิลิตี้ All-in-One สำหรับ Windows 10 และ 11 ออกแบบมาเพื่อช่วยผู้ใช้และนักพัฒนาตรวจสอบฮาร์ดแวร์ จัดการโปรแกรมที่ติดตั้ง (Smart Uninstall), จัดการพื้นที่จัดเก็บ, จัดระเบียบไฟล์อัจฉริยะ, ตรวจจับพอร์ตชน และทำความสะอาดเครื่องอย่างปลอดภัย

---

## 📑 สารบัญวิกิ (Table of Contents)

1. [คู่มือระบบจัดระเบียบไฟล์อัจฉริยะ (File Organizer Guide)](./File-Organizer-Guide.md)
   - ภาพรวมการทำงาน
   - การใช้งาน Rule Presets
   - การดูตัวอย่างก่อนทำจริง (Dry-run Preview)
   - การกดย้อนกลับทั้งชุด (Undo Journal)
2. [Rule Engine & ตัวแปร Template](./Rule-Engine-and-Templates.md)
   - ไวยากรณ์ตัวแปร Template (`{type}`, `{ext}`, `{year}`, `{month}`, `{counter}`)
   - กลยุทธ์การจัดการเมื่อชื่อซ้ำ (Conflict Strategy & Hash Check)
   - การเปลี่ยนชื่อกลุ่มไฟล์ (Bulk Rename)
3. [สถาปัตยกรรมและความปลอดภัยระดับระบบ (Architecture & Safety)](./Architecture-and-Safety.md)
   - ระบบย้ายข้ามไดรฟ์ปลอดภัย (Copy → Verify Hash → Delete Source)
   - การป้องกันไดเรกทอรีระบบ (System Boundary Protection)
   - การป้องกันโครงสร้างโปรเจกต์นักพัฒนา (.git, package.json, Cargo.toml)
   - การรองรับ Windows Long Paths (`\\?\`) และชื่อไฟล์ต้องห้าม

---

## 🚀 ฟีเจอร์หลักในเวอร์ชัน 0.1.3

* **📦 Installed Apps & Smart Uninstall:** รวมโปรแกรมไว้ในหน้าเดียว ค้นหาและกรองจากชื่อ ผู้พัฒนา เวอร์ชัน ตำแหน่งติดตั้ง พร้อมระบบ Preflight Check, Preserve User Data และ Residual Scanner (Open Location, Keep, Back Up, Move to Recycle Bin, ลบถาวร)
* **🗂️ File Organizer (Rule Engine & Undo Journal):** จัดหมวดหมู่ไฟล์และจัดโฟลเดอร์อัตโนมัติตามกฎ พร้อมตาราง Preview และกดย้อนกลับได้เสมอ
* **🎨 Modern Vector Icon:** ไอคอน SVG ใหม่ความละเอียดสูง แปลงเป็น Multi-resolution .ico
* **📊 Storage Analyzer & Treemap:** วิเคราะห์พื้นที่ไดรฟ์ แผนผัง Treemap และค้นหาไฟล์ขนาดใหญ่
* **🎮 Game Libraries Access:** ตรวจจับคลังเกมจาก Steam, Riot, Epic Games, Roblox, GRYPHLINK
* **🧹 Smart Junk Cleaner:** ล้างไฟล์ Temp, แคชเบราว์เซอร์, และแคช Shader พร้อมคำเตือนการโหลดเกมครั้งแรก
* **🌐 Port & Process Inspector:** ตรวจจับพอร์ต TCP/UDP ที่เปิดใช้งาน ค้นหาโปรเซสและ Service ที่ผูกอยู่ พร้อมตัวตรวจจับข้อขัดแย้งแบบตัวเลขกระพริบกระชับตา
