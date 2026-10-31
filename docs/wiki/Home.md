# ยินดีต้อนรับสู่ SysInfo Wiki (SysInfo v0.1.5)

**SysInfo (System Storage, File Organizer & Port Inspector)** เป็นยูทิลิตี้ All-in-One สำหรับ Windows 10 และ 11 ออกแบบมาเพื่อช่วยผู้ใช้และนักพัฒนาตรวจสอบฮาร์ดแวร์ จัดการโปรแกรมที่ติดตั้ง (Smart Uninstall), ตรวจสุขภาพไดรฟ์ S.M.A.R.T., จัดการพื้นที่จัดเก็บ, จัดระเบียบไฟล์อัจฉริยะ, ตรวจจับพอร์ตชน และทำความสะอาดเครื่องอย่างปลอดภัย

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

## 🚀 ฟีเจอร์หลักในเวอร์ชัน 0.1.5

* **🎛️ Dashboard Style Redesign & Top Capsule Nav:** ยุบ Sidebar ด้านข้างเป็น Top Nav Capsule ทรงแคปซูลลอยด้านบน พร้อมเลย์เอาต์ Master-Detail (แผงมืดทางซ้าย + แผงสีธีมทางขวา)
* **📊 KPI 4 Cards:** แสดงข้อมูลสำคัญ 4 มิติ (พื้นที่ใช้ไปแยกแท่งตามไดรฟ์, กราฟแนวโน้มสุขภาพ S.M.A.R.T., แท่งแยกหมวดหมู่ขยะที่ล้างได้, ชิปพอร์ตเด่นที่เปิดใช้งาน)
* **🏷️ Beta Badge & Accent/Font Customization:** ป้ายกำกับ `<BetaBadge />` สำหรับตัวเลือกทดลอง "เปลี่ยนสีธีม" (5 สี) และ "เปลี่ยน Font" (System Default, IBM Plex Sans Thai, Noto Sans Thai, Sarabun)
* **🩺 Drive Health & S.M.A.R.T. Monitor:** ตรวจสอบสุขภาพ Physical Drive แยก NVMe SSD และ SATA HDD แบบ Read-only 100% ปลอดภัยต่อข้อมูล
* **📦 Installed Apps & Smart Uninstall:** รวมโปรแกรมไว้ในหน้าเดียว ค้นหาและกรองจากชื่อ ผู้พัฒนา เวอร์ชัน ตำแหน่งติดตั้ง พร้อมระบบ Preflight Check, Preserve User Data และ Residual Scanner (Open Location, Keep, Back Up, Move to Recycle Bin, ลบถาวร)
* **🗂️ File Organizer (Rule Engine & Undo Journal):** จัดหมวดหมู่ไฟล์และจัดโฟลเดอร์อัตโนมัติตามกฎ พร้อมตาราง Preview และกดย้อนกลับได้เสมอ
* **🎮 Game Libraries Access:** ตรวจจับคลังเกมจาก Steam, Riot, Epic Games, Roblox, GRYPHLINK
* **🧹 Smart Junk Cleaner:** ล้างไฟล์ Temp, แคชเบราว์เซอร์, และแคช Shader พร้อมคำเตือนการโหลดเกมครั้งแรก
* **🌐 Port & Process Inspector:** ตรวจจับพอร์ต TCP/UDP ที่เปิดใช้งาน ค้นหาโปรเซสและ Service ที่ผูกอยู่ พร้อมตัวตรวจจับข้อขัดแย้งแบบตัวเลขกระพริบกระชับตา
