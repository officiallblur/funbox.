# TV Series Episode Scraping Feature

## Overview

The TV Series scraping feature allows admins to efficiently scrape download links for TV episodes with two modes:
- **Full Season Mode**: Scrapes all episodes (1-20) of a selected season
- **Manual Selection Mode**: Scrape specific episodes or ranges (e.g., 1,2,5 or 1-3)

## How to Use

### 1. Access the Feature

Navigate to the **TV Series Links** section in the Admin Dashboard.

### 2. Select a Series

- Use the "Search series (TMDB)" input to find a TV series
- Click "Select" to choose the series
- Series cards appear in the list below

### 3. Open Series Details

- Click on a series card to open the **Series Details Modal**
- This modal shows all existing links for that series
- A new **"🎬 Scrape Episodes"** button is available in the header

### 4. Launch the Scraper

Click the **"🎬 Scrape Episodes"** button to open the Episode Scraper Modal.

### 5. Choose Scraping Mode

#### **Full Season Mode**
- Select the "🎬 Full Season" option
- Enter the Season number (e.g., 1, 2, 3)
- Click "Start Scraping"
- The system will scrape episodes 1-20 of that season
- Each episode is searched individually on Nkiri
- Only episodes with found links are inserted

#### **Manual Selection Mode**
- Select the "✋ Manual Select" option
- Enter the Season number (e.g., 1)
- Enter episodes as:
  - **Individual**: `1,2,3,5` (scrapes episodes 1, 2, 3, and 5)
  - **Ranges**: `1-5` (scrapes episodes 1 through 5)
  - **Mixed**: `1-3,5,7-9` (scrapes 1, 2, 3, 5, 7, 8, 9)
- Click "Start Scraping"

### 6. Monitor Progress

- The button shows "Scraping..." while operation is in progress
- A success message appears when complete
- The modal closes automatically after scraping finishes
- The series details modal refreshes to show newly added episodes

## Database Schema

Links are stored with exact season and episode information:

```javascript
{
  id: string,                 // Unique identifier
  tv_id: number,              // TMDB TV ID
  season_number: number,      // Season (e.g., 1)
  episode_number: number,     // Episode (e.g., 5)
  series_title: string,       // Series name
  title: string,              // Episode title or resolution
  url: string,                // Download link
  poster: string,             // Series poster URL (optional)
  source: string,             // Link source (e.g., 'nkiri')
  created_at: timestamp       // Insert time
}
```

## Accuracy Features

✅ **Season/Episode Preservation**
- Each scraped link is stored with exact season and episode number
- Links appear correctly grouped under their season/episode in the UI
- No cross-contamination between seasons or episodes

✅ **Duplicate Prevention**
- Existing links are checked before insertion
- No duplicate inserts for same tv_id + season + episode
- Only Nkiri links are inserted (NewToxic removed)

✅ **Single Link Policy**
- Only one link per episode is kept (Nkiri preferred)
- Older duplicates are automatically skipped

## Example Workflows

### Workflow 1: Scrape Entire Season
```
1. Search for "Breaking Bad"
2. Select the series
3. Click the series card to open modal
4. Click "Scrape Episodes"
5. Choose "Full Season"
6. Enter Season: 1
7. Click "Start Scraping"
→ Episodes 1-20 of Season 1 are searched and added
```

### Workflow 2: Scrape Specific Episodes
```
1. Search for "The Office"
2. Select the series
3. Click the series card to open modal
4. Click "Scrape Episodes"
5. Choose "Manual Select"
6. Enter Season: 3
7. Enter Episodes: 1-5,8,10
8. Click "Start Scraping"
→ Episodes 1,2,3,4,5,8,10 of Season 3 are searched and added
```

### Workflow 3: Update Existing Series
```
1. A series already has episodes from Season 1
2. Click the series card
3. Click "Scrape Episodes"
4. Enter Season: 2 (new season)
5. Enter Episodes: 1-3 (first 3 episodes)
6. Click "Start Scraping"
→ Season 2 episodes are added without affecting Season 1
```

## Technical Details

### Episode Scraping Flow
1. User selects mode and episodes in modal
2. For each episode:
   - API endpoint `/api/scraper/episode` is called
   - Server searches Nkiri for the episode
   - If found, link is inserted with exact season/episode numbers
   - Next episode is processed (non-blocking)
3. After all episodes complete:
   - UI polls database for newly inserted rows
   - Series details modal refreshes to show new links

### Filtering
- **Source**: Only Nkiri links (NewToxic removed)
- **Titles**: 'Unknown' titles are filtered out
- **Duplicates**: Same tv_id + season + episode skips insertion

## UI Consistency

✅ **No Layout Changes**
- All existing UI remains unchanged
- "Scrape Episodes" feature integrates seamlessly
- New modal appears only when scraping is initiated
- Series details modal still shows all functionality (select, delete, open links)

## Troubleshooting

**Q: Episodes not appearing after scraping?**
- Check that Nkiri has links available for that series/episode
- Verify tv_id matches the TMDB ID
- Check server logs for scraping errors

**Q: Wrong season/episode numbers in database?**
- Refresh the page and re-check
- Polling should have updated the display
- If issue persists, check the series_links table directly

**Q: Can't find series in TMDB?**
- Try searching with alternative titles
- Some series may use different names on TMDB
- Check TMDB directly if unsure: https://www.themoviedb.org/search/tv

## Future Enhancements

- [ ] Batch scrape multiple series simultaneously
- [ ] Scrape by season range (S1-S5)
- [ ] Resume interrupted scrapes
- [ ] Episode title auto-population from TMDB
- [ ] Quality filter (prefer 720p, 1080p, etc.)
