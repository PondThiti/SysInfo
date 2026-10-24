# System Storage & Port Inspector (SysPulse)

> **All-in-One PC Utility:** Storage Analyzer, Smart Junk Cleaner & Process/Port Inspector  
> **Platform:** Windows 10 / Windows 11 (x64), Linux, macOS  
> **Format:** `.exe` (NSIS), `.zip` (Portable), `.msi` (Windows Installer), `.tar.gz` (Linux)  
> **Output Location:** `C:\Users\zeroy\Desktop\MyProject\Apps\PC-App\`

---

## 📦 ตัวติดตั้งและแพ็กเกจแจกจ่าย (Installers & Distribution)

ไฟล์ตัวติดตั้งถูกส่งออกไปยัง: [`C:\Users\zeroy\Desktop\MyProject\Apps\PC-App\`](file:///C:/Users/zeroy/Desktop/MyProject/Apps/PC-App/)

1. **Windows NSIS Installer (`.exe`):**
   - 📁 **ไฟล์:** `SystemStoragePortInspector_Setup.exe` (~84 MB)
   - 🛡️ ติดตั้งง่าย เลือกโฟลเดอร์ได้ สร้าง Desktop & Start Menu Shortcut อัตโนมัติ

2. **Windows Portable Archive (`.zip`):**
   - 📁 **ไฟล์:** `SystemStoragePortInspector_Portable.zip` (~114 MB)
   - 🚀 ไม่ต้องติดตั้ง แตกไฟล์แล้วเปิดใช้งานได้ทันที เหมาะสำหรับใส่ Flash Drive / USB

3. **Windows MSI Installer (`.msi`):**
   - 📁 **ไฟล์:** `SystemStoragePortInspector_Setup.msi` (~115 MB)
   - 🏢 เหมาะสำหรับการ Deploy ผ่าน Group Policy (GPO) หรือองค์กร

4. **Linux Application Package (`.tar.gz`):**
   - 📁 **ไฟล์:** `SystemStoragePortInspector_Linux_x64.tar.gz` (~105 MB)
   - 🐧 พร้อมใช้งานบน Ubuntu, Debian, Fedora, Arch Linux x64

5. **macOS & Linux Automated Builds (GitHub Actions):**
   - 🍎 รองรับการบิลด์ `.dmg`, `.zip` สำหรับ macOS และ `.AppImage`, `.deb` สำหรับ Linux ผ่าน GitHub Actions Workflow (`.github/workflows/build.yml`) อัตโนมัติทุกครั้งที่ Push ขึ้น Git

---

## ⚡ การเชื่อมต่อและเข้าถึงเครื่องจริง (Real Native System Integration)

แอปพลิเคชันเชื่อมต่อกับฮาร์ดแวร์และระบบปฏิบัติการ Windows จริงโดยตรง:

1. **Real Drive & Storage Overview:**
   - ตรวจจับไดรฟ์จริงในเครื่อง (เช่น ไดรฟ์ C:, D:) อ่านพื้นที่ความจุรวม, พื้นที่ว่าง, เปอร์เซ็นต์การใช้งานจริง และระบบไฟล์ (NTFS) ผ่าน Win32 CIM/WMI
2. **Real Live Hardware Telemetry:**
   - ตรวจวัดการทำงานจริงของ CPU Load (%) และ RAM Usage (GB) แบบสดๆ ทุก 2.5 วินาที
3. **Real Active Network Ports & Processes:**
   - สแกนพอร์ต TCP/UDP ที่เปิดฟังการเชื่อมต่อจริงในเครื่อง (Listening / Established)
   - ระบุหมายเลขพอร์ต, Protocol, PID, Process Name, Path ตัวโปรแกรมจริง, และการใช้ Memory
   - สั่ง **Kill Process (PID)** ปิดโปรแกรมและคืนพอร์ตได้ทันทีด้วยคำสั่งระบบของ Windows
4. **Real Junk & Cache Scanner:**
   - ค้นหาโฟลเดอร์ไฟล์ขยะจริง เช่น `%TEMP%`, Windows Temp, WER Crash Dumps, แคชเบราว์เซอร์ (Chrome, Edge, Brave), Discord Cache และ Pip/Npm cache
   - ระบบ **Safe Delete** สั่งย้ายไฟล์ลง Windows Recycle Bin ได้อย่างปลอดภัย หรือเลือกลบถาวร
5. **Real Heavy Files Scanner:**
   - สแกนค้นหาไฟล์ขนาดใหญ่ในไดเรกทอรีผู้ใช้จริง (Downloads, Documents, Desktop, Videos) พร้อมระบุนามสกุล ขนาด และวันที่แก้ไขจริง
6. **Real Startup Apps Manager:**
   - ดึงรายชื่อโปรแกรมที่ตั้งค่าให้เปิดพร้อม Windows จาก Registry (`HKCU` และ `HKLM` Run keys) จริงในเครื่อง

---

## 🧹 ระบบถอนการติดตั้งที่ถูกต้องตามมาตรฐาน Windows (Clean Uninstaller)

ไม่มีปุ่มถอนการติดตั้งภายในตัวแอปพลิเคชัน เพื่อความปลอดภัยตามมาตรฐานของระบบปฏิบัติการ โดยมีช่องทางการถอนการติดตั้งที่สะดวกและล้างไฟล์หมดจด 100%:

1. **ถอนการติดตั้งผ่าน Windows Settings / Control Panel:**
   - ไปที่ `Settings > Apps > Installed apps` (หรือค้นหา `Add or remove programs` ใน Windows) ค้นหา "System Storage & Port Inspector" แล้วคลิก `Uninstall`
   - มีปุ่มทางลัดในแท็บ "การตั้งค่า (Settings)" ของแอปพลิเคชัน เพื่อเปิดหน้าต่าง Add/Remove Programs ของ Windows ทันที
2. **ถอนการติดตั้งผ่าน `uninstall.bat`:**
   - อยู่ในโฟลเดอร์ติดตั้งของโปรแกรม `C:\Program Files\System Storage & Port Inspector\uninstall.bat` ดับเบิ้ลคลิกเพื่อเริ่มถอนการติดตั้ง
3. **ถอนการติดตั้งผ่าน Start Menu Shortcut:**
   - มีช็อตคัต **"Uninstall System Storage & Port Inspector"** ใน Start Menu folder กดแล้วเริ่มการถอนการติดตั้งทันที

### สิ่งที่ระบบทำการล้างแบบหมดจด:
- ❌ ยุติโปรเซสที่กำลังทำงานอยู่
- ❌ ลบไฟล์โปรแกรมทั้งหมดใน `C:\Program Files\System Storage & Port Inspector`
- ❌ ลบทางลัดบน Desktop และ Start Menu
- ❌ ล้างข้อมูลแคชใน `%APPDATA%\syspulse-system-inspector` และ `%LOCALAPPDATA%`
- ❌ ล้างคีย์ Registry ใน `HKCU\Software\SysPulse`

---

## 🛠️ คำสั่งสำหรับพัฒนาและสร้างตัวติดตั้งใหม่

```bash
# ทดสอบเปิดใช้งานแอป
npm start

# รัน Vite Dev Server
npm run dev

# บิลด์โค้ดและสร้างไฟล์ .msi ตัวติดตั้งส่งออกไปยัง PC-App
npm run msi
```
