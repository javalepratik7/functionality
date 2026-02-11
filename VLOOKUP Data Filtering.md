# VLOOKUP & Data Filtering Guide
## Swiggy Instamart Sales Data - Urban Gabru & Urban Yog

---

## Table of Contents
1. [Getting Last Day's Data (Recommended Method)](#getting-last-days-data)
2. [VLOOKUP Implementation](#vlookup-implementation)
3. [Additional Filters](#additional-filters)
4. [Troubleshooting](#troubleshooting)

---

## Getting Last Day's Data

### Method 1: Complete Range Check (Recommended)
This formula checks ALL rows until the last row and returns ONLY the most recent date's data for Urban Gabru and Urban Yog.

```excel
=LET(
    allData, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!A:Z,
    brands, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!E:E,
    dates, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!F:F,
    FILTER(allData, 
        ((brands="Urban Gabru") + (brands="Urban Yog")) * 
        (dates = MAX(dates)), 
        "No Data Found")
)
```

**Where to use:** Put this in cell A1 of a new sheet called "Filtered Data"

---

### Method 2: Specific Range (Faster, for Large Datasets)
If you know your recent data is in rows 350,000 to 450,000:

```excel
=LET(
    allData, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!A350000:Z450000,
    brands, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!E350000:E450000,
    dates, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!F350000:F450000,
    FILTER(allData, 
        ((brands="Urban Gabru") + (brands="Urban Yog")) * 
        (dates = MAX(dates)), 
        "No Data Found")
)
```

**Safe Range Guidelines:**
- ✅ Best: 50,000 - 100,000 rows
- ⚠️ Okay: 100,000 - 200,000 rows
- ❌ Risky: 250,000+ rows (may crash Excel Online)

---

### Method 3: Last N Rows (Alternative)
Get the last 200 entries regardless of date:

```excel
=LET(
    allData, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!A:Z,
    brands, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!E:E,
    filtered, FILTER(allData, (brands="Urban Gabru") + (brands="Urban Yog"), "No Data"),
    TAKE(filtered, -200)
)
```

**Note:** `-200` means "last 200 rows". Change to `-500` for last 500, etc.

---

## VLOOKUP Implementation

### Step 1: Create Helper Sheet
1. Create a new sheet called **"Filtered Data"**
2. Put the FILTER formula from Method 1 or 2 in cell A1
3. This creates your lookup table

### Step 2: Setup Destination Sheet
Your destination sheet should have a lookup key column (e.g., EAN or ITEM_CODE in column A)

### Step 3: VLOOKUP Formula

#### Example: Lookup by EAN (Column X in source)

**To get Ordered Date (Column F):**
```excel
=IFERROR(INDEX('Filtered Data'!$F:$F, MATCH($A2, 'Filtered Data'!$X:$X, 0)), "")
```

**To get UNITS_SOLD (Column U):**
```excel
=IFERROR(INDEX('Filtered Data'!$U:$U, MATCH($A2, 'Filtered Data'!$X:$X, 0)), "")
```

**To get GMV (Column V):**
```excel
=IFERROR(INDEX('Filtered Data'!$V:$V, MATCH($A2, 'Filtered Data'!$X:$X, 0)), "")
```

**To get PRODUCT_NAME (Column M):**
```excel
=IFERROR(INDEX('Filtered Data'!$M:$M, MATCH($A2, 'Filtered Data'!$X:$X, 0)), "")
```

---

### Why INDEX-MATCH instead of VLOOKUP?

VLOOKUP can only look to the RIGHT. Since many columns you want (like Ordered Date in column F) are to the LEFT of EAN (column X), we use INDEX-MATCH which can look in any direction.

**Traditional VLOOKUP (if lookup key is in first column):**
```excel
=IFERROR(VLOOKUP($A2, 'Filtered Data'!$A:$Z, column_number, FALSE), "")
```

---

## Column Reference Guide

Based on your data structure:

| Column | Letter | Description |
|--------|--------|-------------|
| S. No. | A | Serial Number |
| Month | B | Month |
| Week | C | Week |
| State | D | State |
| Brand | E | Brand Name |
| Ordered Date | F | Order Date |
| CITY | G | City |
| AREA_NAME | H | Area Name |
| STORE_ID | I | Store ID |
| L1_CATEGORY | J | L1 Category |
| L2_CATEGORY | K | L2 Category |
| L3_CATEGORY | L | L3 Category |
| PRODUCT_NAME | M | Product Name |
| VARIANT | N | Variant |
| ITEM_CODE | O | Item Code |
| COMBO | P | Combo |
| COMBO_ITEM_CODE | Q | Combo Item Code |
| COMBO_UNITS_SOLD | R | Combo Units Sold |
| BASE_MRP | S | Base MRP |
| UNITS_SOLD | T | Units Sold |
| GMV | U | GMV |
| TP Price (Incl GST) | V | TP Price |
| TP Value (Inc GST) | W | TP Value |
| Mapping | X | Mapping |
| EAN | Y | EAN |
| Suggested Selling Price | Z | Suggested Selling Price |

**Note:** Adjust column letters if your actual data has different ordering.

---

## Additional Filters

### Filter by State (e.g., only Maharashtra)
```excel
=LET(
    allData, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!A:Z,
    brands, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!E:E,
    states, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!D:D,
    dates, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!F:F,
    FILTER(allData, 
        ((brands="Urban Gabru") + (brands="Urban Yog")) * 
        (dates = MAX(dates)) * 
        (states = "Maharashtra"), 
        "No Data Found")
)
```

### Filter by Multiple Cities (Mumbai OR Delhi)
```excel
=LET(
    allData, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!A:Z,
    brands, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!E:E,
    cities, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!G:G,
    dates, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!F:F,
    FILTER(allData, 
        ((brands="Urban Gabru") + (brands="Urban Yog")) * 
        (dates = MAX(dates)) * 
        ((cities="Mumbai") + (cities="Delhi")), 
        "No Data Found")
)
```

### Filter by UNITS_SOLD > 5
```excel
=LET(
    allData, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!A:Z,
    brands, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!E:E,
    dates, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!F:F,
    units, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!T:T,
    FILTER(allData, 
        ((brands="Urban Gabru") + (brands="Urban Yog")) * 
        (dates = MAX(dates)) * 
        (units > 5), 
        "No Data Found")
)
```

### Filter by Specific Week (e.g., "Feb - W1")
```excel
=LET(
    allData, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!A:Z,
    brands, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!E:E,
    weeks, 'https://globalbees-my.sharepoint.com/personal/pratiksha_upadhyay_globalbees_com/Documents/Microsoft Teams Chat Files/[Swiggy Instamart Sales - Online (November Onwards).xlsx]Sales Dump'!C:C,
    FILTER(allData, 
        ((brands="Urban Gabru") + (brands="Urban Yog")) * 
        (weeks="Feb - W1"), 
        "No Data Found")
)
```

---

## Troubleshooting

### Error: #BUSY or Excel Crashes
**Problem:** Dataset too large for Excel Online

**Solutions:**
1. Use specific row ranges instead of entire columns (A350000:Z450000)
2. Open file in Excel Desktop App
3. Reduce range to 50,000-100,000 rows at a time

### Error: "No Data Found"
**Possible causes:**
1. ❌ Brand names have extra spaces → Use TRIM function
2. ❌ Date range doesn't include your data → Check MAX date
3. ❌ Row range too small → Increase range
4. ❌ Column references wrong → Verify column letters

**Debugging steps:**
```excel
# Check if brand filter works
=FILTER(allData, (brands="Urban Gabru") + (brands="Urban Yog"), "No Brand Data")

# Check maximum date in data
=MAX('Sales Dump'!F:F)

# Check if dates are numbers or text
=ISNUMBER('Sales Dump'!F2)

# List all unique weeks available
=UNIQUE(FILTER(weeks, (brands="Urban Gabru") + (brands="Urban Yog"), "No Data"))
```

### Error: #N/A in VLOOKUP/INDEX-MATCH
**Problem:** Lookup value not found in filtered data

**Solution:**
```excel
# Wrap in IFERROR to show blank instead of error
=IFERROR(INDEX('Filtered Data'!$F:$F, MATCH($A2, 'Filtered Data'!$X:$X, 0)), "")
```

### Dates Showing as Numbers (e.g., 46056)
**Problem:** Date formatting issue

**Solution:** Format the column as Date:
1. Select the column
2. Right-click → Format Cells
3. Choose "Date" category
4. Select desired date format

---

## Performance Optimization Tips

1. **Use Named Ranges:** Define names for frequently used ranges to make formulas shorter
2. **Limit Calculations:** Turn off automatic calculation (Formulas → Calculation Options → Manual) while building formulas
3. **Use Helper Columns:** Break complex formulas into multiple steps
4. **Cache Filtered Data:** Create the filtered dataset once in a helper sheet, then reference it multiple times
5. **Specific Ranges:** Always prefer `A2:Z1000` over `A:Z` when possible

---

## Quick Reference: Formula Syntax

### AND condition (all must be true)
```excel
(condition1) * (condition2) * (condition3)
```

### OR condition (any can be true)
```excel
(condition1) + (condition2) + (condition3)
```

### Combined AND/OR
```excel
((brandA) + (brandB)) * (date = maxDate) * (state = "Maharashtra")
```
This means: (Brand is A OR B) AND (date is max) AND (state is Maharashtra)

---

## Support

If formulas still don't work:
1. Verify column positions match your actual data
2. Check for trailing spaces in brand names
3. Confirm date column contains actual dates (not text)
4. Try opening in Excel Desktop instead of Excel Online
5. Reduce the row range to improve performance

---

**Last Updated:** February 6, 2026
**Data Source:** Swiggy Instamart Sales - Online (November Onwards)
