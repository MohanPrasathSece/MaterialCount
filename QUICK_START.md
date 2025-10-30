# Quick Start Guide

## 1. Environment Setup

Create a `.env` file in the root directory with:

```env
MONGODB_URI="mongodb+srv://mohanprasath563_db_user:0110@cluster0.p6t72mc.mongodb.net/?appName=Cluster0"
```

## 2. Install Dependencies & Start

```bash
npm install
npm run dev
```

## 3. Access the Application

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

The database will be automatically seeded with sample data on first visit.

---

## New Features Overview

### 📦 Stock Page Features

1. **Quick Adjustments:**
   - Click ➕ to increase quantity by 1
   - Click ➖ to decrease quantity by 1
   - Changes are instant and recorded in history

2. **Low Stock Alerts:**
   - Materials with quantity ≤ 10 show ⚠️ warning icon
   - Highlighted in red for easy identification

### 👥 Client Material Page Features

1. **Editable Quantities:**
   - Both "Out Qty" and "In Qty" can be edited
   - Use number inputs or arrow keys to adjust

2. **Stock Validation:**
   - Real-time check for available stock
   - Warning appears if trying to dispatch more than available
   - Server prevents saving invalid quantities

3. **Visual Alerts:**
   - Low stock materials show warning icon
   - Insufficient stock rows highlighted in red
   - Clear error messages displayed

### 🧭 Navigation

- Active page is highlighted in the sidebar
- Works for all main pages and sub-routes

---

## Admin Access

Add `/admin` to any URL to enable admin features:
- Example: `http://localhost:3000/stock/admin`
- Admin features include: Add/Delete materials, Adjust quantities, Pricing editor

---

## Key Differences from Firebase Version

1. **Data Updates:** Polls every 5 seconds instead of real-time
2. **Stock Management:** New increase/decrease buttons for quick adjustments
3. **Validation:** Enhanced stock availability checking
4. **Alerts:** Visual warnings for low stock and insufficient quantities

---

## Troubleshooting

**Database not connecting?**
- Check `.env` file exists and has correct MongoDB URI
- Verify MongoDB Atlas allows your IP address
- Restart the dev server after adding `.env`

**Data not updating?**
- Wait up to 5 seconds for polling to refresh
- Check browser console for errors
- Verify MongoDB connection in server logs

**Low stock alerts not showing?**
- Threshold is set to 10 units
- Check material quantity is ≤ 10
- Refresh the page to ensure latest data

---

## Support

For detailed migration information, see `MIGRATION_SUMMARY.md`
