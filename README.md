# Bible Portal

A comprehensive Bible study plugin for Obsidian with multi-version support, Strong's Concordance, cross-references, notes, highlights, and more.

## ✨ Features

### 📚 Bible Reading
- **Multiple Bible versions** with parallel viewing (side-by-side comparison)
- **Three reading modes:**
  - 📄 **Chapter Mode** - Read complete chapters with prev/next navigation
  - 📌 **Single Verse Mode** - Look up specific verses
  - 📖 **Passage Mode** - Read verse ranges (e.g., John 3:16-21)
- **Sticky navigation bar** - Floats with content for easy navigation
- **Verse of the Day** - Daily verse displayed on dashboard (clickable)

### 🔍 Deep Study Tools

#### Strong's Concordance
- **Hover over any word** to see:
  - Strong's number (Greek/Hebrew)
  - Original lemma and transliteration
  - Complete definition
  - Morphological information
  - Usage examples
- **1000-verse LRU cache** for <50ms response times
- **Performance statistics** available via command palette

#### Cross-References
- **31,102 verses** with cross-reference data
- **Visual indicators** showing verses with cross-references
- **Click navigation** to referenced verses
- **Copy all references** button in popup

#### Jesus' Words
- **937 verses** across 4 Gospels highlighted in red
- **Contextual information** on hover
- **Disputed passages** flagged with manuscript support levels

#### Theographic Metadata
- **People Index** - See all people mentioned in Scripture
- **Map View** - Geographic locations in biblical events
- **Timeline View** - Chronological events with filtering
- **Enhanced search** by location/person/period

### 📝 Notes & Highlights

#### Notes Management
- **Multi-level notes** - verse, passage, chapter, or book level
- **Note types** - study, sermon, personal, cross-reference, commentary
- **Tagging system** - YAML frontmatter tags
- **Cross-linking** - Standard Obsidian wikilinks (`[[Note Name]]`)
- **Notes browser** - Browse, search, and filter all notes
- **Refresh button** - Cleans up deleted note references

#### Highlighting System
- **Multi-color highlighting** - Word, phrase, or verse-range level
- **Custom colors** - Define your own highlight colors
- **Highlights browser** - Browse and filter all highlights
- **Persistent** - Highlights visible across all Bible versions

### 📋 Copy & Export
- **Copy to clipboard** - Right-click any verse
- **Copy to new note** - Creates Obsidian note with verse text
- **Export as image** - JPG export with customizable quality
- **Text embellishments** - Bold, italic, underline, fonts, colors
- **Version-aware** - Parallel view copies clicked version

---

## 🚀 Installation

### Prerequisites
- **Obsidian** (latest stable version)
- **Desktop or web** (mobile not optimized)

### Install Plugin

1. **Download the plugin:**
   - Go to Releases and download the latest `bible-portal.zip`
   - OR clone this repository

2. **Install in Obsidian:**
   ```
   .obsidian/plugins/bible-portal/
   ├── main.js
   ├── styles.css
   ├── manifest.json
   └── src/data/  (bundled study data)
   ```

3. **Enable the plugin:**
   - Open Obsidian Settings → Community Plugins
   - Enable "Bible Portal"

4. **Download Bible translations:**
   - Open plugin settings
   - Click "Download Bible Version"
   - Select version (ESV, NIV, KJV, etc.)
   - Bibles downloaded to `.obsidian/plugins/bible-portal/data/bibles/`

---

## 📖 Usage

### Opening Bible Portal

- **Command Palette:** `Ctrl/Cmd + P` → "Bible Portal: Open"
- **Ribbon Icon:** Click the 📖 icon in the left sidebar

### Reading Modes

#### Chapter Mode
1. Select **Chapter** view mode
2. Choose **Bible version** from dropdown
3. Select **book** and **chapter**
4. Use **Prev/Next** buttons to navigate
5. Optional: Enable **Parallel View** to compare versions

#### Single Verse Mode
1. Select **Single Verse** mode
2. Enter reference (e.g., `John 3:16`)
3. Click **Lookup**
4. Optional: Enable **Parallel View** for side-by-side comparison

#### Passage Mode
1. Select **Passage** mode
2. Enter range (e.g., `John 3:16-21`)
3. Click **Lookup**
4. Optional: Enable **Parallel View**

### Study Tools

#### Using Strong's Concordance
1. Open any chapter in Chapter Mode
2. **Hover over any word** to see Strong's tooltip
3. View definition, lemma, transliteration, and morphology
4. Click on Strong's number to see related words

#### Viewing Cross-References
1. Verses with cross-references show **🔗 icon**
2. Click the icon to view all cross-references
3. Click any reference to navigate to that verse
4. Use **📋 Copy All References** button to copy list

#### Creating Notes
1. **Right-click any verse**
2. Select **Create Note**
3. Choose note type (study, sermon, personal, etc.)
4. Note opens in split pane for editing
5. Add YAML tags:
   ```yaml
   ---
   tags:
     - study
     - jesus
     - salvation
   ---
   ```

#### Highlighting Verses
1. **Right-click any verse**
2. Select **Highlight**
3. Choose color from palette
4. Highlight persists across all Bible versions

#### Browsing Notes & Highlights
1. Click **📝 Notes** mode button
   - Search notes by text or book
   - Filter by note type
   - Click to open in split pane
   - Use **🔄 Refresh** to clean up deleted notes

2. Click **🎨 Highlights** mode button
   - Search highlights by text or book
   - Filter by color
   - Click to navigate to verse

### Theographic Features

#### People Index
1. Click **👥 People Index** mode
2. Browse all people mentioned in Scripture
3. Search by name
4. Click person to see all verses mentioning them

#### Map View
1. Click **🗺️ Map** mode
2. View biblical locations
3. Filter by region or period
4. Click location for detailed info

#### Timeline View
1. Click **📅 Timeline** mode
2. Browse events chronologically
3. Filter by time period
4. Click event for verse references

---

## ⚙️ Settings

### Bible Settings
- **Default Version** - Default Bible translation
- **Parallel View** - Enable side-by-side comparison
- **Notes Folder** - Where Bible notes are stored

### Appearance
- **Font Size** - Adjust text size (default: 16px)
- **Banner Icon** - Customize dashboard banner
- **Highlight Gradient** - Use gradient style for highlights

### Highlight Colors
- **Add/Edit Colors** - Define custom highlight colors
- **Color Picker** - Choose any color
- **Named Colors** - Give colors meaningful names

### Performance
- **Show Performance Stats** - View Strong's cache statistics
- **Clear Caches** - Reset caches and statistics

---

## 🔧 Advanced Features

### Custom Bible Versions

If you have Bible data in markdown format, you can convert it:

1. **Open Command Palette** → "Bible Portal: Convert Bible"
2. Enter version code (e.g., "ESV")
3. Select source folder (markdown Bible files)
4. Plugin converts to JSON format
5. Converted Bible appears in version selector

### Verse of the Day Mapping

Generate custom VOTD mapping:

1. **Open Settings** → Verse of the Day
2. Click **Regenerate Mapping**
3. Confirm to create new 365-day mapping
4. Mapping stored in plugin data

---

## 📊 Data Attribution

This plugin bundles data from several open-source projects:

- **Strong's Concordance** - Public domain
- **Cross-References** - [bible-cross-reference-json](https://github.com/josephilipraja/bible-cross-reference-json) (GPL-2.0)
- **Theographic Metadata** - [theographic-bible-metadata](https://github.com/robertrouse/theographic-bible-metadata) (CC BY-SA 4.0)
- **Jesus Words Dataset** - Custom compilation (937 verses across 4 Gospels)

### Attribution Requirements

If you distribute this plugin or derivative works, you must:
- Maintain GPL-2.0 license for cross-reference data
- Maintain CC BY-SA 4.0 attribution for Theographic data
- Include this README with data sources

---

## 🐛 Troubleshooting

### Plugin won't load
- Check Obsidian console (Ctrl/Cmd + Shift + I)
- Verify all files are in `.obsidian/plugins/bible-portal/`
- Restart Obsidian

### Strong's not showing
- Hover over words in **Chapter Mode** (not Verse/Passage modes initially)
- Check console for "Interlinear data not found" errors
- Verify `src/data/interlinear/` folder exists with 66 Bible book files

### Bible version not available
- Download version via Settings → "Download Bible Version"
- OR convert markdown Bible via Command Palette → "Convert Bible"

### Highlights not showing
- Highlights persist in plugin data (`.obsidian/plugins/bible-portal/data/`)
- Check Settings → "Show Data Folder"

### Notes not appearing in browser
- Notes stored in folder defined in Settings → "Notes Folder"
- Use **🔄 Refresh** button in Notes Browser to clean up deleted notes
- Check YAML frontmatter for proper format

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

### Development Setup
```bash
git clone https://github.com/pctech777/bible-portal.git
cd bible-portal
npm install
npm run build
```

---

## 📄 License

This plugin is released under MIT License.

**Bundled Data Licenses:**
- Cross-references: GPL-2.0
- Theographic metadata: CC BY-SA 4.0
- Strong's Concordance: Public domain

---

## 🙏 Acknowledgments

- **Obsidian** - For the amazing note-taking platform
- **josephilipraja** - For the cross-reference JSON data
- **robertrouse** - For Theographic Bible metadata
- **Strong's Concordance** - For word-level lexical data
- **Bible translation organizations** - For making Scripture accessible

---

## Support

- **Issues:** [GitHub Issues](https://github.com/pctech777/bible-portal/issues)
- **Discussions:** [GitHub Discussions](https://github.com/pctech777/bible-portal/discussions)

---

Made for Bible study in Obsidian
