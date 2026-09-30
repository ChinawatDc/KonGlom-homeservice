# 🌿 Git Branching Strategy & Contribution Guidelines

ยินดีต้อนรับสู่โปรเจกต์ **KonGlom-homeservice** เพื่อความปลอดภัยและเป็นระเบียบของ Codebase โครงการนี้มีกฎระเบียบการใช้งาน Git ดังนี้:

---

## 🚫 1. กฎเหล็ก: ห้าม Commit / Push ตรงสู่ `main`

สาขา `main` เป็นสาขา Production ที่ใช้ Deploy สู่ผู้ใช้งานจริง:
- **ห้ามทำการ Commit หรือ Push โดยตรงบน `main` โดยเด็ดขาด** (มี Pre-commit hook คอยตรวจจับและบล็อกอัตโนมัติ)
- การนำ Code เข้า `main` ต้องทำผ่าน Pull Request (PR) จาก `develop` หรือ `release/*` เท่านั้น
- ทุกการ Release ขึ้น `main` ต้องมีการติด Git Tag เสมอ (เช่น `v1.0.0`)

---

## 🌳 2. แผนผังสาขา (Branch Structure)

```text
main (Production / Protected)
  └── v0.1.0, v1.0.0 (Tags)
       ▲
       │  (Pull Request / Merge)
develop (Staging & Integration)
  ├── feature/phase-1-mvp-slip-scanner
  ├── feature/phase-2-liff-dashboard
  ├── feature/phase-3-smart-calendar-reminders
  ├── feature/phase-4-elder-care-health
  └── feature/phase-5-fridge-home-maintenance
```

---

## 🛠 3. รูปแบบการตั้งชื่อ Branch

- **Feature ใหม่:** `feature/<phase-number>-<short-description>`  
  *ตัวอย่าง:* `feature/phase-1-slip-ocr`, `feature/phase-2-liff-charts`
- **แก้ไขบั๊ก:** `fix/<issue-name>`  
  *ตัวอย่าง:* `fix/gemini-timeout-error`
- **งานเอกสาร:** `docs/<topic>`  
  *ตัวอย่าง:* `docs/setup-google-drive`

---

## 🏷 4. การจัดการ Version (Semantic Versioning & Git Tags)

รูปแบบเวอร์ชัน: `vMAJOR.MINOR.PATCH`
- `v0.1.0`: Initial Project Setup & Architecture
- `v1.0.0`: Phase 1 MVP Release (Smart Slip OCR + Google Drive Vault)
- `v1.1.0`: Phase 2 Release (LIFF Dashboard & Fund Settlement)
- `v1.2.0`: Phase 3 Release (Smart Calendar & Voice Reminders)
- `v1.3.0`: Phase 4 Release (Elder Care & Health Vault)
- `v2.0.0`: Phase 5 Release (Complete Home Maintenance & Pantry)

### คำสั่งสร้างและส่ง Tag
```bash
git tag -a v1.0.0 -m "Release v1.0.0: Phase 1 MVP"
git push origin v1.0.0
```

---

## 💻 5. ขั้นตอนการเริ่มทำงานใหม่ (Workflow)

```bash
# 1. สลับมาที่ develop และดึงโค้ดล่าสุด
git checkout develop
git pull origin develop

# 2. แตกสาขาใหม่ตามงานที่ทำ
git checkout -b feature/phase-1-slip-ocr

# 3. พัฒนาและ Commit
git add .
git commit -m "feat(ocr): add Gemini 1.5 Flash parser"

# 4. Push ขึ้น GitHub
git push -u origin feature/phase-1-slip-ocr
```

---

## 🛡 6. กฎ Quality Gate: Test & Build ต้องผ่าน 100% ก่อน Merge เข้า `main`

เพื่อรักษาเสถียรภาพของระบบบน Production โครงการนี้บังคับใช้กฎ **ห้ามนำโค้ดที่ Build ไม่ผ่าน หรือ Test ไม่ผ่าน เข้าสู่ `main` โดยเด็ดขาด**:

### 1. การตรวจสอบอัตโนมัติในเครื่อง (Local Pre-Push Hook)
มี Git hook อยู่ที่ `.githooks/pre-push` ซึ่งจะดักจับทุกครั้งที่มีการ Push สู่ `main`:
- สั่งรัน `npm run check` อัตโนมัติ (`typecheck` + `test` + `build`)
- หากขั้นตอนใดขั้นตอนหนึ่งมี Error การ Push จะถูกยกเลิกทันที

### 2. การตรวจสอบบนคลาวด์ (GitHub Actions CI)
มี Workflow อยู่ที่ `.github/workflows/ci.yml` ทำงานบนทุก Pull Request ที่มุ่งสู่ `main`:
- ตรวจสอบ Type ด้วย `npm run typecheck`
- รัน Automated Unit Tests ด้วย `npm test` (Vitest)
- รัน Production Build ด้วย `npm run build`

### 3. การตั้งค่า Branch Protection บน GitHub (แนะนำ)
1. ไปที่ GitHub Repository -> **Settings** -> **Branches**
2. กด **Add branch ruleset** หรือ **Add rule**
3. Branch name pattern: `main`
4. ติ๊กเลือก:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging** -> ค้นหาและเลือก `Typecheck, Test & Build Gate`
   - ✅ **Do not allow bypassing the above settings**

