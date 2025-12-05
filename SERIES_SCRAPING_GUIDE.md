# 🎬 TV Series Episode Scraping - Complete Guide

## Quick Start

1. Go to **Admin Dashboard** → **TV Series Links**
2. Search for a series (e.g., "Breaking Bad")
3. Click **Select** to choose it
4. Click the series card to open details
5. Click **🎬 Scrape Episodes** button
6. Choose your mode and episodes
7. Click **Start Scraping**

That's it! Links appear automatically.

---

## Feature Overview

### Two Scraping Modes

| Mode | Use Case | Example |
|------|----------|---------|
| **Full Season** | Get all episodes of a season | "Give me all of Season 1" |
| **Manual Select** | Pick specific episodes | "Just episodes 1,2,3,5" |

### Smart Features

✅ **Accurate Metadata**: Season & Episode preserved exactly
✅ **No Duplicates**: Same episode won't be added twice  
✅ **Only Nkiri**: No low-quality NewToxic links
✅ **Single Link Per Episode**: Best link selected automatically
✅ **Live Updates**: UI refreshes with new links instantly

---

## Step-by-Step Instructions

### Mode 1: Full Season Scraping

**When to use**: You want all episodes of a season

**Steps**:
1. Open series details modal (click series card)
2. Click **🎬 Scrape Episodes** button
3. Select **🎬 Full Season** mode
4. Enter Season number (e.g., `1` for Season 1)
5. Click **Start Scraping**

**What happens**:
- Episodes 1-20 are searched on Nkiri
- Only episodes with found links are added
- Takes ~20-40 seconds depending on Nkiri response
- Message shows total links found

**Example**: Scraping Breaking Bad Season 1
```
Scrape Episodes → Full Season → Season: 1 → Start
Result: S1E1-S1E13 (or however many have links)
```

### Mode 2: Manual Episode Selection

**When to use**: You want specific episodes

**Steps**:
1. Open series details modal (click series card)
2. Click **🎬 Scrape Episodes** button
3. Select **✋ Manual Select** mode
4. Enter Season number (e.g., `3`)
5. Enter episodes using one of these formats:
   - **Individual**: `1,2,3,5` (episodes 1, 2, 3, 5)
   - **Range**: `1-5` (episodes 1 through 5)
   - **Mixed**: `1-3,5,7-9` (episodes 1, 2, 3, 5, 7, 8, 9)
6. Click **Start Scraping**

**Episode Format Guide**:
```
Format              Result
------              ------
1,2,3,5            Scrapes episodes 1, 2, 3, 5 only
1-5                Scrapes episodes 1, 2, 3, 4, 5
1-3,5-7            Scrapes episodes 1, 2, 3, 5, 6, 7
10                 Scrapes only episode 10
```

**Example**: The Office Season 5, specific episodes
```
Scrape Episodes → Manual Select → Season: 5 → Episodes: 1-3,10
Result: S5E1, S5E2, S5E3, S5E10 are added
```

---

## FAQ

### Q: What happens if an episode has no links?
**A**: It's skipped automatically. Only episodes with found Nkiri links are added.

### Q: Can I scrape multiple seasons?
**A**: Not in one operation. Scrape Season 1, then Season 2, etc. Each season is independent.

### Q: Will it overwrite existing episodes?
**A**: No. If an episode already exists, it's skipped due to duplicate prevention.

### Q: How long does scraping take?
**A**: 
- Full Season: ~1-2 minutes (20 episodes × 3-6 sec each)
- Manual (5 episodes): ~15-30 seconds

### Q: What's the "Nkiri only" about?
**A**: Only quality Nkiri links are used. Low-quality NewToxic links are automatically excluded.

### Q: Can I pause mid-scrape?
**A**: Not currently. Each operation runs to completion. Refresh the page to cancel.

### Q: Where do the links go?
**A**: They appear in the series details modal immediately after scraping. Click the series card to see them.

### Q: What if Nkiri is down?
**A**: Scraping will return 0 links for affected episodes. Try again later when Nkiri is online.

---

## What Gets Stored

For each scraped episode:

```
Season/Episode:     S1E5 (exactly as specified)
Series:             Breaking Bad
Link:               https://nkiri.com/... (Nkiri only)
Source:             nkiri (never newtoxic)
Resolution:         Default (unless multiple URLs)
Added:              Auto timestamp
```

**Key Promise**: Season and Episode numbers are ALWAYS accurate. Never mixed up.

---

## Workflow Examples

### Example 1: Build a Complete Series
```
Goal: Add entire Breaking Bad series

Step 1: Search → "Breaking Bad" → Select
Step 2: Click card → "Scrape Episodes"
Step 3: Full Season → Season: 1 → Start
Step 4: Wait for "✓ Scraping complete: Found X links"
Step 5: Repeat steps 2-4 for Season 2, 3, 4, 5
Result: All seasons with proper S#E# metadata
```

### Example 2: Add Specific Episodes
```
Goal: Add episodes 1-5 and 10 of The Office Season 7

Step 1: Search → "The Office" → Select  
Step 2: Click card → "Scrape Episodes"
Step 3: Manual Select → Season: 7 → Episodes: 1-5,10
Step 4: Start → Wait for complete message
Step 5: 6 episodes now appear in modal (S7E1-S7E5, S7E10)
```

### Example 3: Update Missing Episodes
```
Goal: Series has Season 1-3, need to add Season 2 Episode 5

Step 1: Series modal is already open
Step 2: Click "Scrape Episodes"
Step 3: Manual Select → Season: 2 → Episodes: 5
Step 4: Start → S2E5 is added
Step 5: Existing S2E1-S2E4 remain unchanged
```

---

## Technical Details

### API Endpoint
```
POST /api/scraper/episode
Body: {
  tvId: number,           // TMDB TV ID
  seriesTitle: string,    // Series name
  season: number,         // Season to scrape
  episode: number         // Episode to scrape
}
Returns: {
  success: boolean,
  count: number,          // Links found for this episode
  message: string
}
```

### Database Table: `series_links`
```
tv_id           → Series ID from TMDB
season_number   → Exact season (1, 2, 3...)
episode_number  → Exact episode (1, 2, 3...)
series_title    → Series name
title           → Episode title or resolution
url             → Download link
source          → "nkiri" (only source now)
poster          → Series poster image
created_at      → When it was added
```

### Polling Mechanism
After scraping completes:
1. UI checks database for newly inserted rows every 1 second
2. Maximum 8 checks (8 second total wait)
3. As soon as rows appear, series modal refreshes
4. User sees new links immediately

---

## Troubleshooting

### Links not appearing after scraping

**Check 1**: Nkiri availability
- Nkiri may be temporarily down
- Try scraping a popular series like "Breaking Bad"
- If still no results, Nkiri is likely offline

**Check 2**: Series existence  
- Some obscure series may not be on Nkiri
- Try a major production first
- Then try your target series

**Check 3**: Manual refresh
- Close and reopen the series modal
- Browser cache may not be updated
- Press F5 to hard refresh the page

### Wrong season/episode numbers
- This shouldn't happen
- If it does, delete the link and re-scrape
- Report the issue if it persists

### Scraping never finishes
- Browser may have hit timeout
- Refresh and try again
- Start with fewer episodes (e.g., 1-3 instead of full season)

---

## Pro Tips

💡 **Tip 1**: Start with Full Season mode for popular series
💡 **Tip 2**: Use ranges for efficiency: `1-10` instead of `1,2,3,4,5,6,7,8,9,10`
💡 **Tip 3**: Check existing links before re-scraping to avoid waste
💡 **Tip 4**: Scrape during off-peak hours for faster Nkiri response
💡 **Tip 5**: Popular series (Breaking Bad, Office) scrape fastest

---

## Performance Notes

| Action | Time |
|--------|------|
| Search TMDB | ~1 sec |
| Open series modal | ~2 sec |
| Scrape 1 episode | ~3-6 sec |
| Scrape full season (20 ep) | ~60-120 sec |
| UI refresh after scrape | ~1-3 sec |

---

## Summary

✅ **Easy**: Click series → Click "Scrape Episodes" → Choose mode → Done
✅ **Accurate**: Season/Episode always preserved correctly
✅ **Flexible**: Full season or pick exact episodes
✅ **Reliable**: Duplicate prevention, error handling included
✅ **Fast**: Live updates, no page refresh needed

Enjoy scraping! 🎉
