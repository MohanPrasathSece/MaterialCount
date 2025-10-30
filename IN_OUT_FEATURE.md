# In/Out Quantity Feature

## Overview
A simplified stock management system where:
- **In Quantity**: Adds materials to stock (e.g., new purchases, supplier deliveries)
- **Out Quantity**: Removes materials from stock (e.g., client dispatch, damaged goods)

## Features

### ✅ Direct Stock Adjustments
- **In (Add)**: Increases stock quantity
- **Out (Remove)**: Decreases stock quantity
- Real-time stock validation
- Optional reason/notes for each transaction

### ✅ Stock History Tracking
All In/Out transactions are recorded in the `stock_history` collection with:
- Material ID and name
- Transaction type (in/out)
- Quantity adjusted
- Previous and new stock levels
- Reason/notes
- Timestamp

### ✅ User-Friendly Interface
- **Modal Dialog**: Clean tabbed interface for In/Out operations
- **Visual Feedback**: 
  - Green preview for In (additions)
  - Orange preview for Out (removals)
  - Real-time calculation of new stock
- **Validation**:
  - Cannot remove more than available stock
  - Minimum quantity of 1
  - Clear error messages

## How to Use

### From Stock Page

1. **Navigate to Stock Page** (`/stock`)
2. **Locate Material** in the inventory table
3. **Click "In/Out" Button** in the In/Out column
4. **Choose Operation**:
   - **In Tab**: Add stock
   - **Out Tab**: Remove stock
5. **Enter Details**:
   - Quantity (required)
   - Reason (optional)
6. **Review Preview**: See the calculated new stock
7. **Submit**: Click "Add to Stock" or "Remove from Stock"

### Example Use Cases

#### Adding Stock (In)
```
Material: Solar Panel 100W
Current Stock: 50
Action: In +20
Reason: "New supplier delivery"
Result: New Stock = 70
```

#### Removing Stock (Out)
```
Material: Solar Panel 100W
Current Stock: 70
Action: Out -15
Reason: "Client dispatch - Project ABC"
Result: New Stock = 55
```

## Technical Implementation

### Server Action
**File**: `src/app/actions.ts`
**Function**: `stockAdjustmentAction()`

**Features**:
- Zod schema validation
- Stock availability checking
- Atomic database updates
- History recording
- Path revalidation

**Validation Rules**:
- Material must exist
- Quantity must be ≥ 1
- For Out: quantity cannot exceed current stock
- Type must be 'in' or 'out'

### UI Component
**File**: `src/components/materials/StockAdjustmentModal.tsx`

**Features**:
- Dialog modal with tabs
- Form state management with `useActionState`
- Real-time preview calculations
- Toast notifications
- Auto-close on success

### Database Schema

#### Stock History Entry
```typescript
{
  materialId: string,
  materialName: string,
  type: 'in' | 'out',
  quantity: number,
  previousStock: number,
  newStock: number,
  reason: string,
  date: Date
}
```

## Integration Points

### Material Inventory Table
- New "In/Out" column added
- Available on both desktop and mobile views
- Positioned between "Adjust" and "Actions" columns

### Stock History Component
The existing `StockHistory` component automatically displays:
- All In/Out transactions
- Chronological order (newest first)
- Material name, type, quantity, and reason

## Benefits

### 1. **Simplified Workflow**
- No complex client tracking
- Direct stock management
- Clear In/Out operations

### 2. **Better Tracking**
- Complete audit trail
- Reason for each adjustment
- Historical stock levels

### 3. **Validation & Safety**
- Cannot oversell stock
- Real-time availability checks
- Clear error messages

### 4. **User Experience**
- Intuitive tabbed interface
- Visual feedback
- Mobile-friendly

## Comparison with Previous System

| Feature | Previous (Client-Based) | New (Direct In/Out) |
|---------|------------------------|---------------------|
| **Complexity** | High (client tracking) | Low (direct adjustments) |
| **Use Case** | Client material dispatch | General stock management |
| **Stock Updates** | Indirect via client sheets | Direct stock adjustments |
| **History** | Client-specific | Material-specific |
| **Validation** | Complex baseline tracking | Simple stock checks |
| **UI** | Multi-step forms | Single modal dialog |

## API Reference

### Server Action: `stockAdjustmentAction`

**Input (FormData)**:
```typescript
{
  materialId: string,      // Required
  materialName: string,    // Required
  quantity: number,        // Required, min: 1
  type: 'in' | 'out',     // Required
  reason?: string          // Optional
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string,
  submissionId: number,
  errors?: Record<string, string[]>
}
```

**Success Messages**:
- In: "Added {quantity} units. New stock: {newStock}"
- Out: "Removed {quantity} units. New stock: {newStock}"

**Error Messages**:
- "Material not found."
- "Insufficient stock. Available: {current}, Requested: {quantity}"
- "Invalid data submitted."

## Future Enhancements

### Potential Additions
1. **Batch Operations**: Adjust multiple materials at once
2. **CSV Import**: Bulk stock updates from file
3. **Approval Workflow**: Require approval for large adjustments
4. **Stock Alerts**: Notifications when stock is added/removed
5. **Analytics**: Track In/Out patterns over time
6. **Serial Numbers**: Track individual item serial numbers
7. **Location Tracking**: Multiple warehouse support

## Troubleshooting

### Issue: "Insufficient stock" error
**Solution**: Check current stock level. Cannot remove more than available.

### Issue: Modal doesn't close after submission
**Solution**: Check browser console for errors. Ensure server action is working.

### Issue: Stock not updating in table
**Solution**: 
- Refresh the page
- Check that `useMaterials` hook is polling
- Verify `/api/materials` endpoint is working

### Issue: History not showing transactions
**Solution**: 
- Check `stock_history` collection in database
- Verify `StockHistory` component is rendering
- Check date filters if any

## Testing Checklist

- [ ] Add stock (In) - verify stock increases
- [ ] Remove stock (Out) - verify stock decreases
- [ ] Try to remove more than available - verify error
- [ ] Check stock history shows transaction
- [ ] Verify reason/notes are saved
- [ ] Test on mobile device
- [ ] Verify toast notifications appear
- [ ] Check that +/- buttons still work
- [ ] Verify low stock warnings still work
- [ ] Test with quantity = 0 (should fail validation)

## Summary

The new In/Out quantity feature provides a simple, direct way to manage stock levels with:
- ✅ Easy-to-use modal interface
- ✅ Real-time validation
- ✅ Complete history tracking
- ✅ Mobile-friendly design
- ✅ Clear visual feedback

This replaces the complex client-based tracking system with a straightforward stock management approach suitable for general inventory operations.
